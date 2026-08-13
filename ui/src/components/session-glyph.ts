import { html, nothing, type TemplateResult } from "lit";
import { t } from "../i18n/index.ts";

export type SessionGlyphContent = TemplateResult | typeof nothing;

/** Composes a compact state glyph with an optional running ring and corner badge. */
export function renderSessionGlyph(options: {
  content: SessionGlyphContent;
  running: boolean;
  circular?: boolean;
  badge?: SessionGlyphContent;
}): TemplateResult {
  const { content, running, circular = false, badge = nothing } = options;
  const modifiers = `${circular ? " session-glyph--circular" : ""}${running ? " session-glyph--running" : ""}`;
  return html`<span class="session-glyph${modifiers}">
    <span class="session-glyph__content">${content}</span>
    ${running
      ? html`<span
          class="session-glyph__ring"
          role="img"
          aria-label=${t("sessionsView.activeRun")}
        ></span>`
      : nothing}
    ${badge}
  </span>`;
}

export function renderSessionUnreadBadge(): TemplateResult {
  return html`<span
    class="session-glyph__badge session-glyph__badge--unread"
    role="img"
    aria-label=${t("sessionsView.unread")}
  ></span>`;
}
