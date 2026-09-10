import { html, nothing } from "lit";
import { renderProviderBrandIcon } from "../../components/provider-icon.ts";
import {
  renderProviderUsageDetails,
  renderProviderWindows,
} from "../../components/provider-usage.ts";
import { t } from "../../i18n/index.ts";
import type { ProviderUsageSummary } from "./data-types.ts";

export function renderUsageLimits(
  providers: ProviderUsageSummary["providers"],
  unavailable: boolean,
  stalled: boolean,
) {
  const notice = stalled
    ? t("usage.providerUsage.stalled")
    : unavailable
      ? t("usage.providerUsage.unavailable")
      : null;
  return html`
    ${notice ? html`<div class="callout warning usage-callout">${notice}</div>` : nothing}
    ${providers.length
      ? html`<section class="usage-limits" aria-label=${t("usage.providerUsage.limits")}>
          <h3 class="usage-limits-title">${t("usage.providerUsage.limits")}</h3>
          <div class="usage-limits-content">
            ${providers.map(
              (provider) => html`
                <article class="usage-limit-provider">
                  <header class="usage-limit-provider-header">
                    <div class="usage-limit-provider-name">
                      ${renderProviderBrandIcon(provider.provider)}
                      <strong>${provider.displayName}</strong>
                      ${provider.plan
                        ? html`<span class="provider-usage-plan">${provider.plan}</span>`
                        : nothing}
                    </div>
                    <span class="provider-usage-card__id"
                      >${
                        provider.provider /* Quotas remain visible when the same snapshot also reports an error. */
                      }</span
                    >
                  </header>
                  <div class="usage-limit-details">
                    <div class="provider-usage-card">
                      ${renderProviderWindows(provider.windows, "provider-usage-windows", true)}
                      ${renderProviderUsageDetails(provider, { showWindows: false })}
                    </div>
                  </div>
                </article>
              `,
            )}
          </div>
        </section>`
      : nothing}
  `;
}
