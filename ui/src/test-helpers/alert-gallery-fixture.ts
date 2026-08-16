// Every alert surface in the Control UI, on one page, firable on demand.
// Reviewing the alert grammar means seeing a warning next to a warning: a
// severity that drifts is obvious side by side and invisible when the two live
// three routes apart. The gallery renders outside the app shell, so it loads
// the app stylesheet itself the way board-fixture.ts does.
import { html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { icons } from "../components/icons.ts";
import { showToast, type ToastTone } from "../lib/toast.ts";
import { OpenClawLightDomElement } from "../lit/openclaw-element.ts";
import "../styles.css";
// The surfaces below live on lazily routed pages, so their stylesheets are not
// part of the always-loaded bundle. The gallery loads them itself; without
// them these rows render as unstyled text and prove nothing.
import "../styles/approval.css";
import "../styles/board.css";
import "../styles/chat/sidebar.css";
import "../styles/plugins.css";
import "../styles/skill-workshop.css";

type ToneLabel = ToastTone | "neutral";
type ToneRow = { tone: ToastTone | null; label: ToneLabel; glyph: TemplateResult | null };

const TONES: readonly ToneRow[] = [
  { tone: null, label: "neutral", glyph: null },
  { tone: "info", label: "info", glyph: icons.infoCircle },
  { tone: "success", label: "success", glyph: icons.checkCircle },
  { tone: "warn", label: "warn", glyph: icons.alertTriangle },
  { tone: "danger", label: "danger", glyph: icons.alertCircle },
];

// Long enough that an operator can compare a toast against the inline callouts
// below it without racing the six-second production default.
const PERSISTENT_MS = 3_600_000;

const SAMPLE_TEXT: Readonly<Record<ToneLabel, string>> = {
  neutral: "Cloud worker for “release-audit” is stopping.",
  info: "Refreshing a stale channel snapshot.",
  success: "Gateway updated and restarted.",
  warn: "Gateway connection replaced before “Backlog” was deleted. Try again.",
  danger: "Could not copy this image. Check clipboard access and try again.",
};

const LONG_TEXT =
  "Deleted 3 sessions. 2 session worktrees with uncommitted or unpushed work were kept " +
  "(feature/pairing-retry, fix/gateway-restart). Manage them under Settings → Worktrees.";

class AlertGalleryFixture extends OpenClawLightDomElement {
  @state() private persistent = true;
  @state() private dismissed = new Set<string>();

  private fire(tone: ToastTone | null, options?: { action?: boolean; long?: boolean }) {
    showToast({
      message: options?.long ? LONG_TEXT : SAMPLE_TEXT[tone ?? "neutral"],
      ...(tone ? { tone } : {}),
      ...(options?.action ? { actionLabel: "Undo", onAction: () => {} } : {}),
      durationMs: this.persistent ? PERSISTENT_MS : undefined,
    });
  }

  private renderToastControls() {
    return html`
      <section class="gallery__section">
        <h2>Toasts — click to fire</h2>
        <p class="gallery__note">
          One at a time by design: <code>show()</code> replaces the visible toast. Desktop places it
          bottom-right, phone widths full-width at the top.
        </p>
        <label class="gallery__toggle">
          <input
            type="checkbox"
            .checked=${this.persistent}
            @change=${(event: Event) => {
              this.persistent = (event.target as HTMLInputElement).checked;
            }}
          />
          Hold open (skip the 6s auto-dismiss)
        </label>
        <div class="gallery__row">
          ${TONES.map(
            (row) => html`
              <button class="btn btn--sm" type="button" @click=${() => this.fire(row.tone)}>
                ${row.label}
              </button>
            `,
          )}
        </div>
        <div class="gallery__row">
          <button
            class="btn btn--sm"
            type="button"
            @click=${() => this.fire("success", { action: true })}
          >
            success + action
          </button>
          <button
            class="btn btn--sm"
            type="button"
            @click=${() => this.fire("warn", { long: true })}
          >
            warn, three-line clamp
          </button>
          <button
            class="btn btn--sm"
            type="button"
            @click=${() => this.fire(null, { action: true })}
          >
            neutral + action
          </button>
        </div>
      </section>
    `;
  }

  private renderCallout(row: ToneRow, shape: "action" | "dismiss" | "icon" | "plain") {
    const key = `${row.label}-${shape}`;
    if (this.dismissed.has(key)) {
      return nothing;
    }
    const toneClass = row.tone ? ` callout--${row.tone}` : "";
    return html`
      <div class="callout${toneClass}${shape === "plain" ? "" : " callout--action"}">
        ${shape === "icon" && row.glyph
          ? html`<span class="callout__icon" aria-hidden="true">${row.glyph}</span>`
          : nothing}
        <span class="callout__content">${SAMPLE_TEXT[row.label]}</span>
        ${shape === "action"
          ? html`<button class="btn btn--sm" type="button">Retry</button>`
          : nothing}
        ${shape === "dismiss"
          ? html`<button
              class="callout__dismiss"
              type="button"
              aria-label="Dismiss"
              @click=${() => {
                this.dismissed = new Set([...this.dismissed, key]);
              }}
            >
              ${icons.x}
            </button>`
          : nothing}
      </div>
    `;
  }

  private renderCallouts() {
    return html`
      <section class="gallery__section">
        <h2>Inline callouts — persistent by definition</h2>
        <p class="gallery__note">
          Columns are the four shapes a callout takes; rows are the severities. Body copy stays
          --text so a sentence reads as prose, and the tone colors the glyph and any lead-in.
        </p>
        <div class="gallery__grid">
          ${TONES.map(
            (row) => html`
              <div class="gallery__label">${row.label}</div>
              ${this.renderCallout(row, "plain")} ${this.renderCallout(row, "icon")}
              ${this.renderCallout(row, "action")} ${this.renderCallout(row, "dismiss")}
            `,
          )}
        </div>
        <button
          class="btn btn--sm"
          type="button"
          @click=${() => {
            this.dismissed = new Set();
          }}
        >
          Restore dismissed
        </button>
      </section>
    `;
  }

  private renderRealSurfaces() {
    return html`
      <section class="gallery__section">
        <h2>Surfaces that fold into the same grammar</h2>
        <p class="gallery__note">
          Each of these used to derive its own tint. They now name a tone and read the shared
          --alert-* trio, so they belong beside the callouts above rather than beside each other.
        </p>
        <div class="gallery__stack">
          <div class="plugins-page-error">
            <span>Could not load the plugin catalog.</span>
            <button class="btn btn--sm" type="button">Try again</button>
          </div>
          <div class="plugins-row-message">Installed openclaw-telegram 2026.6.2.</div>
          <div class="plugins-row-message plugins-row-message--error">
            Plugin failed to load: missing manifest entry point.
          </div>
          <div class="approval-page__callout">
            <span><strong>Connection lost</strong><span>Retry to reload this approval.</span></span>
            <button class="btn btn--sm" type="button">Retry</button>
          </div>
          <div class="sw-error">
            <span>Could not load the workshop.</span>
            <button class="btn btn--sm" type="button">Try again</button>
          </div>
          <div class="board-view__error">Could not apply the board operation.</div>
          <div class="sidebar-attention">
            <div class="sidebar-attention__item sidebar-attention__item--warning">
              <span class="sidebar-attention__open">
                <span class="sidebar-attention__icon">${icons.alertTriangle}</span>
                <span class="sidebar-attention__label">Session needs attention</span>
              </span>
            </div>
            <div class="sidebar-attention__item sidebar-attention__item--error">
              <span class="sidebar-attention__open">
                <span class="sidebar-attention__icon">${icons.alertCircle}</span>
                <span class="sidebar-attention__label">Run failed</span>
              </span>
            </div>
          </div>
          <div class="sidebar-update-card__status sidebar-update-card__status--warn">
            Update skipped: the Gateway is busy.
          </div>
          <div class="sidebar-update-card__status sidebar-update-card__status--danger">
            Update verification failed.
          </div>
          <div class="scope-upgrade-chip-row">
            <button class="scope-upgrade-chip" type="button">
              <span class="scope-upgrade-chip__dot"></span>Limited access
            </button>
          </div>
          <div class="file-view__save-notice">
            <span>File changed on disk since it was loaded.</span>
            <span class="file-view__save-notice-actions">
              <button class="btn btn--sm" type="button">Reload</button>
            </span>
          </div>
          <div class="gallery__toast-slot">
            <div class="sw-action-toast"><strong>Skill installed</strong></div>
          </div>
        </div>
      </section>
    `;
  }

  override render() {
    return html`
      <div class="gallery">
        <header class="gallery__header">
          <div>
            <span>CONTROL UI</span>
            <h1>Alert &amp; toast gallery</h1>
          </div>
          <div class="gallery__row">
            ${(["dark", "light"] as const).map(
              (mode) => html`
                <button
                  class="btn btn--sm"
                  type="button"
                  @click=${() => {
                    const root = document.documentElement;
                    root.dataset.theme = mode;
                    root.dataset.themeMode = mode;
                    root.classList.toggle("wa-light", mode === "light");
                    root.classList.toggle("wa-dark", mode === "dark");
                    root.style.colorScheme = mode;
                  }}
                >
                  ${mode}
                </button>
              `,
            )}
          </div>
        </header>
        ${this.renderToastControls()} ${this.renderCallouts()} ${this.renderRealSurfaces()}
      </div>
      <openclaw-toast-host></openclaw-toast-host>
    `;
  }
}

if (!customElements.get("openclaw-alert-gallery-fixture")) {
  customElements.define("openclaw-alert-gallery-fixture", AlertGalleryFixture);
}

document.querySelector("#app")?.append(document.createElement("openclaw-alert-gallery-fixture"));
