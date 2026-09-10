import { normalizeLowercaseStringOrEmpty } from "@openclaw/normalization-core/string-coerce";
import { html, nothing } from "lit";
import "../../components/tooltip.ts";
import { t } from "../../i18n/index.ts";
import { formatDurationCompact } from "../../lib/format.ts";
import { formatAnalysisCost, formatUsageTokens } from "./metrics.ts";
import type { UsageInsightStats } from "./metrics.ts";
import type { CostDailyEntry, UsageAggregates, UsageTotals } from "./types.ts";

type SummaryMetric = {
  label: string;
  value: string;
  context: string;
  hint: string;
};

function renderMetric(metric: SummaryMetric, className: string, showContext = true) {
  return html`
    <openclaw-tooltip .content=${`${metric.hint} ${metric.context}`} open-on-click>
      <div class=${className} tabindex="0">
        <dt>${metric.label}</dt>
        <dd>${metric.value}</dd>
        ${showContext ? html`<small>${metric.context}</small>` : nothing}
      </div>
    </openclaw-tooltip>
  `;
}

// The caller supplies daily rows in the same scope as totals, including selected days.
export function renderUsageStats(totals: UsageTotals | null, daily: CostDailyEntry[]) {
  if (!totals) return nothing;
  const empty = t("usage.common.emptyValue");
  const activeDays = new Set(daily.filter((day) => day.totalTokens > 0).map((day) => day.date))
    .size;
  const promptTokens = totals.input + totals.cacheRead + totals.cacheWrite;
  const metrics: SummaryMetric[] = [
    {
      label: t("usage.metrics.tokens"),
      value: formatUsageTokens(totals.totalTokens),
      context: activeDays
        ? t("usage.summary.perActiveDay", {
            value: formatUsageTokens(totals.totalTokens / activeDays),
          })
        : empty,
      hint: `${t("usage.overview.tokensHint")} ${t("usage.summary.activeDaysHint", { count: activeDays.toLocaleString("en-US") })}`,
    },
    {
      label: t("usage.summary.cachedInput"),
      value: formatUsageTokens(totals.cacheRead),
      context: promptTokens
        ? t("usage.summary.promptShare", {
            percent: ((totals.cacheRead / promptTokens) * 100).toFixed(1),
          })
        : empty,
      hint: `${t("usage.overview.cacheHint")} ${formatUsageTokens(totals.cacheRead)} ${t("usage.overview.cached")} · ${formatUsageTokens(promptTokens)} ${t("usage.overview.prompt")}`,
    },
    {
      label: t("usage.summary.uncachedInput"),
      value: formatUsageTokens(totals.input),
      context: t("usage.summary.cacheWrites", { value: formatUsageTokens(totals.cacheWrite) }),
      hint: t("usage.summary.uncachedInputHint"),
    },
    {
      label: t("usage.breakdown.output"),
      value: formatUsageTokens(totals.output),
      context: t("usage.summary.reportedOutput"),
      hint: t("usage.summary.outputHint"),
    },
    {
      label: t("usage.summary.cacheSavings"),
      value: empty,
      context: t("usage.summary.unavailable"),
      hint: t("usage.summary.cacheSavingsHint"),
    },
  ];
  return html`<dl class="usage-stats" aria-label=${t("usage.summary.tokenStats")}>
    ${metrics.map((metric) => renderMetric(metric, "usage-stats-cell"))}
  </dl>`;
}

function buildEfficiencyMetrics(
  totals: UsageTotals,
  aggregates: UsageAggregates,
  stats: UsageInsightStats,
  hasMissingCost: boolean,
) {
  const empty = t("usage.common.emptyValue");
  const messages = aggregates.messages;
  const promptTokens = totals.input + totals.cacheRead + totals.cacheWrite;
  const messageContext = t("usage.overview.acrossMessages", {
    count: messages.total.toLocaleString("en-US"),
  });
  const latency = aggregates.latency;
  const throughput = stats.throughputTokensPerMin;
  const metrics = {
    cache: {
      label: t("usage.overview.cacheHitRate"),
      value: promptTokens ? `${((totals.cacheRead / promptTokens) * 100).toFixed(1)}%` : empty,
      context: `${formatUsageTokens(totals.cacheRead)} ${t("usage.overview.cached")} · ${formatUsageTokens(promptTokens)} ${t("usage.overview.prompt")}`,
      hint: t("usage.overview.cacheHint"),
    },
    cost: {
      label: t("usage.overview.avgCost"),
      value: messages.total
        ? formatAnalysisCost(totals.totalCost / messages.total, totals.missingCostEntries)
        : empty,
      context: messageContext,
      hint: t(hasMissingCost ? "usage.overview.avgCostHintMissing" : "usage.overview.avgCostHint"),
    },
    tokens: {
      label: t("usage.overview.avgTokens"),
      value: messages.total
        ? formatUsageTokens(Math.round(totals.totalTokens / messages.total))
        : empty,
      context: messageContext,
      hint: t("usage.overview.avgTokensHint"),
    },
    throughput: {
      label: t("usage.overview.throughput"),
      value:
        throughput !== undefined
          ? `${throughput > 0 && throughput < 1 ? "<1" : formatUsageTokens(Math.round(throughput))} ${t("usage.overview.tokensPerMinute")}`
          : empty,
      context:
        stats.throughputCostPerMin !== undefined
          ? `${formatAnalysisCost(stats.throughputCostPerMin, totals.missingCostEntries)} ${t("usage.overview.perMinute")}`
          : empty,
      hint: t("usage.overview.throughputHint"),
    },
    latency: {
      label: t("usage.operations.latency"),
      value: latency ? (formatDurationCompact(latency.avgMs) ?? empty) : empty,
      context: latency
        ? t("usage.operations.latencyRange", {
            p95: formatDurationCompact(latency.p95Ms) ?? empty,
            min: formatDurationCompact(latency.minMs) ?? empty,
            max: formatDurationCompact(latency.maxMs) ?? empty,
            count: latency.count.toLocaleString("en-US"),
          })
        : empty,
      hint: t("usage.operations.latencyHint"),
    },
    errorRate: {
      label: t("usage.overview.errorRate"),
      value: messages.total ? `${(stats.errorRate * 100).toFixed(2)}%` : empty,
      context: t("usage.summary.errorsOfMessages", {
        errors: messages.errors.toLocaleString("en-US"),
        messages: messages.total.toLocaleString("en-US"),
      }),
      hint: t("usage.overview.errorHint"),
    },
  } satisfies Record<string, SummaryMetric>;
  return metrics;
}

export function renderUsageEfficiency(
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
  stats: UsageInsightStats,
  hasMissingCost: boolean,
) {
  if (!totals) return nothing;
  const metrics = Object.values(buildEfficiencyMetrics(totals, aggregates, stats, hasMissingCost));
  return html`<section class="usage-efficiency" aria-label=${t("usage.summary.efficiency")}>
    <h3>${t("usage.summary.efficiency")}</h3>
    <dl>${metrics.map((metric) => renderMetric(metric, "usage-efficiency-row", false))}</dl>
    ${hasMissingCost
      ? html`<p class="usage-efficiency-warning" role="note">
          ${t("usage.overview.avgCostHintMissing")}
        </p>`
      : nothing}
  </section>`;
}

export function renderUsageOperations(
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
  stats: UsageInsightStats,
  hasMissingCost: boolean,
  sessionCount: number,
  fullSession = false,
) {
  if (!totals) return nothing;
  const empty = t("usage.common.emptyValue");
  const messages = aggregates.messages;
  const { cache, cost, tokens, throughput, latency, errorRate } = buildEfficiencyMetrics(
    totals,
    aggregates,
    stats,
    hasMissingCost,
  );
  const groups = [
    {
      label: t("usage.operations.activity"),
      metrics: [
        {
          label: t("usage.overview.messages"),
          value: messages.total.toLocaleString("en-US"),
          context: `${messages.user.toLocaleString("en-US")} ${normalizeLowercaseStringOrEmpty(t("usage.overview.user"))} · ${messages.assistant.toLocaleString("en-US")} ${normalizeLowercaseStringOrEmpty(t("usage.overview.assistant"))}`,
          hint: t("usage.overview.messagesHint"),
        },
        {
          label: t("usage.overview.sessions"),
          value: sessionCount.toLocaleString("en-US"),
          context: t("usage.summary.averageDuration", {
            value: stats.durationCount
              ? (formatDurationCompact(stats.avgDurationMs) ?? empty)
              : empty,
          }),
          hint: t("usage.overview.sessionsHint"),
        },
        {
          label: t("usage.overview.toolCalls"),
          value: aggregates.tools.totalCalls.toLocaleString("en-US"),
          context: `${aggregates.tools.uniqueTools.toLocaleString("en-US")} ${t("usage.overview.toolsUsed")} · ${messages.toolResults.toLocaleString("en-US")} ${t("usage.overview.toolResults")}`,
          hint: t("usage.overview.toolCallsHint"),
        },
      ],
    },
    {
      label: t("usage.summary.efficiency"),
      metrics: [
        {
          ...throughput,
          context: stats.durationCount
            ? t("usage.operations.activeTime", {
                value: formatDurationCompact(stats.avgDurationMs * stats.durationCount) ?? empty,
              })
            : empty,
        },
        tokens,
        cache,
        latency,
      ],
    },
    {
      label: t("usage.operations.reliabilityCost"),
      metrics: [
        {
          label: t("usage.overview.errors"),
          value: messages.errors.toLocaleString("en-US"),
          context: t("usage.overview.errorsHint"),
          hint: t("usage.overview.errorHint"),
        },
        errorRate,
        { ...cost, context: throughput.context, hint: `${cost.hint} ${cost.context}` },
      ],
    },
  ];
  return html`<section class="usage-operations" aria-label=${t("usage.operations.title")}>
    <header class="usage-section-heading">
      <h2>${t("usage.operations.title")}</h2>
      ${fullSession ? html`<span class="muted">${t("usage.details.fullSession")}</span>` : nothing}
    </header>
    <div class="usage-operations-grid">
      ${groups.map(
        (group) => html`<section class="usage-operations-group">
          <h3>${group.label}</h3>
          <dl>${group.metrics.map((metric) => renderMetric(metric, "usage-operation-row"))}</dl>
        </section>`,
      )}
    </div>
    ${hasMissingCost
      ? html`<p class="usage-operations-warning" role="note">
          ${t("usage.overview.avgCostHintMissing")}
        </p>`
      : nothing}
  </section>`;
}

export function renderUsageSessionCounters(
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
  stats: UsageInsightStats,
  count: number,
  totalSessions: number,
) {
  if (!totals) return nothing;
  const empty = t("usage.common.emptyValue");
  const messages = aggregates.messages;
  const duration = stats.durationCount
    ? (formatDurationCompact(stats.avgDurationMs) ?? empty)
    : empty;
  const counters = [
    {
      label: t("usage.overview.sessions"),
      value: count,
      hint: `${t("usage.overview.sessionsHint")} ${t("usage.overview.sessionsInRange", { count: totalSessions.toLocaleString("en-US") })} ${t("usage.summary.averageDuration", { value: duration })}`,
    },
    {
      label: t("usage.overview.messages"),
      value: messages.total,
      hint: `${t("usage.overview.messagesHint")} ${messages.user.toLocaleString("en-US")} ${normalizeLowercaseStringOrEmpty(t("usage.overview.user"))} · ${messages.assistant.toLocaleString("en-US")} ${normalizeLowercaseStringOrEmpty(t("usage.overview.assistant"))}`,
    },
    {
      label: t("usage.overview.toolCalls"),
      value: aggregates.tools.totalCalls,
      hint: `${t("usage.overview.toolCallsHint")} ${aggregates.tools.uniqueTools.toLocaleString("en-US")} ${t("usage.overview.toolsUsed")} · ${messages.toolResults.toLocaleString("en-US")} ${t("usage.overview.toolResults")}`,
    },
    {
      label: t("usage.overview.errors"),
      value: messages.errors,
      hint: `${t("usage.overview.errorsHint")} ${t("usage.overview.errorHint")} ${messages.total ? `${(stats.errorRate * 100).toFixed(2)}%` : empty}`,
    },
  ];
  return html`<div class="usage-session-counters">
    ${counters.map(
      (counter) => html`
        <openclaw-tooltip .content=${counter.hint} open-on-click>
          <span tabindex="0"
            ><strong>${counter.value.toLocaleString("en-US")}</strong> ${counter.label}</span
          >
        </openclaw-tooltip>
      `,
    )}
  </div>`;
}
