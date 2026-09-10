import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import {
  renderProviderBrandIcon,
  renderProviderFallbackIcon,
} from "../../components/provider-icon.ts";
import "../../components/tooltip.ts";
import { t } from "../../i18n/index.ts";
import { OpenClawLightDomElement } from "../../lit/openclaw-element.ts";
import {
  formatAnalysisCost,
  formatDayLabel,
  formatUsageTokens,
  type buildPeakErrorHours,
} from "./metrics.ts";
import type { UsageAggregates, UsageTotals } from "./types.ts";

const dimensions = ["model", "provider", "agent", "channel", "tool"] as const;
type Dimension = (typeof dimensions)[number] | "errors";
type Sort = "cost" | "tokens" | "errors" | "errorRate" | "date" | "calls";
type SortState = { key: Sort; ascending: boolean };
const titleKeys = {
  model: "models",
  provider: "providers",
  agent: "agents",
  channel: "channels",
  tool: "tools",
} as const;

export type UsageDimensionsProps = {
  mode?: "all" | "rankings" | "errors";
  aggregates: UsageAggregates;
  totals: UsageTotals | null;
  showCostShares: boolean;
  selectedDays: string[];
  onSelectDay: (day: string, shiftKey: boolean) => void;
  errorHours: ReturnType<typeof buildPeakErrorHours>;
};

type DimensionRow = {
  name: string;
  provider?: string;
  cost: number;
  tokens: number;
  missingCost?: number;
  calls?: number;
  messages?: number;
};

class UsageDimensions extends OpenClawLightDomElement {
  @property({ attribute: false }) props?: UsageDimensionsProps;
  @state() private sorts: Record<Dimension, SortState> = {
    model: { key: "cost", ascending: false },
    provider: { key: "cost", ascending: false },
    agent: { key: "cost", ascending: false },
    channel: { key: "cost", ascending: false },
    tool: { key: "calls", ascending: false },
    errors: { key: "errorRate", ascending: false },
  };

  private header(dimension: Dimension, label: string, sort?: Sort) {
    const current = this.sorts[dimension];
    return html`<th
      scope="col"
      aria-sort=${sort === current.key ? (current.ascending ? "ascending" : "descending") : "none"}
    >
      ${sort
        ? html`<button
            type="button"
            @click=${() => {
              this.sorts = {
                ...this.sorts,
                [dimension]: {
                  key: sort,
                  ascending: current.key === sort ? !current.ascending : false,
                },
              };
            }}
          >
            ${label}${current.key === sort ? (current.ascending ? " ↑" : " ↓") : ""}
          </button>`
        : label}
    </th>`;
  }

  private rows(
    dimension: Exclude<Dimension, "errors">,
    aggregates: UsageAggregates,
  ): DimensionRow[] {
    switch (dimension) {
      case "model":
      case "provider":
        return (dimension === "model" ? aggregates.byModel : aggregates.byProvider).map(
          (entry) => ({
            name:
              (dimension === "model" ? entry.model : entry.provider) ?? t("usage.common.unknown"),
            provider: entry.provider,
            cost: entry.totals.totalCost,
            tokens: entry.totals.totalTokens,
            missingCost: entry.totals.missingCostEntries,
            messages: entry.count,
          }),
        );
      case "agent":
        return aggregates.byAgent.map((entry) => ({
          name: entry.agentId,
          cost: entry.totals.totalCost,
          tokens: entry.totals.totalTokens,
          missingCost: entry.totals.missingCostEntries,
        }));
      case "channel":
        return aggregates.byChannel.map((entry) => ({
          name: entry.channel,
          cost: entry.totals.totalCost,
          tokens: entry.totals.totalTokens,
          missingCost: entry.totals.missingCostEntries,
        }));
      case "tool":
        return aggregates.tools.tools.map((entry) => ({
          name: entry.name,
          calls: entry.count,
          cost: 0,
          tokens: 0,
        }));
    }
  }

  private renderDimension(dimension: Exclude<Dimension, "errors">, props: UsageDimensionsProps) {
    const tool = dimension === "tool";
    const shares = tool || (props.showCostShares && props.selectedDays.length === 0);
    const current = this.sorts[dimension];
    const value = (row: DimensionRow) =>
      current.key === "calls" ? (row.calls ?? 0) : current.key === "tokens" ? row.tokens : row.cost;
    const rows = this.rows(dimension, props.aggregates).toSorted(
      (a, b) =>
        (value(a) - value(b)) * (current.ascending ? 1 : -1) || a.name.localeCompare(b.name),
    );
    const title = t(`usage.dimensions.${titleKeys[dimension]}`);
    return html`<section class="usage-dimensions" data-dimension=${dimension} aria-label=${title}>
      <header class="usage-dimensions__header"><h3>${title}</h3></header>
      <div class="usage-dimensions__body">
        ${rows.length === 0
          ? html`<p class="usage-dimensions__empty">${t(`usage.dimensions.empty.${dimension}`)}</p>`
          : html` <table class="usage-dimensions__table" aria-label=${title}>
              <thead>
                <tr>
                  ${this.header(dimension, t("usage.dimensions.name"))}
                  ${this.header(
                    dimension,
                    t(tool ? "usage.dimensions.calls" : "usage.dimensions.cost"),
                    tool ? "calls" : "cost",
                  )}
                  ${shares ? this.header(dimension, t("usage.dimensions.share")) : nothing}
                  ${!tool
                    ? this.header(dimension, t("usage.dimensions.tokens"), "tokens")
                    : nothing}
                </tr>
              </thead>
              <tbody>
                ${rows.map((row) => {
                  const denominator = tool
                    ? props.aggregates.tools.totalCalls
                    : (props.totals?.totalCost ?? 0);
                  const hint = [
                    row.name,
                    row.provider,
                    row.messages === undefined
                      ? null
                      : t(
                          row.messages === 1
                            ? "usage.dimensions.messageHint"
                            : "usage.dimensions.messagesHint",
                          { count: row.messages.toLocaleString("en-US") },
                        ),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return html`<tr>
                    <th scope="row">
                      <openclaw-tooltip .content=${hint}
                        ><span class="usage-dimensions__name" tabindex="0">
                          ${dimension === "model" || dimension === "provider"
                            ? row.provider
                              ? renderProviderBrandIcon(row.provider, {
                                  className: "usage-dimensions__icon",
                                })
                              : renderProviderFallbackIcon(row.name, {
                                  className: "usage-dimensions__icon",
                                })
                            : nothing}
                          <span>${row.name}</span>
                        </span></openclaw-tooltip
                      >
                    </th>
                    <td data-label=${t(tool ? "usage.dimensions.calls" : "usage.dimensions.cost")}>
                      ${tool
                        ? row.calls?.toLocaleString("en-US")
                        : formatAnalysisCost(row.cost, row.missingCost)}
                    </td>
                    ${shares
                      ? html`<td data-label=${t("usage.dimensions.share")}>
                          ${denominator > 0
                            ? `${(((tool ? (row.calls ?? 0) : row.cost) / denominator) * 100).toFixed(1)}%`
                            : t("usage.common.emptyValue")}
                        </td>`
                      : nothing}
                    ${!tool
                      ? html`<td data-label=${t("usage.dimensions.tokens")}>
                          ${formatUsageTokens(row.tokens)}
                        </td>`
                      : nothing}
                  </tr>`;
                })}
              </tbody>
            </table>`}
      </div>
    </section>`;
  }

  private renderErrors(props: UsageDimensionsProps) {
    const current = this.sorts.errors;
    const days = props.aggregates.daily
      .filter((day) => day.messages > 0 && day.errors > 0)
      .map((day) => ({ ...day, rate: day.errors / day.messages }))
      .toSorted((a, b) => b.rate - a.rate)
      .slice(0, 5)
      .toSorted((a, b) => {
        const comparison =
          current.key === "date"
            ? a.date.localeCompare(b.date)
            : current.key === "errors"
              ? a.errors - b.errors
              : a.rate - b.rate;
        return comparison * (current.ascending ? 1 : -1) || a.date.localeCompare(b.date);
      });
    return html`<section
      class="usage-dimensions"
      data-dimension="errors"
      aria-label=${t("usage.dimensions.errors")}
    >
      <header class="usage-dimensions__header"><h3>${t("usage.dimensions.errors")}</h3></header>
      <div class="usage-dimensions__errors-grid">
        <section>
          <h4>${t("usage.overview.peakErrorDays")}</h4>
          ${days.length === 0
            ? html`<p class="usage-dimensions__empty">${t("usage.overview.noErrorData")}</p>`
            : html` <div class="usage-dimensions__body">
                <table
                  class="usage-dimensions__table"
                  aria-label=${t("usage.overview.peakErrorDays")}
                >
                  <thead>
                    <tr>
                      ${this.header("errors", t("usage.dimensions.period"), "date")}${this.header(
                        "errors",
                        t("usage.dimensions.errorRate"),
                        "errorRate",
                      )}${this.header("errors", t("usage.dimensions.errorsMessages"), "errors")}
                    </tr>
                  </thead>
                  <tbody>
                    ${days.map((day) => {
                      const context = `${t(day.errors === 1 ? "usage.overview.errorCountOne" : "usage.overview.errorCountOther", { count: day.errors.toLocaleString("en-US") }).replaceAll(" ", "\u00a0")} · ${formatUsageTokens(day.messages)}\u00a0${t("usage.overview.messagesAbbrev")}`;
                      return html`<tr
                        class=${props.selectedDays.includes(day.date) ? "is-selected" : ""}
                      >
                        <th scope="row">
                          <openclaw-tooltip
                            .content=${`${day.date} · ${context} · ${formatUsageTokens(day.tokens)} ${t("usage.metrics.tokens")} · ${formatAnalysisCost(day.cost)}`}
                            ><button
                              type="button"
                              class="usage-dimensions__name"
                              aria-pressed=${props.selectedDays.includes(day.date)}
                              @click=${(event: MouseEvent) =>
                                props.onSelectDay(day.date, event.shiftKey)}
                            >
                              ${formatDayLabel(day.date)}
                            </button></openclaw-tooltip
                          >
                        </th>
                        <td data-label=${t("usage.dimensions.errorRate")}>
                          ${(day.rate * 100).toFixed(2)}%
                        </td>
                        <td
                          class="usage-dimensions__error-context"
                          data-label=${t("usage.dimensions.errorsMessages")}
                        >
                          ${context}
                        </td>
                      </tr>`;
                    })}
                  </tbody>
                </table>
              </div>`}
        </section>
        <section>
          <h4>${t("usage.overview.peakErrorHours")}</h4>
          ${props.errorHours.length === 0
            ? html`<p class="usage-dimensions__empty">${t("usage.overview.noErrorData")}</p>`
            : html` <div class="usage-dimensions__body">
                <table
                  class="usage-dimensions__table"
                  aria-label=${t("usage.overview.peakErrorHours")}
                >
                  <thead>
                    <tr>
                      <th scope="col">${t("usage.dimensions.period")}</th>
                      <th scope="col">${t("usage.dimensions.errorRate")}</th>
                      <th scope="col">${t("usage.dimensions.errorsMessages")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${props.errorHours.map(
                      (hour) =>
                        html`<tr>
                          <th scope="row">${hour.label}</th>
                          <td data-label=${t("usage.dimensions.errorRate")}>${hour.value}</td>
                          <td
                            class="usage-dimensions__error-context"
                            data-label=${t("usage.dimensions.errorsMessages")}
                          >
                            ${hour.sub}
                          </td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>`}
        </section>
      </div>
    </section>`;
  }

  protected override render() {
    const props = this.props;
    if (!props) return nothing;
    return html`<div class="usage-dimensions-grid">
      ${props.mode !== "errors"
        ? dimensions.map((dimension) => this.renderDimension(dimension, props))
        : nothing}
      ${props.mode !== "rankings" ? this.renderErrors(props) : nothing}
    </div>`;
  }
}

if (!customElements.get("openclaw-usage-dimensions")) {
  customElements.define("openclaw-usage-dimensions", UsageDimensions);
}

export function renderUsageDimensions(props: UsageDimensionsProps) {
  return html`<openclaw-usage-dimensions .props=${props}></openclaw-usage-dimensions>`;
}
