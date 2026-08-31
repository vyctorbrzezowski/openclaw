// Control UI adapter for Web Awesome's accessible modal dialog.
import "@awesome.me/webawesome/dist/components/dialog/dialog.js";
import type WaDialog from "@awesome.me/webawesome/dist/components/dialog/dialog.js";
import { css, html, type PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { OpenClawLitElement } from "../lit/openclaw-element.ts";

const modalLayers = (document.openClawModalLayers ??= new Set<HTMLElement>());

type ModalDialogVariant = "standard" | "large" | "reader" | "palette" | "media" | "drawer";

function setModalLayer(modal: HTMLElement, open: boolean) {
  modalLayers.delete(modal);
  if (open) {
    modalLayers.add(modal);
  }
}

export class OpenClawModalDialog extends OpenClawLitElement {
  @property({ type: Boolean }) open = true;
  @property({ type: Boolean, reflect: true }) manual = false;
  @property({ reflect: true }) variant: ModalDialogVariant = "standard";
  @property() label = "";
  @property() description = "";

  @query("wa-dialog") private webAwesomeDialog?: WaDialog;

  private returnFocus: HTMLElement | null = null;
  private returnFocusOverride: HTMLElement | null | undefined;
  private syncGeneration = 0;
  private suppressNextCancel = false;

  static override styles = css`
    :host {
      display: contents;
    }

    wa-dialog {
      --width: min(var(--openclaw-modal-width, 540px), calc(100vw - 48px));
      --spacing: 0;
      --backdrop-filter: blur(4px);
    }

    /* The adapter owns outer chrome; slotted content keeps only its screen-specific layout. */
    wa-dialog::part(dialog) {
      max-width: var(--openclaw-modal-max-width, calc(100vw - 48px));
      max-height: var(--openclaw-modal-max-height, calc(100dvh - 48px));
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--card);
      color: var(--text);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    wa-dialog::part(body) {
      min-height: 0;
      padding: 0;
      overflow: auto;
    }

    :host([variant="large"]) wa-dialog {
      --width: min(var(--openclaw-modal-width, 680px), calc(100vw - 48px));
    }

    :host([variant="large"]) wa-dialog::part(dialog) {
      border-color: var(--border-strong);
      border-radius: var(--radius-xl);
      background: var(--popover);
      box-shadow: var(--shadow-xl);
    }

    :host([variant="reader"]) wa-dialog {
      --width: min(var(--openclaw-modal-width, 1100px), calc(100vw - 32px));
    }

    :host([variant="reader"]) wa-dialog::part(dialog) {
      max-width: var(--openclaw-modal-max-width, calc(100vw - 32px));
      max-height: var(--openclaw-modal-max-height, calc(100dvh - 32px));
      border-color: var(--border-strong);
      border-radius: var(--radius-xl);
      background: var(--panel);
      box-shadow: var(--shadow-xl);
    }

    :host([variant="reader"].fullscreen) wa-dialog {
      --width: calc(100vw - 20px);
    }

    :host([variant="reader"].fullscreen) wa-dialog::part(dialog) {
      max-width: calc(100vw - 20px);
      max-height: calc(100dvh - 20px);
    }

    :host([variant="media"]) wa-dialog {
      --width: 100vw;
      --backdrop-filter: none;
    }

    :host([variant="media"]) wa-dialog::part(dialog) {
      width: 100vw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }

    :host([variant="media"]) wa-dialog::part(body) {
      height: 100%;
      overflow: hidden;
    }

    :host([variant="palette"]) wa-dialog {
      --width: min(var(--openclaw-modal-width, 640px), calc(100vw - 32px));
      --show-duration: 0ms;
      --hide-duration: 0ms;
    }

    :host([variant="palette"]) wa-dialog::part(dialog) {
      max-width: calc(100vw - 32px);
      margin-block-start: min(20dvh, 160px);
      margin-block-end: auto;
    }

    :host([variant="drawer"]) wa-dialog {
      --width: min(var(--openclaw-modal-width, 460px), 100vw);
      --show-duration: 200ms;
      --hide-duration: 0ms;
    }

    :host([variant="drawer"]) wa-dialog::part(dialog) {
      height: 100dvh;
      max-width: 100vw;
      max-height: 100dvh;
      margin: 0 0 0 auto;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }

    :host([variant="drawer"]) wa-dialog::part(body) {
      overflow: hidden;
    }

    :host([variant="drawer"]) wa-dialog[open]::part(dialog) {
      animation: openclaw-drawer-in 200ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    @keyframes openclaw-drawer-in {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host([variant="drawer"]) wa-dialog {
        --show-duration: 0ms;
      }

      :host([variant="drawer"]) wa-dialog[open]::part(dialog) {
        animation: none;
      }
    }
    @media (max-width: 640px) {
      wa-dialog {
        --width: min(var(--openclaw-modal-width, 540px), calc(100vw - 24px));
      }

      wa-dialog::part(dialog) {
        max-width: var(--openclaw-modal-max-width, calc(100vw - 24px));
        max-height: 90dvh;
      }
    }

    @media (max-width: 900px) {
      :host([variant="large"].mobile-edge-to-edge) wa-dialog {
        --width: 100vw;
      }

      :host([variant="large"].mobile-edge-to-edge) wa-dialog::part(dialog) {
        width: 100vw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      :host([variant="large"].mobile-edge-to-edge) wa-dialog::part(body) {
        height: 100%;
        overflow: hidden;
      }
    }

    @media (max-width: 768px),
      (max-width: 932px) and (max-height: 500px) and (orientation: landscape) {
      :host(.mobile-edge-to-edge) wa-dialog {
        --width: 100vw;
      }

      :host(.mobile-edge-to-edge) wa-dialog::part(dialog) {
        width: 100vw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      :host(.mobile-edge-to-edge) wa-dialog::part(body) {
        height: 100%;
        overflow: hidden;
      }
    }
  `;

  override connectedCallback() {
    if (this.manual) {
      this.open = false;
    }
    super.connectedCallback();
    void this.updateComplete.then(() => this.syncDialogOpen());
  }

  override disconnectedCallback() {
    setModalLayer(this, false);
    this.syncGeneration += 1;
    const webAwesomeDialog = this.webAwesomeDialog;
    const dialog = webAwesomeDialog?.shadowRoot?.querySelector("dialog");
    if (dialog?.open) {
      dialog.close();
    }
    if (webAwesomeDialog) {
      webAwesomeDialog.open = false;
    }
    const returnFocus =
      this.returnFocusOverride === undefined ? this.returnFocus : this.returnFocusOverride;
    this.returnFocus = null;
    this.returnFocusOverride = undefined;
    if (returnFocus?.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <wa-dialog
        without-header
        light-dismiss
        .label=${this.label}
        @focusin=${this.handleInitialFocus}
        @wa-after-show=${this.handleInitialFocus}
        @wa-after-hide=${this.handleAfterHide}
        @wa-hide=${this.handleHide}
      >
        <slot></slot>
      </wa-dialog>
    `;
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has("open")) {
      setModalLayer(this, this.open);
    }
    void this.syncAccessibility();
    void this.syncDialogOpen();
  }

  private async syncDialogOpen() {
    const generation = ++this.syncGeneration;
    const webAwesomeDialog = this.webAwesomeDialog;
    if (!webAwesomeDialog) {
      return;
    }
    await webAwesomeDialog.updateComplete;
    if (generation !== this.syncGeneration || !this.isConnected) {
      return;
    }
    const dialog = webAwesomeDialog.shadowRoot?.querySelector("dialog");
    if (this.open) {
      if (dialog?.open) {
        return;
      }
      this.returnFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      webAwesomeDialog.open = true;
      return;
    }
    if (webAwesomeDialog.open || dialog?.open) {
      this.suppressNextCancel = true;
      webAwesomeDialog.open = false;
    }
  }

  private async syncAccessibility() {
    const webAwesomeDialog = this.webAwesomeDialog;
    if (!webAwesomeDialog) {
      return;
    }
    await webAwesomeDialog.updateComplete;
    const dialog = webAwesomeDialog.shadowRoot?.querySelector("dialog");
    if (!dialog) {
      return;
    }
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    if (this.label) {
      dialog.setAttribute("aria-label", this.label);
    } else {
      dialog.removeAttribute("aria-label");
    }
    if (this.description) {
      dialog.setAttribute("aria-description", this.description);
    } else {
      dialog.removeAttribute("aria-description");
    }
  }

  private handleInitialFocus = (event: Event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (!this.isConnected) {
      return;
    }
    // Late animation completion must not replace focus already inside the form.
    const root = this.getRootNode();
    const active =
      root instanceof ShadowRoot ? root.activeElement : this.ownerDocument.activeElement;
    if (active instanceof HTMLElement && active !== this && this.contains(active)) {
      return;
    }
    // Web Awesome's opening frame focuses its native dialog without seeing our
    // slotted content. Restore the field it just displaced before input arrives.
    const previous = event instanceof FocusEvent ? event.relatedTarget : null;
    const target =
      previous instanceof HTMLElement && this.contains(previous)
        ? previous
        : this.querySelector<HTMLElement>("[autofocus]");
    target?.focus({ preventScroll: true });
  };

  private handleAfterHide = (event: Event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const returnFocus = this.returnFocusOverride;
    const originalReturnFocus = this.returnFocus;
    this.returnFocusOverride = undefined;
    this.open = false;
    this.returnFocus = null;
    if (returnFocus === undefined) {
      return;
    }
    // Web Awesome queues its original-trigger restoration immediately before
    // wa-after-hide; apply the owner's restoration or suppression after it.
    setTimeout(() => {
      if (returnFocus === null) {
        if (originalReturnFocus && document.activeElement === originalReturnFocus) {
          originalReturnFocus.blur();
        }
      } else if (returnFocus.isConnected) {
        returnFocus.focus({ preventScroll: true });
      }
    }, 0);
  };

  private handleHide = (event: Event) => {
    // Nested overlay lifecycle events bubble through the slot; only the
    // dialog's own hide may dismiss or steal focus from its owner.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (this.suppressNextCancel) {
      this.suppressNextCancel = false;
      return;
    }
    const cancelEvent = new CustomEvent("modal-cancel", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(cancelEvent);
    if (cancelEvent.defaultPrevented) {
      event.preventDefault();
    }
  };

  show() {
    this.open = true;
  }

  setReturnFocusTarget(target: HTMLElement | null) {
    this.returnFocusOverride = target;
  }

  hide() {
    this.open = false;
  }
}

if (!customElements.get("openclaw-modal-dialog")) {
  customElements.define("openclaw-modal-dialog", OpenClawModalDialog);
}

declare global {
  interface Document {
    openClawModalLayers?: Set<HTMLElement>;
  }

  interface HTMLElementTagNameMap {
    "openclaw-modal-dialog": OpenClawModalDialog;
  }
}
