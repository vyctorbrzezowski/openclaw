import { html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { icons } from "../components/icons.ts";
import { t } from "../i18n/index.ts";
import { OpenClawLightDomContentsElement } from "../lit/openclaw-element.ts";

type ToastDismissReason = "action" | "dismiss" | "disconnected" | "replaced" | "timeout";

/** Same four severities the inline callout speaks; see the alert grammar block
 * in components.css. Omitting the tone keeps the neutral popover chrome, which
 * is right for an outcome that is neither good news nor a problem. */
export type ToastTone = "danger" | "info" | "success" | "warn";

const TONE_ICONS: Readonly<Record<ToastTone, TemplateResult>> = {
  danger: icons.alertCircle,
  info: icons.infoCircle,
  success: icons.checkCircle,
  warn: icons.alertTriangle,
};

export type ToastOptions = {
  /** A template lets a message name a destination the operator can actually open,
   * instead of spelling out a settings path the toast then makes them find. */
  message: string | TemplateResult;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: (reason: ToastDismissReason) => void;
  durationMs?: number;
};

const DEFAULT_TOAST_DURATION_MS = 6_000;

/** The front card plus up to three peeking edges stay visible while collapsed. */
const COLLAPSED_VISIBLE = 4;

/** Hard ceiling on concurrent toasts. A burst larger than this is a runaway
 * caller, not an operator reading rate; the oldest is retired so the stack
 * cannot grow without bound. */
const MAX_STACKED_TOASTS = 5;

/** Peeking edge per depth step, and the gap between cards once expanded. */
const COLLAPSED_STEP_PX = 10;
const EXPANDED_GAP_PX = 10;

type ToastEntry = {
  id: number;
  options: ToastOptions;
  timer: ReturnType<typeof globalThis.setTimeout> | null;
  /** Time left on this toast's own clock. Held while the stack is paused so a
   * resume continues the countdown instead of restarting it. */
  remainingMs: number;
  resumedAt: number;
};

let nextToastId = 1;

function activeModalToastLayer() {
  return [...(document.openClawModalToastLayers ?? [])].findLast(
    (candidate) => candidate.isConnected,
  );
}

// Outcomes reported during startup (a restored post-update result, for example)
// race the shell that owns the host element. Hold them instead of dropping
// them, so no caller's message disappears because it arrived too early.
const queuedToasts: ToastOptions[] = [];

class OpenClawToastHost extends OpenClawLightDomContentsElement {
  /** Newest first: index 0 is the front card, which is also the reading order a
   * screen reader gets and the order the depth transforms below assume. */
  @state() private entries: ToastEntry[] = [];
  @state() private expanded = false;
  /** The expanded list has gaps between cards, and crossing one briefly points
   * at the page behind. A short grace period keeps that from reading as
   * "pointer left" and collapsing the stack under the operator's cursor. */
  private collapseTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  /** Keep the hit region at its largest expanded size while cards are removed;
   * the pointer must leave for real before the region is allowed to shrink. */
  private expandedRegionHeight = 0;

  override connectedCallback() {
    super.connectedCallback();
    const pending = queuedToasts.splice(0);
    for (const options of pending) {
      this.show(options);
    }
  }

  override disconnectedCallback() {
    const target = activeModalToastLayer() ?? document.querySelector(".shell");
    if (!this.isConnected && this.parentElement?.localName === "openclaw-modal-dialog" && target) {
      target.append(this);
    } else {
      this.dismissAll("disconnected");
    }
    super.disconnectedCallback();
  }

  /** Keep the active outcomes intact while moveBefore() crosses top-layer owners. */
  connectedMoveCallback() {}

  show(options: ToastOptions) {
    const entry: ToastEntry = {
      id: nextToastId++,
      options,
      timer: null,
      remainingMs: options.durationMs ?? DEFAULT_TOAST_DURATION_MS,
      resumedAt: 0,
    };
    // A burst wider than the ceiling retires its own oldest card rather than
    // letting the stack grow past what the corner can show. Entries are newest
    // first, so the tail past the ceiling is the oldest — never the arrival.
    const stacked = [entry, ...this.entries];
    const overflow = stacked.slice(MAX_STACKED_TOASTS);
    this.entries = stacked.slice(0, MAX_STACKED_TOASTS);
    for (const retired of overflow) {
      this.clearTimer(retired);
      retired.options.onDismiss?.("replaced");
    }
    if (!this.expanded) {
      this.startTimer(entry);
    }
  }

  private startTimer(entry: ToastEntry) {
    this.clearTimer(entry);
    entry.resumedAt = Date.now();
    entry.timer = globalThis.setTimeout(() => this.dismiss(entry, "timeout"), entry.remainingMs);
  }

  private clearTimer(entry: ToastEntry) {
    if (entry.timer !== null) {
      globalThis.clearTimeout(entry.timer);
      entry.timer = null;
    }
  }

  /** The wrapper owns a stable hit region, so moving between cards or removing
   * the card under the pointer does not look like leaving the stack. */
  private holdExpanded() {
    if (this.collapseTimer !== null) {
      globalThis.clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    this.setExpanded(true);
  }

  private releaseExpanded(next: EventTarget | null) {
    if (next instanceof Node && this.contains(next)) {
      return;
    }
    if (this.collapseTimer !== null) {
      globalThis.clearTimeout(this.collapseTimer);
    }
    this.collapseTimer = globalThis.setTimeout(() => {
      this.collapseTimer = null;
      this.setExpanded(false);
    }, 140);
  }

  /** Hover and keyboard focus both mean "I am reading this", so both hold every
   * card's clock. Each toast keeps its own remaining time rather than a shared
   * one: cards arrive at different moments and must leave at their own. */
  private setExpanded(expanded: boolean) {
    if (this.expanded === expanded) {
      return;
    }
    this.expanded = expanded;
    for (const entry of this.entries) {
      if (expanded) {
        entry.remainingMs = Math.max(0, entry.remainingMs - (Date.now() - entry.resumedAt));
        this.clearTimer(entry);
      } else {
        this.startTimer(entry);
      }
    }
  }

  private dismiss(entry: ToastEntry, reason: ToastDismissReason) {
    this.clearTimer(entry);
    if (!this.entries.includes(entry)) {
      return;
    }
    this.entries = this.entries.filter((candidate) => candidate !== entry);
    entry.options.onDismiss?.(reason);
    if (this.entries.length === 0) {
      this.expanded = false;
    }
  }

  private dismissAll(reason: ToastDismissReason) {
    const dismissed = this.entries;
    this.entries = [];
    this.expanded = false;
    if (this.collapseTimer !== null) {
      globalThis.clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    for (const entry of dismissed) {
      this.clearTimer(entry);
      entry.options.onDismiss?.(reason);
    }
  }

  override updated() {
    this.layoutStack();
  }

  /** Expanded cards need real offsets, and a card's height is only known once it
   * is in the document, so the shift is measured rather than assumed. The
   * direction is read off the anchored edge instead of a breakpoint: a
   * bottom-anchored corner stacks upward, a top-anchored one downward, so this
   * stays correct whatever the responsive placement rules decide. */
  private layoutStack() {
    const cards = [...this.querySelectorAll<HTMLElement>(".app-toast")];
    if (cards.length === 0) {
      return;
    }
    const first = cards[0];
    if (!first) {
      return;
    }
    const direction = globalThis.getComputedStyle(first).top === "auto" ? -1 : 1;
    let offset = 0;
    cards.forEach((card, depth) => {
      card.style.setProperty("--app-toast-depth", String(depth));
      card.style.setProperty("--app-toast-shift", `${direction * offset}px`);
      offset += card.offsetHeight + EXPANDED_GAP_PX;
    });
    const visibleCount = this.expanded ? cards.length : Math.min(cards.length, COLLAPSED_VISIBLE);
    const collapsedHeight = cards
      .slice(0, visibleCount)
      .reduce(
        (height, card, depth) => height + (depth === 0 ? card.offsetHeight : COLLAPSED_STEP_PX),
        0,
      );
    if (this.expanded) {
      this.expandedRegionHeight = Math.max(this.expandedRegionHeight, offset);
    } else {
      this.expandedRegionHeight = 0;
    }
    this.style.setProperty(
      "--app-toast-stack-height",
      `${this.expanded ? this.expandedRegionHeight : collapsedHeight}px`,
    );
    this.style.setProperty("--app-toast-direction", String(direction));
    this.style.setProperty("--app-toast-step", `${direction * COLLAPSED_STEP_PX}px`);
  }

  private renderCard(entry: ToastEntry, depth: number) {
    const { options } = entry;
    const tone = options.tone;
    const hidden = depth >= COLLAPSED_VISIBLE && !this.expanded;
    return html`
      <div
        class="app-toast${tone ? ` app-toast--${tone}` : ""}"
        data-depth=${depth}
        ?data-collapsed-hidden=${hidden}
        role=${tone === "danger" || tone === "warn" ? "alert" : "status"}
        aria-live="polite"
        aria-atomic="true"
      >
        ${tone
          ? html`<span class="app-toast__icon" aria-hidden="true">${TONE_ICONS[tone]}</span>`
          : nothing}
        <span class="app-toast__message">${options.message}</span>
        ${options.actionLabel && options.onAction
          ? html`
              <button
                type="button"
                class="app-toast__action"
                @click=${() => {
                  this.dismiss(entry, "action");
                  options.onAction?.();
                }}
              >
                ${options.actionLabel}
              </button>
            `
          : nothing}
        <button
          type="button"
          class="app-toast__dismiss"
          aria-label=${t("common.dismiss")}
          title=${t("common.dismiss")}
          @click=${() => this.dismiss(entry, "dismiss")}
        >
          ${icons.x}
        </button>
      </div>
    `;
  }

  override render() {
    if (this.entries.length === 0) {
      return nothing;
    }
    return html`
      <div
        class="app-toast-stack${this.expanded ? " app-toast-stack--expanded" : ""}"
        @pointerenter=${() => this.holdExpanded()}
        @pointerleave=${(event: PointerEvent) => this.releaseExpanded(event.relatedTarget)}
        @focusin=${() => this.holdExpanded()}
        @focusout=${(event: FocusEvent) => this.releaseExpanded(event.relatedTarget)}
      >
        <div class="app-toast-stack__content">
          ${repeat(
            this.entries,
            (entry) => entry.id,
            (entry, depth) => this.renderCard(entry, depth),
          )}
        </div>
      </div>
    `;
  }
}

export function showToast(options: ToastOptions): boolean {
  const host = document.querySelector<OpenClawToastHost>("openclaw-toast-host");
  if (!host) {
    // Bounded like the stack itself: a caller reporting into a missing host is
    // still a caller that can loop, and the host can only show so many.
    queuedToasts.push(options);
    if (queuedToasts.length > MAX_STACKED_TOASTS) {
      queuedToasts.shift()?.onDismiss?.("replaced");
    }
    return false;
  }
  const modal = activeModalToastLayer();
  if (modal && host.parentElement !== modal) {
    modal.moveBefore(host, null);
    const handoff = (event: Event) => {
      if (event.target !== modal) {
        return;
      }
      modal.removeEventListener("wa-after-hide", handoff);
      queueMicrotask(() =>
        (activeModalToastLayer() ?? document.querySelector(".shell"))?.moveBefore(host, null),
      );
    };
    modal.addEventListener("wa-after-hide", handoff);
  }
  host.show(options);
  return true;
}

if (!customElements.get("openclaw-toast-host")) {
  customElements.define("openclaw-toast-host", OpenClawToastHost);
}

declare global {
  interface HTMLElementTagNameMap {
    "openclaw-toast-host": OpenClawToastHost;
  }
}
