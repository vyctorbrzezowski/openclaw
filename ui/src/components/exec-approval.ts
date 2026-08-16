// Control UI non-modal approval queue, anchored beside the requesting session.
import { html, nothing, type PropertyValues } from "lit";
import { property, query, state } from "lit/decorators.js";
import { modalApprovalQueue } from "../app/approval-presentation.ts";
import type { ExecApprovalDecision, ExecApprovalRequest } from "../app/exec-approval.ts";
import { t } from "../i18n/index.ts";
import { resolveAsciiShortcutKey } from "../lib/keyboard-shortcuts.ts";
import { normalizeSessionKeyForUiComparison } from "../lib/sessions/session-key.ts";
import { OpenClawLightDomContentsElement } from "../lit/openclaw-element.ts";
import { renderExecApprovalCard, resolveApprovalDecisions } from "./exec-approval-card.ts";

type ExecApprovalProps = {
  queue: readonly ExecApprovalRequest[];
  busy: boolean;
  errors: ReadonlyMap<string, string>;
  nowMs: number;
  inlineApprovalId?: string | null;
  resolveSessionName?: (sessionKey: string) => string;
  onDecision: (approvalId: string, decision: ExecApprovalDecision) => void | Promise<void>;
};

function keyEventComesFromTextEntry(event: KeyboardEvent): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof Element &&
        target.closest("input, textarea, [contenteditable]:not([contenteditable='false'])") !==
          null,
    );
}

// Approval shortcuts only work while focus is inside the popover. The rest of
// the app stays interactive, so a composer shortcut must never answer a request.
function shortcutDecision(event: KeyboardEvent): ExecApprovalDecision | null {
  const hasModChord = (event.metaKey || event.ctrlKey) && !event.altKey;
  if (!hasModChord || keyEventComesFromTextEntry(event)) {
    return null;
  }
  if (event.key === "Enter") {
    return event.shiftKey ? "allow-always" : "allow-once";
  }
  return !event.shiftKey && resolveAsciiShortcutKey(event) === "d" ? "deny" : null;
}

class ExecApproval extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) props?: ExecApprovalProps;
  @query(".exec-approval-popover") private approvalPopover?: HTMLElement;
  @state() private selectedApprovalId: string | null = null;
  @state() private commandExpanded = false;
  @state() private forceShowAll = false;
  private positionFrame: number | null = null;

  private readonly schedulePosition = () => {
    if (this.positionFrame !== null) {
      cancelAnimationFrame(this.positionFrame);
    }
    this.positionFrame = requestAnimationFrame(() => {
      this.positionFrame = null;
      this.positionPopover();
    });
  };

  override connectedCallback(): void {
    super.connectedCallback();
    globalThis.addEventListener("resize", this.schedulePosition);
    document.addEventListener("scroll", this.schedulePosition, true);
  }

  override disconnectedCallback(): void {
    globalThis.removeEventListener("resize", this.schedulePosition);
    document.removeEventListener("scroll", this.schedulePosition, true);
    if (this.positionFrame !== null) {
      cancelAnimationFrame(this.positionFrame);
      this.positionFrame = null;
    }
    super.disconnectedCallback();
  }

  show(): void {
    this.forceShowAll = true;
    void this.updateComplete.then(() => {
      this.schedulePosition();
      this.approvalPopover?.focus({ preventScroll: true });
    });
  }

  showForSession(sessionKey: string): void {
    const normalizedSessionKey = normalizeSessionKeyForUiComparison(sessionKey);
    const active = this.displayedQueue().find(
      (entry) =>
        normalizeSessionKeyForUiComparison(entry.request.sessionKey) === normalizedSessionKey,
    );
    if (!active) {
      return;
    }
    this.selectedApprovalId = active.id;
    this.commandExpanded = false;
    void this.updateComplete.then(() => this.schedulePosition());
  }

  private displayedQueue(): readonly ExecApprovalRequest[] {
    const props = this.props;
    if (!props) {
      return [];
    }
    return this.forceShowAll
      ? props.queue
      : modalApprovalQueue(props.queue, props.inlineApprovalId);
  }

  private activeApproval(queue: readonly ExecApprovalRequest[]): ExecApprovalRequest | null {
    return (
      queue.find((entry) => entry.id === this.selectedApprovalId) ??
      queue.find((entry) => this.sessionRow(entry) !== null) ??
      queue.at(0) ??
      null
    );
  }

  private sessionRow(approval: ExecApprovalRequest): HTMLElement | null {
    const sessionKey = approval.request.sessionKey?.trim();
    return sessionKey
      ? (Array.from(document.querySelectorAll<HTMLElement>("[data-session-key]")).find(
          (row) => row.dataset.sessionKey === sessionKey,
        ) ?? null)
      : null;
  }

  private sessionDisplayName(active: ExecApprovalRequest): string {
    const sessionKey = active.request.sessionKey?.trim();
    return sessionKey
      ? (this.props?.resolveSessionName?.(sessionKey) ?? t("execApproval.unknownConversation"))
      : t("execApproval.unknownConversation");
  }

  private positionPopover(): void {
    const popover = this.approvalPopover;
    if (!popover) {
      return;
    }
    const shell = popover.closest(".shell");
    const mobile = shell?.classList.contains("shell--mobile-nav") === true;
    if (mobile) {
      popover.style.removeProperty("left");
      popover.style.removeProperty("top");
      return;
    }
    const active = this.activeApproval(this.displayedQueue());
    // Follow the sidebar's canonical row when it is rendered. Catalog-filtered
    // or offscreen sessions fall back to the nav edge so the prompt stays visible.
    const row = active ? this.sessionRow(active) : null;
    const nav = shell?.querySelector<HTMLElement>(".shell-nav");
    const anchor = row?.getBoundingClientRect() ?? nav?.getBoundingClientRect();
    const surface = popover.getBoundingClientRect();
    const left = Math.max(12, Math.min((anchor?.right ?? 0) + 12, innerWidth - surface.width - 12));
    const preferredTop = row ? row.getBoundingClientRect().top - 12 : 68;
    const top = Math.max(12, Math.min(preferredTop, innerHeight - surface.height - 12));
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
    const anchorCenter = anchor ? anchor.top + anchor.height / 2 : top + 24;
    const arrowY = Math.max(16, Math.min(anchorCenter - top, surface.height - 16));
    popover.style.setProperty("--exec-approval-anchor-y", `${Math.round(arrowY)}px`);
  }

  private handleKeydown(event: KeyboardEvent, active: ExecApprovalRequest): void {
    // A held chord auto-repeats: once a decision settles and the queue
    // advances, the repeat would apply the same decision to the next request.
    if (event.defaultPrevented || event.repeat || this.props?.busy) {
      return;
    }
    const decision = shortcutDecision(event);
    if (!decision || !resolveApprovalDecisions(active).includes(decision)) {
      return;
    }
    event.preventDefault();
    void this.props?.onDecision(active.id, decision);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    const previousProps = changedProperties.get("props") as ExecApprovalProps | undefined;
    if (previousProps?.queue.length && !this.props?.queue.length) {
      this.forceShowAll = false;
      this.selectedApprovalId = null;
      this.commandExpanded = false;
      return;
    }
    // Pin the presented request: late-arriving older approvals re-sort the
    // queue, and swapping the card mid-read could answer a request never read.
    const displayedQueue = this.displayedQueue();
    if (!displayedQueue.some((entry) => entry.id === this.selectedApprovalId)) {
      this.selectedApprovalId =
        displayedQueue.find((entry) => this.sessionRow(entry) !== null)?.id ??
        displayedQueue.at(0)?.id ??
        null;
      this.commandExpanded = false;
    }
  }

  protected override updated(): void {
    this.schedulePosition();
  }

  override render() {
    const props = this.props;
    const queue = this.displayedQueue();
    const active = this.activeApproval(queue);
    if (!props || !active) {
      return nothing;
    }
    return html`
      <section
        class="exec-approval-popover"
        role="region"
        aria-label=${t("execApproval.approvalPopover")}
        tabindex="-1"
        data-anchor-session=${active.request.sessionKey ?? ""}
        @keydown=${(event: KeyboardEvent) => this.handleKeydown(event, active)}
      >
        ${renderExecApprovalCard({
          approval: active,
          busy: props.busy,
          error: props.errors.get(active.id) ?? null,
          nowMs: props.nowMs,
          variant: "popover",
          sessionDisplayName: this.sessionDisplayName(active),
          commandExpanded: this.commandExpanded,
          onToggleCommand: () => {
            this.commandExpanded = !this.commandExpanded;
          },
          onDecision: props.onDecision,
        })}
      </section>
    `;
  }
}

if (!customElements.get("openclaw-exec-approval")) {
  customElements.define("openclaw-exec-approval", ExecApproval);
}
