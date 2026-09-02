// Community invite card. A non-modal overlay anchored above the sidebar footer:
// it never dims the app, traps focus, or changes the sidebar's scroll geometry.
// Shadow DOM keeps this one-shot surface off the startup CSS budget.
import { css, html, svg } from "lit";
import { inferControlUiPublicAssetPath } from "../app/public-assets.ts";
import { t } from "../i18n/index.ts";
import { buildExternalLinkRel, EXTERNAL_LINK_TARGET } from "../lib/external-link.ts";
import { COMMUNITY_DISCORD_URL } from "../lib/product-links.ts";
import { OpenClawLitElement } from "../lit/openclaw-element.ts";
import { strokeIcon } from "./icons-tools.ts";
import { icons } from "./icons.ts";

/** Read by the scheduler chunk, which owns settling the record on this event. */
export const COMMUNITY_INVITE_SETTLED_EVENT = "community-invite-settled";

// Solid brand mark: the shared lucide set is stroked, so this one carries its own fill.
const discordMark = html`
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.51 13.78 13.78 0 0 0-.64 1.29 18.27 18.27 0 0 0-5.5 0 12.64 12.64 0 0 0-.64-1.29 19.74 19.74 0 0 0-4.93 1.51C.53 9.05-.32 13.6.1 18.06a19.9 19.9 0 0 0 6.07 3.03c.46-.63.87-1.3 1.24-2a12.86 12.86 0 0 1-1.96-.93c.16-.12.32-.24.48-.37a14.2 14.2 0 0 0 12.14 0c.16.13.32.25.48.37-.63.37-1.28.68-1.96.93.36.7.78 1.37 1.24 2a19.84 19.84 0 0 0 6.07-3.03c.5-5.18-.84-9.68-3.58-13.69ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.21 0 2.18 1.09 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.09 2.16 2.42 0 1.34-.94 2.42-2.16 2.42Z"
    />
  </svg>
`;

const arrowUpRight = strokeIcon(svg` <path d="M7 17 17 7" />
  <path d="M7 7h10v10" />`);

class OpenClawCommunityInviteCard extends OpenClawLitElement {
  static override styles = css`
    /* The footer is outside the scroll container. Anchoring here keeps the card at
       the visible bottom of that area without adding to its scroll height. */
    :host {
      position: absolute;
      right: var(--space-2, 8px);
      bottom: calc(100% + var(--space-2, 8px));
      left: var(--space-2, 8px);
      z-index: 2;
      display: block;
      animation: invite-enter var(--duration-normal, 180ms) var(--ease-out, ease-out) both;
    }

    @keyframes invite-enter {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
    }

    .invite {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgb(255 255 255 / 12%);
      border-radius: var(--radius-lg, 14px);
      background: #10131c;
      color: #f3f5fb;
      box-shadow: 0 18px 44px rgb(0 0 0 / 40%);
    }

    .invite__header {
      position: relative;
      aspect-ratio: 2.3;
      flex: none;
      overflow: hidden;
    }

    .invite__header::after {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: 48px;
      background: linear-gradient(to bottom, rgb(16 19 28 / 0%), #10131c);
      pointer-events: none;
    }

    .invite__art {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    .invite__close {
      position: absolute;
      inset: var(--space-2, 8px) var(--space-2, 8px) auto auto;
      display: grid;
      width: 28px;
      height: 28px;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: var(--radius-sm, 6px);
      background: rgb(0 0 0 / 42%);
      color: rgb(255 255 255 / 76%);
      cursor: var(--cursor-action, pointer);
      transition:
        background 120ms ease,
        color 120ms ease;
    }

    .invite__close:hover {
      background: rgb(255 255 255 / 14%);
      color: #fff;
    }

    .invite__close:focus-visible {
      outline: 2px solid rgb(255 255 255 / 70%);
      outline-offset: 1px;
    }

    .invite__close svg {
      display: block;
      width: 15px;
      height: 15px;
      fill: none;
      stroke: currentcolor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .invite__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
      padding: var(--space-3, 12px);
    }

    .invite__eyebrow {
      margin: 0;
      color: #a5b4ff;
      font-size: var(--control-ui-text-xs, 11px);
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .invite__title {
      margin: 0;
      color: #f3f5fb;
      font-size: var(--control-ui-text-lg, 16px);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }

    .invite__text {
      margin: 0;
      color: rgb(243 245 251 / 70%);
      font-size: var(--control-ui-text-sm, 12px);
      line-height: 1.45;
    }

    .invite__cta {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 34px;
      margin-top: var(--space-2, 8px);
      padding: var(--space-1, 4px) var(--space-2, 8px);
      border-radius: var(--radius-md, 10px);
      background: #fff;
      color: #10131c;
      font-size: var(--control-ui-text-sm, 12px);
      font-weight: 600;
      text-decoration: none;
      transition:
        background 120ms ease,
        transform 120ms ease;
    }

    .invite__cta:hover {
      background: #e8eaf2;
    }

    .invite__cta:active {
      transform: scale(0.96);
    }

    .invite__cta:focus-visible {
      outline: 2px solid #a5b4ff;
      outline-offset: 2px;
    }

    .invite__cta svg {
      width: 17px;
      height: 17px;
      flex: none;
    }

    /* Same box as the leading brand mark so the label stays optically centred
       whether or not the trailing affordance is visible. */
    .invite__cta-trailing {
      display: grid;
      width: 17px;
      height: 17px;
      place-items: center;
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .invite__cta-trailing svg {
      width: 13px;
      height: 13px;
    }

    .invite__cta:hover .invite__cta-trailing,
    .invite__cta:focus-visible .invite__cta-trailing {
      opacity: 0.5;
    }

    @media (prefers-reduced-motion: reduce) {
      :host,
      .invite__close,
      .invite__cta,
      .invite__cta-trailing {
        animation: none;
        transition: none;
      }
    }
  `;

  private settled = false;

  override render() {
    return html`
      <aside
        class="invite"
        role="complementary"
        aria-label=${t("communityInvite.cardLabel")}
        @keydown=${this.handleKeydown}
      >
        <div class="invite__header">
          <img
            class="invite__art"
            src=${inferControlUiPublicAssetPath("community-art/discord-invite.webp")}
            alt=${t("communityInvite.artAlt")}
            width="1024"
            height="538"
          />
          <button
            class="invite__close"
            type="button"
            aria-label=${t("communityInvite.dismissForever")}
            @click=${() => this.settle("dismissed")}
          >
            ${icons.x}
          </button>
        </div>
        <div class="invite__body">
          <p class="invite__eyebrow">${t("communityInvite.eyebrow")}</p>
          <h2 class="invite__title">${t("communityInvite.title")}</h2>
          <p class="invite__text">${t("communityInvite.body")}</p>
          <a
            class="invite__cta"
            href=${COMMUNITY_DISCORD_URL}
            target=${EXTERNAL_LINK_TARGET}
            rel=${buildExternalLinkRel()}
            @click=${() => this.settle("joined")}
          >
            ${discordMark}
            <span>${t("communityInvite.action")}</span>
            <span class="invite__cta-trailing" aria-hidden="true">${arrowUpRight}</span>
          </a>
        </div>
      </aside>
    `;
  }

  /** Esc dismisses only while focus is inside the card; a non-modal floater must
   * not swallow Escape from the rest of the app. */
  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.settle("dismissed");
    }
  };

  /** Both exits are terminal, so the owner records one outcome and drops the card. */
  private settle(outcome: "joined" | "dismissed") {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.dispatchEvent(
      new CustomEvent(COMMUNITY_INVITE_SETTLED_EVENT, {
        bubbles: true,
        composed: true,
        detail: { outcome },
      }),
    );
  }
}

if (!customElements.get("openclaw-community-invite-card")) {
  customElements.define("openclaw-community-invite-card", OpenClawCommunityInviteCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "openclaw-community-invite-card": OpenClawCommunityInviteCard;
  }
}
