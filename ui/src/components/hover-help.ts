import "@awesome.me/webawesome/dist/components/popup/popup.js";
import type WaPopup from "@awesome.me/webawesome/dist/components/popup/popup.js";
import { css, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { OpenClawLitElement } from "../lit/openclaw-element.ts";
import { normalizeTooltipText } from "./tooltip-content.ts";
import {
  claimTransientHoverSurface,
  releaseTransientHoverSurface,
} from "./transient-hover-surface.ts";

const HOVER_DELAY = 450;
const CLOSE_BRIDGE_DELAY = 120;
const EXIT_DURATION = 100;

let nextHoverHelpId = 0;

function createHoverHelpId() {
  nextHoverHelpId += 1;
  return `openclaw-hover-help-${nextHoverHelpId}`;
}

type TooltipProvider = HTMLElement & {
  focusOpensTooltip?: () => boolean;
};

class HoverHelp extends OpenClawLitElement {
  @property({ type: Number }) delay = HOVER_DELAY;
  @property({ type: Number }) closeDelay = CLOSE_BRIDGE_DELAY;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean, attribute: "open-on-click" }) openOnClick = false;

  @query("wa-popup") private popup?: WaPopup;
  @state() private popupActive = false;

  private trigger: HTMLElement | null = null;
  private tooltipProvider: TooltipProvider | null = null;
  private openTimer: number | null = null;
  private closeTimer: number | null = null;
  private exitTimer: number | null = null;
  private triggerHovered = false;
  private contentHovered = false;
  private triggerFocused = false;
  private contentFocused = false;
  private pinned = false;
  private readonly hoverHelpId = createHoverHelpId();
  private previousAria: Record<string, string | null> | null = null;

  static override styles = css`
    :host {
      display: contents;
    }

    wa-popup {
      --show-duration: 160ms;
      --hide-duration: 100ms;
    }

    .hover-help-card {
      box-sizing: border-box;
      width: max-content;
      max-width: var(--openclaw-hover-help-max-width, min(320px, calc(100vw - 24px)));
      padding: var(--openclaw-hover-help-padding, 12px);
      border: 1px solid var(--overlay-border, var(--border-strong));
      border-radius: var(--radius-lg);
      background: var(--popover);
      box-shadow: var(--overlay-shadow);
      color: var(--text);
      font-family: var(--font-body);
      pointer-events: none;
      opacity: 0;
      transform: scale(0.99);
      transition:
        opacity 100ms var(--ease-out),
        transform 100ms var(--ease-out);
    }

    :host([open]) .hover-help-card {
      pointer-events: auto;
      opacity: 1;
      transform: scale(1);
      transition-duration: 160ms;
    }

    wa-popup[data-current-placement^="top"] .hover-help-card {
      transform-origin: bottom center;
    }

    wa-popup[data-current-placement^="bottom"] .hover-help-card {
      transform-origin: top center;
    }

    @media (prefers-reduced-motion: reduce) {
      wa-popup {
        --show-duration: 0ms;
        --hide-duration: 0ms;
      }

      .hover-help-card,
      :host([open]) .hover-help-card {
        transform: none;
        transition: none;
      }
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.style.display = "contents";
  }

  protected override updated() {
    this.attachTrigger();
    if (this.disabled || !this.descriptionText) {
      this.closeTransientSurface();
    }
  }

  override disconnectedCallback() {
    this.closeTransientSurface();
    this.clearExitTimer();
    this.popupActive = false;
    this.detachTrigger();
    super.disconnectedCallback();
  }

  closeTransientSurface = () => {
    const wasActive = this.popupActive || this.hasAttribute("open");
    this.pinned = false;
    this.removeAttribute("open");
    this.removeDocumentListeners();
    this.clearOpenTimer();
    this.clearCloseTimer();
    this.triggerHovered = false;
    this.contentHovered = false;
    this.triggerFocused = false;
    this.contentFocused = false;
    releaseTransientHoverSurface(this.ownerDocument, this);
    if (!wasActive) {
      return;
    }
    this.clearExitTimer();
    this.exitTimer = window.setTimeout(
      () => {
        this.exitTimer = null;
        if (!this.hasAttribute("open")) {
          this.popupActive = false;
        }
      },
      this.reducedMotion ? 0 : EXIT_DURATION,
    );
    this.syncTriggerState();
  };

  private attachTrigger() {
    const triggerSlot = this.renderRoot.querySelector<HTMLSlotElement>("slot:not([name])");
    const trigger = triggerSlot?.assignedElements({ flatten: true })[0];
    if (trigger === this.trigger) {
      return;
    }
    this.closeTransientSurface();
    this.detachTrigger();
    if (!(trigger instanceof HTMLElement)) {
      return;
    }
    this.trigger = trigger;
    this.previousAria = Object.fromEntries(
      ["aria-controls", "aria-describedby", "aria-expanded", "aria-haspopup"].map((name) => [
        name,
        trigger.getAttribute(name),
      ]),
    );
    this.tooltipProvider = this.findTooltipProvider(trigger);
    trigger.addEventListener("pointerenter", this.handleTriggerPointerEnter);
    trigger.addEventListener("pointerleave", this.handleTriggerPointerLeave);
    trigger.addEventListener("pointerdown", this.handleTriggerPointerDown);
    trigger.addEventListener("focusin", this.handleTriggerFocusIn);
    trigger.addEventListener("focusout", this.handleTriggerFocusOut);
    trigger.addEventListener("click", this.handleTriggerClick, true);
    this.syncDescription();
    this.syncTriggerState();
  }

  private detachTrigger() {
    const trigger = this.trigger;
    if (!trigger) {
      return;
    }
    trigger.removeEventListener("pointerenter", this.handleTriggerPointerEnter);
    trigger.removeEventListener("pointerleave", this.handleTriggerPointerLeave);
    trigger.removeEventListener("pointerdown", this.handleTriggerPointerDown);
    trigger.removeEventListener("focusin", this.handleTriggerFocusIn);
    trigger.removeEventListener("focusout", this.handleTriggerFocusOut);
    trigger.removeEventListener("click", this.handleTriggerClick, true);
    for (const [name, value] of Object.entries(this.previousAria ?? {})) {
      if (value === null) {
        trigger.removeAttribute(name);
      } else {
        trigger.setAttribute(name, value);
      }
    }
    this.previousAria = null;
    this.trigger = null;
    this.tooltipProvider = null;
  }

  private findTooltipProvider(trigger: HTMLElement): TooltipProvider | null {
    let owner: Element | null = trigger;
    while (owner) {
      const provider = owner.closest<TooltipProvider>("openclaw-tooltip-provider");
      if (provider) {
        return provider;
      }
      const root = owner.getRootNode();
      owner = root instanceof ShadowRoot ? root.host : null;
    }
    return null;
  }

  private readonly handleTriggerPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      return;
    }
    this.triggerHovered = true;
    this.clearCloseTimer();
    this.scheduleOpen();
  };

  private readonly handleTriggerPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      return;
    }
    this.triggerHovered = false;
    this.clearOpenTimer();
    this.scheduleClose();
  };

  private readonly handleTriggerPointerDown = () => {
    if (!this.openOnClick) {
      this.closeTransientSurface();
    }
  };

  private readonly handleTriggerFocusIn = () => {
    this.triggerFocused = true;
    if (this.tooltipProvider?.focusOpensTooltip?.() !== false) {
      this.show();
    }
  };

  private readonly handleTriggerFocusOut = (event: FocusEvent) => {
    this.triggerFocused = false;
    if (event.relatedTarget instanceof Node && this.contains(event.relatedTarget)) {
      return;
    }
    this.scheduleClose();
  };

  private readonly handleTriggerClick = () => {
    if (!this.openOnClick) {
      this.closeTransientSurface();
      return;
    }
    if (this.pinned) {
      this.closeTransientSurface();
      return;
    }
    this.show();
    this.pinned = true;
  };

  private readonly handleContentPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      this.contentHovered = true;
      this.clearCloseTimer();
    }
  };

  private readonly handleContentPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      this.contentHovered = false;
      this.scheduleClose();
    }
  };

  private readonly handleContentFocusIn = () => {
    this.contentFocused = true;
    this.clearCloseTimer();
  };

  private readonly handleContentFocusOut = (event: FocusEvent) => {
    this.contentFocused = false;
    if (event.relatedTarget instanceof Node && this.contains(event.relatedTarget)) {
      return;
    }
    this.scheduleClose();
  };

  private readonly handleDocumentPointerDown = (event: PointerEvent) => {
    if (!event.composedPath().some((target) => target === this || target === this.trigger)) {
      this.closeTransientSurface();
    }
  };

  private readonly handleDocumentFocusIn = (event: FocusEvent) => {
    if (!event.composedPath().some((target) => target === this || target === this.trigger)) {
      this.closeTransientSurface();
    }
  };

  private readonly handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !this.hasAttribute("open")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.trigger?.focus({ preventScroll: true });
    this.closeTransientSurface();
  };

  private scheduleOpen() {
    if (this.disabled || this.hasAttribute("open") || this.openTimer !== null) {
      return;
    }
    this.openTimer = window.setTimeout(
      () => {
        this.openTimer = null;
        this.show();
      },
      Math.max(0, this.delay),
    );
  }

  private show() {
    if (this.disabled || !this.trigger || !this.descriptionText) {
      return;
    }
    this.clearOpenTimer();
    this.clearCloseTimer();
    this.clearExitTimer();
    claimTransientHoverSurface(this.ownerDocument, this);
    this.popupActive = true;
    this.addDocumentListeners();
    void this.updateComplete.then(() => {
      if (!this.popupActive) {
        return;
      }
      requestAnimationFrame(() => {
        if (this.popupActive) {
          this.setAttribute("open", "");
          this.syncTriggerState();
          this.popup?.reposition();
        }
      });
    });
  }

  private scheduleClose() {
    this.clearCloseTimer();
    if (
      this.pinned ||
      this.triggerHovered ||
      this.contentHovered ||
      this.triggerFocused ||
      this.contentFocused
    ) {
      return;
    }
    this.closeTimer = window.setTimeout(
      () => {
        this.closeTimer = null;
        if (
          !this.pinned &&
          !this.triggerHovered &&
          !this.contentHovered &&
          !this.triggerFocused &&
          !this.contentFocused
        ) {
          this.closeTransientSurface();
        }
      },
      Math.max(0, this.closeDelay),
    );
  }

  private addDocumentListeners() {
    this.ownerDocument.addEventListener("pointerdown", this.handleDocumentPointerDown, true);
    this.ownerDocument.addEventListener("focusin", this.handleDocumentFocusIn, true);
    this.ownerDocument.addEventListener("keydown", this.handleDocumentKeyDown, true);
  }

  private removeDocumentListeners() {
    this.ownerDocument.removeEventListener("pointerdown", this.handleDocumentPointerDown, true);
    this.ownerDocument.removeEventListener("focusin", this.handleDocumentFocusIn, true);
    this.ownerDocument.removeEventListener("keydown", this.handleDocumentKeyDown, true);
  }

  private syncTriggerState() {
    const content = this.contentElement;
    if (!this.trigger || !content) {
      return;
    }
    if (!content.id) {
      content.id = `${this.hoverHelpId}-description`;
    }
    this.trigger.setAttribute("aria-controls", this.hoverHelpId);
    const describedBy = new Set(
      [this.previousAria?.["aria-describedby"], content.id].filter((value): value is string =>
        Boolean(value),
      ),
    );
    this.trigger.setAttribute("aria-describedby", [...describedBy].join(" "));
    this.trigger.setAttribute("aria-expanded", String(this.hasAttribute("open")));
    this.trigger.setAttribute("aria-haspopup", "dialog");
  }

  private syncDescription() {
    this.syncTriggerState();
  }

  private get contentElement() {
    return this.renderRoot
      .querySelector<HTMLSlotElement>('slot[name="content"]')
      ?.assignedElements({ flatten: true })[0];
  }

  private get descriptionText() {
    return normalizeTooltipText(this.contentElement?.textContent ?? "");
  }

  private get reducedMotion() {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  private clearOpenTimer() {
    if (this.openTimer !== null) {
      window.clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private clearCloseTimer() {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private clearExitTimer() {
    if (this.exitTimer !== null) {
      window.clearTimeout(this.exitTimer);
      this.exitTimer = null;
    }
  }

  override render() {
    return html`
      <slot @slotchange=${() => this.attachTrigger()}></slot>
      <wa-popup
        placement="top"
        distance="10"
        flip
        shift
        shift-padding="12"
        hover-bridge
        .anchor=${this.trigger}
        .active=${this.popupActive}
      >
        <div
          id=${this.hoverHelpId}
          class="hover-help-card"
          role="dialog"
          @pointerenter=${this.handleContentPointerEnter}
          @pointerleave=${this.handleContentPointerLeave}
          @focusin=${this.handleContentFocusIn}
          @focusout=${this.handleContentFocusOut}
        >
          <slot name="content" @slotchange=${() => this.syncDescription()}></slot>
        </div>
      </wa-popup>
    `;
  }
}

if (!customElements.get("openclaw-hover-help")) {
  customElements.define("openclaw-hover-help", HoverHelp);
}

declare global {
  interface HTMLElementTagNameMap {
    "openclaw-hover-help": HoverHelp;
  }
}
