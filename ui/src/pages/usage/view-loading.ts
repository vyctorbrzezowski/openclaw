import { html } from "lit";
import { t } from "../../i18n/index.ts";

const line = (size = "medium") =>
  html`<div class="skeleton usage-skeleton-line usage-skeleton-line--${size}"></div>`;

const rows = (count: number) =>
  Array.from(
    { length: count },
    () => html`<div class="usage-skeleton-row">${line("long")}${line("short")}</div>`,
  );

export function renderUsageLoadingState() {
  return html`<section
    class="usage-loading-card"
    role="status"
    aria-busy="true"
    aria-label=${t("usage.loading.title")}
  >
    <div class="usage-loading-content" aria-hidden="true">
      <div class="usage-hero">
        <div class="usage-hero-summary">
          <div class="usage-hero-primary">
            <div class="usage-hero-kicker">${line("short")}</div>
            <div class="usage-hero-number">${line("number")}</div>
            <div class="usage-hero-note">${line()}</div>
          </div>
          <div class="usage-hero-secondary">
            <div class="usage-hero-kicker">${line("short")}</div>
            <strong>${line("value")}</strong>
            <div class="usage-loading-secondary-note">${line()}</div>
          </div>
          <div class="usage-hero-controls">${line("control")}${line("control")}</div>
        </div>
        <div class="usage-hero-chart">
          ${line("short")}
          <div class="usage-hero-plot usage-skeleton-chart skeleton"></div>
          <div class="usage-hero-x-axis">${line("short")}${line("short")}${line("short")}</div>
        </div>
        <div class="usage-hero-providers">
          ${Array.from(
            { length: 4 },
            () =>
              html`<div class="usage-loading-fact">${line()}${line("value")}${line("long")}</div>`,
          )}
        </div>
      </div>
      ${Array.from(
        { length: 2 },
        () => html`<div class="usage-loading-section">
          ${line("short")}
          <div class="usage-loading-facts">
            ${Array.from(
              { length: 4 },
              () =>
                html`<div class="usage-loading-fact">
                  ${line()}${line("value")}${line("long")}
                </div>`,
            )}
          </div>
        </div>`,
      )}
      <div class="usage-loading-section">
        ${line("short")}
        <div class="usage-operations-grid">
          ${Array.from(
            { length: 3 },
            () => html`<div class="usage-loading-fact">${line()}${rows(3)}</div>`,
          )}
        </div>
      </div>
      <div class="usage-loading-section">
        ${line("short")}
        <div class="usage-loading-facts">
          ${Array.from(
            { length: 4 },
            () => html`<div class="usage-loading-fact">${line()}${rows(3)}</div>`,
          )}
        </div>
      </div>
      <div class="usage-loading-section">
        ${line("short")}
        <div class="usage-loading-tables">
          ${Array.from(
            { length: 5 },
            () => html`<div class="usage-loading-fact">${line()}${rows(4)}</div>`,
          )}
        </div>
      </div>
      <div class="usage-loading-section">
        ${line("short")}
        <div class="skeleton usage-skeleton-activity"></div>
      </div>
      <div class="usage-loading-section">${line("short")}${rows(6)}</div>
    </div>
    <span class="sr-only">${t("usage.loading.badge")}</span>
  </section>`;
}

export function renderUsageDetailSkeleton(
  variant: "timeline" | "conversation" | "context",
  label: string,
) {
  return html`<div
    class="usage-loading-detail usage-loading-detail--${variant}"
    role="status"
    aria-busy="true"
    aria-label=${label}
  >
    <div class="usage-loading-fact" aria-hidden="true">
      ${variant === "timeline"
        ? html`<div class="skeleton usage-skeleton-chart"></div>
            <div class="usage-skeleton-row">${line()}${line()}</div>`
        : variant === "conversation"
          ? Array.from(
              { length: 3 },
              () =>
                html`<div class="usage-loading-message">
                  ${line("short")}${line("long")}${line()}
                </div>`,
            )
          : html`${line("long")}${rows(4)}`}
    </div>
    <span class="sr-only">${t("usage.loading.badge")}</span>
  </div>`;
}
