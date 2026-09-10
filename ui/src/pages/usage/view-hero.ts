import { html, nothing, svg } from "lit";
import { icons } from "../../components/icons.ts";
import { renderProviderBrandIcon, providerDisplayLabel } from "../../components/provider-icon.ts";
import { renderSettingsSegmented } from "../../components/settings-ui.ts";
import "../../components/tooltip.ts";
import { t } from "../../i18n/index.ts";
import { smoothPath } from "./chart-path.ts";
import {
  formatAnalysisCost,
  formatFullDate,
  formatDayLabel,
  formatUsageTokens,
  USAGE_TOKEN_CATEGORIES,
} from "./metrics.ts";
import type { CostDailyEntry, UsageAggregates, UsageSessionEntry, UsageTotals } from "./types.ts";

type HeroProps = {
  daily: CostDailyEntry[];
  sessions: UsageSessionEntry[];
  aggregates: UsageAggregates;
  totals: UsageTotals | null;
  selectedDays: string[];
  chartMode: "cost" | "tokens";
  dailyChartMode: "total" | "by-type" | "by-provider";
  onDailyChartModeChange: (mode: "total" | "by-type" | "by-provider") => void;
  onChartModeChange: (mode: "cost" | "tokens") => void;
  onSelectDay: (day: string, shiftKey: boolean) => void;
  timeZone: "local" | "utc";
};

type ProviderAmount = { cost: number; tokens: number };
const UNKNOWN = "";

function focusHeroDay(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLButtonElement)) return;
  const buttons = [
    ...(target.closest(".usage-hero-hit-layer")?.querySelectorAll<HTMLButtonElement>("button") ??
      []),
  ];
  const index = buttons.indexOf(target);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : index + (event.key === "ArrowRight" ? 1 : -1);
  event.preventDefault();
  buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
}

export function renderUsageHero(props: HeroProps) {
  const isTokens = props.chartMode === "tokens";
  const metric = isTokens ? "tokens" : "cost";
  const byType = props.dailyChartMode === "by-type";
  const format = (value: number) =>
    isTokens ? formatUsageTokens(value) : formatAnalysisCost(value);
  const providerLabel = (provider: string) =>
    provider ? providerDisplayLabel(provider) : t("usage.hero.unattributed");
  const selected = new Set(props.selectedDays);
  const daily = props.daily.toSorted((a, b) => a.date.localeCompare(b.date));
  const models =
    props.aggregates.modelDaily ??
    props.sessions.flatMap((session) => session.usage?.dailyModelUsage ?? []);
  const byDate = new Map<string, Map<string, ProviderAmount>>();
  for (const entry of models) {
    const providers = byDate.get(entry.date) ?? new Map<string, ProviderAmount>();
    const provider = entry.provider ?? UNKNOWN;
    const amount = providers.get(provider) ?? { cost: 0, tokens: 0 };
    amount.cost += entry.cost;
    amount.tokens += entry.tokens;
    providers.set(provider, amount);
    byDate.set(entry.date, providers);
  }
  let incomplete = false;
  const days = daily.map((day) => {
    const providers = new Map(byDate.get(day.date));
    const recorded = { cost: day.totalCost, tokens: day.totalTokens };
    const attributed = [...providers.values()].reduce((sum, value) => sum + value[metric], 0);
    // A daily aggregate can cover more rows than the returned session page. Never
    // distribute its residual or scale provider records to manufacture attribution.
    if (attributed > recorded[metric] + Math.max(1e-9, recorded[metric] * 1e-9)) {
      providers.clear();
      providers.set(UNKNOWN, recorded);
      incomplete = true;
    } else {
      const sums = [...providers.values()].reduce(
        (sum, value) => ({ cost: sum.cost + value.cost, tokens: sum.tokens + value.tokens }),
        { cost: 0, tokens: 0 },
      );
      const residual = {
        cost: Math.max(0, recorded.cost - sums.cost),
        tokens: Math.max(0, recorded.tokens - sums.tokens),
      };
      if (residual[metric] > Math.max(1e-9, recorded[metric] * 1e-9)) {
        const unknown = providers.get(UNKNOWN) ?? { cost: 0, tokens: 0 };
        providers.set(UNKNOWN, {
          cost: unknown.cost + residual.cost,
          tokens: unknown.tokens + residual.tokens,
        });
        incomplete = true;
      }
    }
    return { day, providers, value: recorded[metric] };
  });
  const scopedDays = selected.size ? days.filter(({ day }) => selected.has(day.date)) : days;
  const total = selected.size
    ? scopedDays.reduce((sum, day) => sum + day.value, 0)
    : props.totals
      ? isTokens
        ? props.totals.totalTokens
        : props.totals.totalCost
      : null;
  const providerTotals = new Map<string, ProviderAmount>();
  for (const { providers } of scopedDays) {
    for (const [provider, amount] of providers) {
      const previous = providerTotals.get(provider) ?? { cost: 0, tokens: 0 };
      providerTotals.set(provider, {
        cost: previous.cost + amount.cost,
        tokens: previous.tokens + amount.tokens,
      });
    }
  }
  // Period attribution remains valid when daily provider attribution is unavailable.
  if (!selected.size && !models.length && props.aggregates.byProvider.length) {
    providerTotals.clear();
    for (const entry of props.aggregates.byProvider) {
      const provider = entry.provider ?? UNKNOWN;
      const previous = providerTotals.get(provider) ?? { cost: 0, tokens: 0 };
      providerTotals.set(provider, {
        cost: previous.cost + entry.totals.totalCost,
        tokens: previous.tokens + entry.totals.totalTokens,
      });
    }
    if (props.totals) {
      const assigned = [...providerTotals.values()].reduce(
        (sum, amount) => ({ cost: sum.cost + amount.cost, tokens: sum.tokens + amount.tokens }),
        { cost: 0, tokens: 0 },
      );
      const residual = {
        cost: Math.max(0, props.totals.totalCost - assigned.cost),
        tokens: Math.max(0, props.totals.totalTokens - assigned.tokens),
      };
      if (residual[metric] > Math.max(1e-9, (total ?? 0) * 1e-9)) {
        const unknown = providerTotals.get(UNKNOWN) ?? { cost: 0, tokens: 0 };
        providerTotals.set(UNKNOWN, {
          cost: unknown.cost + residual.cost,
          tokens: unknown.tokens + residual.tokens,
        });
      }
    }
  }
  const ranked = [...providerTotals].toSorted((a, b) => b[1][metric] - a[1][metric]);
  const providerIds = [...new Set(days.flatMap(({ providers }) => [...providers.keys()]))];
  const seriesIds = providerIds
    .filter((id) => id !== UNKNOWN)
    .toSorted((a, b) => a.localeCompare(b));
  if (providerIds.includes(UNKNOWN)) seriesIds.push(UNKNOWN);
  const components = days.map(({ day }) =>
    USAGE_TOKEN_CATEGORIES.reduce(
      (sum, category) => sum + day[isTokens ? category.key : category.costKey],
      0,
    ),
  );
  const chartValues = days.map(({ value }, index) => (byType ? components[index] : value));
  const exceedsReported =
    byType &&
    days.some(({ value }, index) => components[index] > value + Math.max(1e-10, value * 1e-10));
  const peak = Math.max(0, ...chartValues);
  const positive = chartValues.filter((value) => value > 0);
  const compressed = positive.length > 0 && peak / Math.min(...positive) > 50;
  const rawStep = (peak || 1) / 2;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    (rawStep <= magnitude ? 1 : rawStep <= 2 * magnitude ? 2 : rawStep <= 5 * magnitude ? 5 : 10) *
    magnitude;
  const maximum = step * 2;
  const width = 800;
  const height = 240;
  // Calendar labels are already bucketed in the selected zone. UTC parsing
  // preserves their day spacing without introducing 23/25-hour DST intervals.
  const dates = days.map(({ day }) => Date.parse(`${day.date}T00:00:00Z`));
  const firstDate = dates[0] ?? 0;
  const lastDate = dates.at(-1) ?? firstDate;
  const dateSpan = lastDate - firstDate;
  const xs = dates.map((date) => (dateSpan ? ((date - firstDate) / dateSpan) * width : width / 2));
  const spansYears = new Date(firstDate).getUTCFullYear() !== new Date(lastDate).getUTCFullYear();
  const xLabels = days.length
    ? [firstDate, firstDate + Math.floor(dateSpan / 86400000 / 2) * 86400000, lastDate]
    : [];
  const providerSeries = seriesIds.map((provider, index) => ({
    provider,
    label: providerLabel(provider),
    values: days.map(({ providers }) => providers.get(provider)?.[metric] ?? 0),
    color:
      provider === UNKNOWN
        ? "var(--muted)"
        : `oklch(from var(--usage-data-accent, var(--info)) l c calc(h + ${index * 137.508}))`,
  }));
  const chartSeries = byType
    ? USAGE_TOKEN_CATEGORIES.map((category) => ({
        label: t(category.labelKey),
        values: days.map(({ day }) => day[isTokens ? category.key : category.costKey]),
        color: `var(${category.color})`,
      }))
    : props.dailyChartMode === "by-provider"
      ? providerSeries
      : [
          {
            label: t("usage.daily.total"),
            values: chartValues,
            color: "var(--usage-data-accent, var(--info))",
          },
        ];
  const cumulative = new Array<number>(days.length).fill(0);
  const series = chartSeries.map((entry) => {
    const lower = [...cumulative];
    entry.values.forEach((value, index) => (cumulative[index] += value));
    return { ...entry, lower, upper: [...cumulative] };
  });
  const now = new Date();
  const today =
    props.timeZone === "utc"
      ? now.toISOString().slice(0, 10)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayIndex = days.findIndex(({ day }) => day.date === today);
  const partialX =
    todayIndex < 0
      ? width
      : dateSpan
        ? Math.max(
            0,
            Math.min(width, ((dates[todayIndex] - 86400000 - firstDate) / dateSpan) * width),
          )
        : 0;
  const axisFormat = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumSignificantDigits: 3,
  });
  const missingCostEntries = selected.size
    ? scopedDays.reduce((sum, { day }) => sum + day.missingCostEntries, 0)
    : (props.totals?.missingCostEntries ?? 0);
  const displayed =
    total === null
      ? t("usage.common.emptyValue")
      : isTokens
        ? formatUsageTokens(total)
        : formatAnalysisCost(total, missingCostEntries);
  const decimalIndex = displayed.lastIndexOf(".");
  const scopedTokens = selected.size
    ? scopedDays.reduce((sum, { day }) => sum + day.totalTokens, 0)
    : props.totals?.totalTokens;
  const activeDays = new Set(
    scopedDays.filter(({ day }) => day.totalTokens > 0).map(({ day }) => day.date),
  ).size;
  const perActiveDay =
    activeDays && scopedTokens != null
      ? t("usage.summary.perActiveDay", { value: formatUsageTokens(scopedTokens / activeDays) })
      : t("usage.common.emptyValue");
  const activeDaysHint = t("usage.summary.activeDaysHint", {
    count: activeDays.toLocaleString("en-US"),
  });
  const scopedCost = selected.size
    ? scopedDays.reduce((sum, { day }) => sum + day.totalCost, 0)
    : props.totals?.totalCost;
  const renderProvider = ([provider, amount]: [string, ProviderAmount]) => {
    const share = total && amount[metric] <= total ? (amount[metric] / total) * 100 : null;
    const color =
      providerSeries.find((entry) => entry.provider === provider)?.color ?? "var(--muted)";
    return html`<div class="usage-hero-provider" style=${`--series-color:${color}`}>
      <div class="usage-hero-provider-line">
        <span
          >${renderProviderBrandIcon(provider || "?")}<strong
            >${providerLabel(provider)}</strong
          ></span
        >
        <span>${share === null ? nothing : `${share.toFixed(1)}%`}</span>
      </div>
      <div class="usage-hero-provider-values">
        <strong>${format(amount[metric])}</strong>
        <small
          >${isTokens
            ? formatAnalysisCost(amount.cost)
            : `${formatUsageTokens(amount.tokens)} ${t("usage.metrics.tokens")}`}</small
        >
      </div>
      <div class="usage-hero-provider-track" aria-hidden="true">
        <span style=${`width: ${share ?? 0}%`}></span>
      </div>
    </div>`;
  };
  return html`<section class="usage-hero">
    <div class="usage-hero-summary">
      <div class="usage-hero-primary">
        <div class="usage-hero-kicker">
          ${t(isTokens ? "usage.metrics.tokens" : "usage.metrics.cost")}
        </div>
        <div class="usage-hero-number">
          ${decimalIndex < 0
            ? displayed
            : html`${displayed.slice(0, decimalIndex)}<span class="usage-hero-decimals"
                  >${displayed.slice(decimalIndex)}</span
                >`}
        </div>
        <openclaw-tooltip
          .content=${t(isTokens ? "usage.overview.tokensHint" : "usage.overview.costHint")}
          ><p class="usage-hero-note" tabindex="0">
            ${t(isTokens ? "usage.hero.recordedTokens" : "usage.hero.recordedCost")}
          </p></openclaw-tooltip
        >
      </div>
      <div class="usage-hero-secondary">
        <div class="usage-hero-kicker">
          ${t(isTokens ? "usage.metrics.cost" : "usage.metrics.tokens")}
        </div>
        <strong
          >${isTokens
            ? scopedCost == null
              ? t("usage.common.emptyValue")
              : formatAnalysisCost(scopedCost, missingCostEntries)
            : scopedTokens == null
              ? t("usage.common.emptyValue")
              : formatUsageTokens(scopedTokens)}</strong
        >
        <openclaw-tooltip
          .content=${`${t("usage.overview.tokensHint")} ${activeDaysHint}`}
          open-on-click
        >
          <small tabindex="0"
            >${props.sessions.length.toLocaleString("en-US")} ${t("usage.overview.sessions")} ·
            ${perActiveDay}</small
          >
        </openclaw-tooltip>
      </div>
      <div class="usage-hero-controls">
        ${renderSettingsSegmented({
          mode: "buttons",
          ariaLabel: t("usage.analytics.chartMetric"),
          value: props.chartMode,
          onChange: props.onChartModeChange,
          options: [
            { value: "cost", label: t("usage.metrics.cost") },
            { value: "tokens", label: t("usage.metrics.tokens") },
          ],
        })}
        <div class="usage-hero-display-selector">
          <select
            aria-label=${t("usage.daily.display")}
            .value=${props.dailyChartMode}
            @change=${(event: Event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              if (value === "total" || value === "by-type" || value === "by-provider")
                props.onDailyChartModeChange(value);
            }}
          >
            <option value="total">${t("usage.daily.total")}</option>
            <option value="by-type">${t("usage.daily.byType")}</option>
            <option value="by-provider">${t("usage.dimensions.providers")}</option></select
          >${icons.chevronDown}
        </div>
      </div>
    </div>
    <div class="usage-hero-chart">
      <div class="usage-hero-chart-header">
        <h2>${t(isTokens ? "usage.hero.dailyTokens" : "usage.hero.dailyCost")}</h2>
        ${props.dailyChartMode !== "total"
          ? html`<div class="usage-hero-legend">
              ${series.map(
                ({ label, color }) =>
                  html`<span
                    class="usage-hero-legend-item"
                    style=${`--series-color:${color}`}
                    title=${label}
                    ><span class="usage-hero-tooltip-dot" style=${`background:${color}`}></span
                    ><span class="usage-hero-legend-name">${label}</span></span
                  >`,
              )}
            </div>`
          : nothing}
      </div>
      ${days.length
        ? html`<div class="usage-hero-plot">
            <div class="usage-hero-y-axis">
              ${[maximum, compressed ? maximum / 4 : maximum / 2, 0].map(
                (value) =>
                  html`<span
                    >${isTokens ? "" : "$"}${axisFormat.format(value).replace("K", "k")}</span
                  >`,
              )}
            </div>
            <div class="usage-hero-canvas">
              <svg viewBox="0 0 800 240" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <clipPath id="usage-hero-complete">
                    <rect width=${partialX} height=${height}></rect>
                  </clipPath>
                  <clipPath id="usage-hero-partial">
                    <rect x=${partialX} width=${width - partialX} height=${height}></rect>
                  </clipPath>
                  ${series.map(
                    ({ color }, i) =>
                      svg`<linearGradient id=${`usage-hero-gradient-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color=${color} stop-opacity=".36"></stop><stop offset="100%" stop-color=${color} stop-opacity=".025"></stop></linearGradient>`,
                  )}
                </defs>
                ${[0, height / 2, height].map(
                  (y) =>
                    svg`<line class="usage-hero-gridline" x1="0" x2=${width} y1=${y} y2=${y}></line>`,
                )}
                ${series.map(({ upper, lower, color }, i) => {
                  const top = smoothPath(upper, xs, width, height, maximum, compressed);
                  const bottom = smoothPath(
                    lower.toReversed(),
                    xs.toReversed().map((x) => width - x),
                    width,
                    height,
                    maximum,
                    compressed,
                  );
                  // Reflect the reversed lower boundary to close the band without changing its interpolation.
                  return svg`<path d=${`${top} L${width},${height} L0,${height} Z`} fill=${`url(#usage-hero-gradient-${i})`} mask=${`url(#usage-hero-band-${i})`}></path>
                <mask id=${`usage-hero-band-${i}`}><rect width=${width} height=${height} fill="white"></rect><path d=${`${bottom} L${width},${height} L0,${height} Z`} transform=${`translate(${width},0) scale(-1,1)`} fill="black"></path></mask>
                <path d=${top} fill="none" stroke=${color} stroke-width="2" vector-effect="non-scaling-stroke" clip-path="url(#usage-hero-complete)"></path>
                <path d=${top} fill="none" stroke=${color} stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" clip-path="url(#usage-hero-partial)"></path>`;
                })}
              </svg>
              <div class="usage-hero-hit-layer">
                ${days.map(({ day, providers }, i) => {
                  const left = i === 0 ? 0 : (xs[i - 1] + xs[i]) / 2;
                  const right = i === days.length - 1 ? width : (xs[i] + xs[i + 1]) / 2;
                  const context = isTokens
                    ? formatAnalysisCost(day.totalCost, day.missingCostEntries)
                    : `${formatUsageTokens(day.totalTokens)} ${t("usage.metrics.tokens")}`;
                  const tooltip = [
                    formatFullDate(day.date),
                    ...seriesIds.map(
                      (provider) =>
                        `${providerLabel(provider)}: ${format(providers.get(provider)?.[metric] ?? 0)}`,
                    ),
                    `${t("usage.breakdown.total")}: ${isTokens ? formatUsageTokens(day.totalTokens) : formatAnalysisCost(day.totalCost, day.missingCostEntries)}`,
                    ...USAGE_TOKEN_CATEGORIES.map(
                      ({ key, costKey, labelKey }) =>
                        `${t(labelKey)}: ${formatUsageTokens(day[key])} ${t("usage.metrics.tokens")} · ${formatAnalysisCost(day[costKey])}`,
                    ),
                    context,
                    day.date === today ? t("usage.hero.partialToday") : "",
                  ]
                    .filter(Boolean)
                    .join("\n");
                  return html`<openclaw-tooltip placement="right"
                    ><button
                      type="button"
                      class="usage-hero-day"
                      style=${`left:${(left / width) * 100}%;width:${((right - left) / width) * 100}%`}
                      data-usage-day=${day.date}
                      aria-label=${tooltip}
                      aria-pressed=${selected.has(day.date)}
                      @click=${(event: MouseEvent) => props.onSelectDay(day.date, event.shiftKey)}
                      @keydown=${(event: KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          props.onSelectDay(day.date, event.shiftKey);
                        } else focusHeroDay(event);
                      }}
                    ></button>
                    <div slot="content" class="usage-hero-tooltip">
                      <strong>${formatFullDate(day.date)}</strong>
                      <dl>
                        ${providerSeries.map(
                          ({ provider, color }) => html`<div>
                            <dt>
                              <span
                                class="usage-hero-tooltip-dot"
                                style=${`background:${color}`}
                              ></span
                              >${providerLabel(provider)}
                            </dt>
                            <dd>${format(providers.get(provider)?.[metric] ?? 0)}</dd>
                          </div>`,
                        )}
                        ${USAGE_TOKEN_CATEGORIES.map(
                          ({ key, costKey, labelKey, color }) =>
                            html`<div>
                              <dt>
                                <span
                                  class="usage-hero-tooltip-dot"
                                  style=${`background:var(${color})`}
                                ></span
                                >${t(labelKey)}
                              </dt>
                              <dd>
                                ${formatUsageTokens(day[key])} · ${formatAnalysisCost(day[costKey])}
                              </dd>
                            </div>`,
                        )}
                        <div class="usage-hero-tooltip-total">
                          <dt>${t("usage.breakdown.total")}</dt>
                          <dd>
                            ${isTokens
                              ? formatUsageTokens(day.totalTokens)
                              : formatAnalysisCost(day.totalCost, day.missingCostEntries)}
                          </dd>
                        </div>
                      </dl>
                      <small>${context}</small>
                      ${day.date === today
                        ? html`<small>${t("usage.hero.partialToday")}</small>`
                        : nothing}
                    </div>
                  </openclaw-tooltip>`;
                })}
              </div>
            </div>
            <div class="usage-hero-x-axis">
              ${xLabels.map(
                (date) =>
                  html`<span
                    >${formatDayLabel(new Date(date).toISOString().slice(0, 10), spansYears)}</span
                  >`,
              )}
            </div>
          </div>`
        : html`<p class="usage-hero-empty">${t("usage.analytics.noDailyData")}</p>`}
      ${exceedsReported
        ? html`<p class="usage-hero-note">${t("usage.analytics.componentTotals")}</p>`
        : nothing}
      ${incomplete
        ? html`<p class="usage-hero-note">${t("usage.hero.partialAttribution")}</p>`
        : nothing}
      ${compressed
        ? html`<p class="usage-hero-note">${t("usage.daily.compressedScaleHint")}</p>`
        : nothing}
      ${todayIndex >= 0
        ? html`<p class="usage-hero-note usage-hero-partial-note">
            ${t("usage.hero.partialToday")}
          </p>`
        : nothing}
    </div>
    <div class="usage-hero-providers">${ranked.map(renderProvider)}</div>
  </section>`;
}
