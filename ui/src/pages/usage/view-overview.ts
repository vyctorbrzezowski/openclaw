import { normalizeLowercaseStringOrEmpty } from "@openclaw/normalization-core/string-coerce";
import { truncateUtf16Safe } from "@openclaw/normalization-core/utf16-slice";
import { html, nothing, type TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";
import { renderCopyButton } from "../../components/copy-button.ts";
import { renderProviderBrandIcon } from "../../components/provider-icon.ts";
import { renderSettingsSegmented } from "../../components/settings-ui.ts";
import { t } from "../../i18n/index.ts";
import "../../components/tooltip.ts";
import { formatDurationCompact } from "../../lib/format.ts";
import {
  buildUsageCostWindows,
  buildUsageCostWindowSummary,
  formatAnalysisCost,
  USAGE_TOKEN_CATEGORIES,
  formatDayLabel,
  formatIsoDate,
  formatUsageTokens,
} from "./metrics.ts";
import type { UsageInsightStats } from "./metrics.ts";
import type {
  UsageAggregates,
  UsageProps,
  UsageColumnId,
  UsageSessionEntry,
  UsageTotals,
  CostDailyEntry,
} from "./types.ts";

function pct(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}

function renderFilterChips({
  data,
  filters,
  callbacks,
}: {
  data: Pick<UsageProps["data"], "sessions">;
  filters: Pick<
    UsageProps["filters"],
    "selectedDays" | "selectedHours" | "selectedSessions" | "agentId"
  >;
  callbacks: {
    filters: Pick<
      UsageProps["callbacks"]["filters"],
      "onClearDays" | "onClearHours" | "onClearSessions" | "onClearFilters" | "onAgentChange"
    >;
  };
}) {
  const { selectedDays, selectedHours, selectedSessions, agentId } = filters;
  const { sessions } = data;
  const { onClearDays, onClearHours, onClearSessions, onClearFilters, onAgentChange } =
    callbacks.filters;
  const hasSelections =
    selectedDays.length > 0 || selectedHours.length > 0 || selectedSessions.length > 0;
  if (!hasSelections && !agentId) {
    return nothing;
  }

  const selectedSessionKey = selectedSessions.at(0) ?? "";
  const selectedSession =
    selectedSessions.length === 1 ? sessions.find((s) => s.key === selectedSessionKey) : null;
  const sessionsLabel = selectedSession
    ? truncateUtf16Safe(selectedSession.label || selectedSession.key, 20) +
      ((selectedSession.label || selectedSession.key).length > 20 ? "…" : "")
    : selectedSessions.length === 1
      ? truncateUtf16Safe(selectedSessionKey, 8) + "…"
      : t("usage.filters.sessionsCount", { count: String(selectedSessions.length) });
  const sessionsFullName = selectedSession
    ? selectedSession.label || selectedSession.key
    : selectedSessions.length === 1
      ? selectedSessionKey
      : selectedSessions.join(", ");

  const daysLabel =
    selectedDays.length === 1
      ? selectedDays[0]
      : t("usage.filters.daysCount", { count: String(selectedDays.length) });
  const hoursLabel =
    selectedHours.length === 1
      ? `${selectedHours[0]}:00`
      : t("usage.filters.hoursCount", { count: String(selectedHours.length) });
  const chips = [
    {
      active: selectedDays.length > 0,
      labelKey: "usage.filters.days",
      value: daysLabel,
      removeKey: "usage.filters.removeDays",
      onClear: onClearDays,
    },
    {
      active: selectedHours.length > 0,
      labelKey: "usage.filters.hours",
      value: hoursLabel,
      removeKey: "usage.filters.removeHours",
      onClear: onClearHours,
    },
    {
      active: selectedSessions.length > 0,
      labelKey: "usage.filters.session",
      value: sessionsLabel,
      removeKey: "usage.filters.removeSession",
      onClear: onClearSessions,
      title: sessionsFullName,
    },
    {
      active: Boolean(agentId),
      labelKey: "usage.filters.agent",
      value: agentId,
      removeKey: "usage.filters.remove",
      onClear: () => onAgentChange(null),
      title: agentId ?? undefined,
    },
  ];

  return html`
    <div class="active-filters">
      ${chips
        .filter(({ active }) => active)
        .map(
          ({ labelKey, value, removeKey, onClear, title }) => html`
            <div class="filter-chip" title=${ifDefined(title)}>
              <span class="filter-chip-label">${t(labelKey)}: ${value}</span>
              <openclaw-tooltip .content=${t("usage.filters.remove")}>
                <button class="filter-chip-remove" @click=${onClear} aria-label=${t(removeKey)}>
                  ×
                </button>
              </openclaw-tooltip>
            </div>
          `,
        )}
      ${((selectedDays.length > 0 || selectedHours.length > 0) && selectedSessions.length > 0) ||
      (agentId && hasSelections)
        ? html`
            <button
              class="btn btn--sm"
              @click=${() => {
                onClearFilters();
                if (agentId) {
                  onAgentChange(null);
                }
              }}
            >
              ${t("usage.filters.clearAll")}
            </button>
          `
        : nothing}
    </div>
  `;
}

function renderCostWindowComparison(
  daily: CostDailyEntry[],
  rangeStartDate: string,
  rangeEndDate: string,
) {
  const range = buildUsageCostWindowSummary(daily, rangeStartDate, rangeEndDate);
  if (!range || daily.length === 0) {
    return nothing;
  }

  const windows = buildUsageCostWindows(daily, rangeStartDate, rangeEndDate);
  const today = formatIsoDate(new Date());
  const labelForWindow = (days: number, endDate: string) => {
    if (days === 1) {
      return endDate === today ? t("usage.presets.today") : formatDayLabel(endDate);
    }
    return t("usage.costWindows.lastDays", { count: String(days) });
  };
  const comparisons = [
    { label: t("usage.costWindows.selectedRange"), summary: range },
    ...windows.map((summary) => ({
      label: labelForWindow(summary.days, summary.endDate),
      summary,
    })),
  ];

  return html`
    <dl class="usage-cost-windows" aria-label=${t("usage.costWindows.title")}>
      ${comparisons.map(
        ({ label, summary }) => html`
          <div
            tabindex="0"
            title=${`${formatDayLabel(summary.startDate)} – ${formatDayLabel(summary.endDate)} · ${formatUsageTokens(summary.totals.totalTokens)} ${t("usage.metrics.tokens")} · ${formatAnalysisCost(summary.totals.totalCost / summary.days, summary.totals.missingCostEntries)} ${t("usage.costWindows.perDay")}`}
          >
            <dt>${label}</dt>
            <dd>
              ${formatAnalysisCost(summary.totals.totalCost, summary.totals.missingCostEntries)}
              <span class="usage-cost-window-context"
                >${formatUsageTokens(summary.totals.totalTokens)} ${t("usage.metrics.tokens")} ·
                ${formatAnalysisCost(
                  summary.totals.totalCost / summary.days,
                  summary.totals.missingCostEntries,
                )}
                ${t("usage.costWindows.perDay")}</span
              >
            </dd>
          </div>
        `,
      )}
    </dl>
  `;
}

function renderCostBreakdownCompact(
  options: (
    | { mode: "tokens"; values: Pick<UsageTotals, "input" | "output" | "cacheRead" | "cacheWrite"> }
    | {
        mode: "cost";
        values: Pick<
          UsageTotals,
          "inputCost" | "outputCost" | "cacheReadCost" | "cacheWriteCost" | "missingCostEntries"
        >;
      }
  ) & {
    total: number;
    variant: "overview" | "timeline";
    tokenValues?: Pick<UsageTotals, "input" | "output" | "cacheRead" | "cacheWrite">;
  },
) {
  const timeline = options.variant === "timeline";
  const format = (value: number) =>
    options.mode === "tokens"
      ? formatUsageTokens(value)
      : formatAnalysisCost(value, options.values.missingCostEntries);
  const categories = USAGE_TOKEN_CATEGORIES.map((category) => {
    const value =
      options.mode === "tokens"
        ? options.values[category.key]
        : options.values[category.costKey] || 0;
    return {
      ...category,
      percentage: pct(value, options.total || (options.mode === "tokens" && !timeline ? 1 : 0)),
      formatted: format(value),
    };
  });
  return html`
    <div class=${timeline ? "timeseries-breakdown" : "cost-breakdown cost-breakdown-compact"}>
      ${timeline
        ? html`<div class="card-title usage-section-title">
            ${t(
              options.mode === "tokens"
                ? "usage.breakdown.tokensByType"
                : "usage.breakdown.costByType",
            )}
          </div>`
        : nothing}
      <div class="cost-breakdown-bar${timeline ? " cost-breakdown-bar--compact" : ""}">
        ${categories.map(
          ({ className, labelKey, percentage, formatted }) => html`
            <div
              class="cost-segment ${className}"
              style="width: ${percentage.toFixed(1)}%"
              title=${ifDefined(timeline ? undefined : `${t(labelKey)}: ${formatted}`)}
            ></div>
          `,
        )}
      </div>
      <div class="cost-breakdown-legend">
        ${categories.map(({ key, className, labelKey, hintKey, formatted, percentage }) => {
          const label = html`<span class="legend-dot ${className}"></span>${t(labelKey)}
            ${formatted}`;
          return timeline
            ? html`<div class="legend-item" title=${t(hintKey)}>${label}</div>`
            : html`<div class="usage-composition-metric" title=${t(hintKey)}>
                <span class="usage-composition-label"
                  ><span class="legend-dot ${className}"></span>${t(labelKey)}</span
                >
                <strong class="usage-composition-value">${formatted}</strong>
                <span class="usage-composition-context"
                  >${options.mode === "cost" && options.tokenValues
                    ? html`${formatUsageTokens(options.tokenValues[key])}
                      ${t("usage.metrics.tokens")} · `
                    : nothing}${percentage.toFixed(1)}%</span
                >
              </div>`;
        })}
      </div>
      ${timeline
        ? html`<div class="cost-breakdown-total">
            ${t("usage.breakdown.total")}: ${format(options.total)}
          </div>`
        : nothing}
    </div>
  `;
}

function renderInsightList(
  title: string,
  items: Array<{ label: string; value: string; sub?: string }>,
  emptyLabel: string,
  options?: {
    cardClassName?: string;
    listClassName?: string;
    error?: boolean;
  },
) {
  const listClass = [options?.error ? "usage-error-list" : "usage-list", options?.listClassName]
    .filter(Boolean)
    .join(" ");
  return html`
    <div class="usage-insight-card ${options?.cardClassName ?? ""}">
      <div class=${options?.error ? "usage-errors-heading" : "usage-insight-title"}>${title}</div>
      ${items.length === 0
        ? html`<div class="muted">${emptyLabel}</div>`
        : html`
            <table class="usage-insight-table ${listClass}" aria-label=${title}>
              <tbody>
                ${items.map(
                  (item) => html`
                    <tr class=${options?.error ? "usage-error-row" : "usage-list-item"}>
                      <th scope="row">
                        <span class="usage-insight-label" title=${item.label}>${item.label}</span>
                        ${item.sub
                          ? html`<small
                              title=${item.sub}
                              class=${options?.error ? "usage-error-sub" : "usage-list-sub"}
                              >${item.sub}</small
                            >`
                          : nothing}
                      </th>
                      <td class=${options?.error ? "usage-error-rate" : "usage-list-value"}>
                        ${item.value}
                      </td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          `}
    </div>
  `;
}

function renderUsageSummary(
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
  stats: UsageInsightStats,
  showCostHint: boolean,
  sessionCount: number,
  totalSessions: number,
) {
  if (!totals) {
    return nothing;
  }
  const empty = t("usage.common.emptyValue");
  const messages = aggregates.messages;
  const promptTokens = totals.input + totals.cacheRead + totals.cacheWrite;
  const duration =
    stats.durationCount > 0 ? (formatDurationCompact(stats.avgDurationMs) ?? empty) : empty;
  const figures = [
    {
      title: t("usage.metrics.tokens"),
      value: formatUsageTokens(totals.totalTokens),
      context: `${formatUsageTokens(totals.input)} ${t("usage.breakdown.input")} · ${formatUsageTokens(totals.output)} ${t("usage.breakdown.output")}`,
      hint: t("usage.overview.tokensHint"),
    },
    {
      title: t("usage.metrics.cost"),
      value: formatAnalysisCost(totals.totalCost, totals.missingCostEntries),
      context: showCostHint ? t("usage.overview.missingCost") : "",
      hint: t("usage.overview.costHint"),
    },
    {
      title: t("usage.overview.sessions"),
      value: sessionCount,
      context: `${t("usage.sessions.avg")} ${duration}`,
      hint: `${t("usage.overview.sessionsHint")} ${t("usage.overview.sessionsInRange", { count: totalSessions.toLocaleString("en-US") })}`,
    },

    {
      title: t("usage.overview.messages"),
      value: messages.total,
      context: `${messages.user.toLocaleString("en-US")} ${normalizeLowercaseStringOrEmpty(t("usage.overview.user"))} · ${messages.assistant.toLocaleString("en-US")} ${normalizeLowercaseStringOrEmpty(t("usage.overview.assistant"))}`,
      hint: t("usage.overview.messagesHint"),
    },
    {
      title: t("usage.overview.toolCalls"),
      value: aggregates.tools.totalCalls,
      context: `${aggregates.tools.uniqueTools.toLocaleString("en-US")} ${t("usage.overview.toolsUsed")} · ${messages.toolResults.toLocaleString("en-US")} ${t("usage.overview.toolResults")}`,
      hint: t("usage.overview.toolCallsHint"),
    },
    {
      title: t("usage.overview.errors"),
      value: messages.errors,
      context: `${t("usage.overview.errorRate")}: ${(stats.errorRate * 100).toFixed(2)}%`,
      hint: `${t("usage.overview.errorsHint")} ${t("usage.overview.errorHint")}`,
    },
  ];
  const rates = [
    {
      title: t("usage.overview.cacheHitRate"),
      value: promptTokens > 0 ? `${((totals.cacheRead / promptTokens) * 100).toFixed(1)}%` : empty,
      context: `${formatUsageTokens(totals.cacheRead)} ${t("usage.overview.cached")} · ${formatUsageTokens(promptTokens)} ${t("usage.overview.prompt")}`,
      hint: t("usage.overview.cacheHint"),
    },
    {
      title: t("usage.overview.errorRate"),
      value: `${(stats.errorRate * 100).toFixed(2)}%`,
      context: t("usage.overview.errorsHint"),
      hint: t("usage.overview.errorHint"),
    },
    {
      title: t("usage.overview.avgTokens"),
      value: messages.total
        ? formatUsageTokens(Math.round(totals.totalTokens / messages.total))
        : empty,
      context: t("usage.overview.acrossMessages", {
        count: messages.total.toLocaleString("en-US"),
      }),
      hint: t("usage.overview.avgTokensHint"),
    },
    {
      title: t("usage.overview.avgCost"),
      value: messages.total
        ? formatAnalysisCost(totals.totalCost / messages.total, totals.missingCostEntries)
        : empty,
      context: t("usage.overview.acrossMessages", {
        count: messages.total.toLocaleString("en-US"),
      }),
      hint: t(showCostHint ? "usage.overview.avgCostHintMissing" : "usage.overview.avgCostHint"),
    },
    {
      title: t("usage.overview.throughput"),
      value:
        stats.throughputTokensPerMin !== undefined
          ? `${stats.throughputTokensPerMin > 0 && stats.throughputTokensPerMin < 1 ? "<1" : formatUsageTokens(Math.round(stats.throughputTokensPerMin))} ${t("usage.overview.tokensPerMinute")}`
          : empty,
      context:
        stats.throughputCostPerMin !== undefined
          ? `${formatAnalysisCost(stats.throughputCostPerMin, totals.missingCostEntries)} ${t("usage.overview.perMinute")}`
          : empty,
      hint: t("usage.overview.throughputHint"),
    },
    {
      title: t("usage.operations.latency"),
      value: aggregates.latency
        ? (formatDurationCompact(aggregates.latency.avgMs) ?? empty)
        : empty,
      context: aggregates.latency
        ? t("usage.operations.latencyRange", {
            p95: formatDurationCompact(aggregates.latency.p95Ms) ?? empty,
            min: formatDurationCompact(aggregates.latency.minMs) ?? empty,
            max: formatDurationCompact(aggregates.latency.maxMs) ?? empty,
            count: aggregates.latency.count.toLocaleString("en-US"),
          })
        : empty,
      hint: t("usage.operations.latencyHint"),
    },
  ];
  return html`
    <section class="usage-figures" aria-label=${t("usage.overview.title")}>
      <div class="usage-figures-main">
        ${figures.map(
          (figure) => html`
            <openclaw-tooltip .content=${`${figure.hint} ${figure.context}`}>
              <div class="usage-figure" tabindex="0">
                <strong class="usage-figure-value"
                  >${typeof figure.value === "number"
                    ? figure.value.toLocaleString("en-US")
                    : figure.value}</strong
                >
                <span class="usage-figure-label">${figure.title}</span>
                <small class="usage-figure-context">${figure.context}</small>
              </div>
            </openclaw-tooltip>
          `,
        )}
      </div>
      <div class="usage-rates">
        ${rates.map(
          (rate) => html`
            <openclaw-tooltip .content=${`${rate.hint} ${rate.context}`}>
              <span class="usage-rate" tabindex="0"
                >${rate.title} <strong>${rate.value}</strong></span
              >
            </openclaw-tooltip>
          `,
        )}
      </div>
      ${showCostHint
        ? html`<p class="usage-figures-warning" role="note">
            ${t("usage.overview.avgCostHintMissing")}
          </p>`
        : nothing}
    </section>
  `;
}

function renderUsageInsights(
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
  showCostShares: boolean,
  errorHours: Array<{ label: string; value: string; sub?: string }>,
) {
  if (!totals) {
    return nothing;
  }

  const errorDays = aggregates.daily
    .filter((day) => day.messages > 0 && day.errors > 0)
    .map((day) => {
      const rate = day.errors / day.messages;
      return {
        label: formatDayLabel(day.date),
        value: `${(rate * 100).toFixed(2)}%`,
        sub: `${t(day.errors === 1 ? "usage.overview.errorCountOne" : "usage.overview.errorCountOther", { count: day.errors.toLocaleString("en-US") })} · ${formatUsageTokens(day.messages)} ${t("usage.overview.messagesAbbrev")} · ${formatUsageTokens(day.tokens)}`,
        rate,
      };
    })
    .toSorted((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map(({ rate: _rate, ...rest }) => rest);

  const costShare = (cost: number) =>
    showCostShares && totals.totalCost > 0
      ? t("usage.overview.costShare", { percent: ((cost / totals.totalCost) * 100).toFixed(1) })
      : null;
  const costAttributionSub = (cost: number, tokens: number) =>
    [costShare(cost), formatUsageTokens(tokens)]
      .filter((part): part is string => part !== null)
      .join(" · ");

  const topModels = aggregates.byModel.slice(0, 5).map((entry) => ({
    label: entry.model ?? t("usage.common.unknown"),
    value: formatAnalysisCost(entry.totals.totalCost, entry.totals.missingCostEntries),
    sub: [entry.provider, costAttributionSub(entry.totals.totalCost, entry.totals.totalTokens)]
      .filter(Boolean)
      .join(" · "),
  }));
  const topProviders = aggregates.byProvider.slice(0, 5).map((entry) => ({
    label: entry.provider ?? t("usage.common.unknown"),
    value: formatAnalysisCost(entry.totals.totalCost, entry.totals.missingCostEntries),
    sub: costAttributionSub(entry.totals.totalCost, entry.totals.totalTokens),
  }));
  const topTools = aggregates.tools.tools.slice(0, 6).map((tool) => ({
    label: tool.name,
    value: `${tool.count.toLocaleString("en-US")} ${t("usage.overview.calls")}`,
  }));
  const topAgents = aggregates.byAgent.slice(0, 5).map((entry) => ({
    label: entry.agentId,
    value: formatAnalysisCost(entry.totals.totalCost, entry.totals.missingCostEntries),
    sub: costAttributionSub(entry.totals.totalCost, entry.totals.totalTokens),
  }));
  const topChannels = aggregates.byChannel.slice(0, 5).map((entry) => ({
    label: entry.channel,
    value: formatAnalysisCost(entry.totals.totalCost, entry.totals.missingCostEntries),
    sub: costAttributionSub(entry.totals.totalCost, entry.totals.totalTokens),
  }));
  const insightLists = [
    ["usage.overview.topModels", topModels, "usage.overview.noModelData"],
    ["usage.overview.topProviders", topProviders, "usage.overview.noProviderData"],
    ["usage.overview.topAgents", topAgents, "usage.overview.noAgentData"],
    ["usage.overview.topChannels", topChannels, "usage.overview.noChannelData"],
    ["usage.overview.topTools", topTools, "usage.overview.noToolCalls"],
  ] as const;

  return html`
    <div class="usage-insights-grid">
      ${insightLists.map(([titleKey, items, emptyKey]) =>
        renderInsightList(t(titleKey), items, t(emptyKey), {
          cardClassName: titleKey === "usage.overview.topTools" ? "usage-insight-card--tools" : "",
        }),
      )}
      <div class="usage-insight-card usage-insight-card--errors">
        <div class="usage-insight-title">${t("usage.overview.errors")}</div>
        <div class="usage-errors-grid">
          ${renderInsightList(
            t("usage.overview.peakErrorDays"),
            errorDays,
            t("usage.overview.noErrorData"),
            { error: true },
          )}
          ${renderInsightList(
            t("usage.overview.peakErrorHours"),
            errorHours,
            t("usage.overview.noErrorData"),
            { error: true },
          )}
        </div>
      </div>
    </div>
  `;
}

function renderSessionsCard(
  sessions: UsageSessionEntry[],
  selectedSessions: string[],
  selectedDays: string[],
  isTokenMode: boolean,
  sessionSort: UsageProps["display"]["sessionSort"],
  sessionSortDir: "asc" | "desc",
  recentSessions: string[],
  sessionsTab: "all" | "recent",
  onSelectSession: (key: string, shiftKey: boolean, orderedKeys: string[]) => void,
  onSessionSortChange: UsageProps["callbacks"]["display"]["onSessionSortChange"],
  onSessionSortDirChange: (dir: "asc" | "desc") => void,
  onSessionsTabChange: (tab: "all" | "recent") => void,
  visibleColumns: UsageColumnId[],
  totalSessions: number,
  onClearSessions: () => void,
  onToggleSession?: (key: string) => void,
  toolbar?: TemplateResult,
  counters?: TemplateResult,
  onToggleColumn?: (column: UsageColumnId) => void,
) {
  const showColumn = (id: UsageColumnId) => visibleColumns.includes(id);
  const formatSessionListLabel = (s: UsageSessionEntry): string => {
    const raw = s.label || s.key;
    // Agent session keys often include a token query param; remove it for readability.
    if (raw.startsWith("agent:") && raw.includes("?token=")) {
      return raw.slice(0, raw.indexOf("?token="));
    }
    return raw;
  };
  const selectedDaySet = new Set(selectedDays);

  const sortedSessions = sessions
    .map((session) => {
      const usage = session.usage;
      let tokens = usage?.totalTokens ?? 0;
      let cost = usage?.totalCost ?? 0;
      const daily = selectedDaySet.size > 0 ? usage?.dailyBreakdown : undefined;
      if (daily?.length) {
        tokens = 0;
        cost = 0;
        for (const day of daily) {
          if (selectedDaySet.has(day.date)) {
            tokens += day.tokens;
            cost += day.cost;
          }
        }
      }
      let sortValue: number | string = 0;
      switch (sessionSort) {
        case "label":
          sortValue = formatSessionListLabel(session);
          break;
        case "channel":
          sortValue = `${session.channel ?? ""} ${session.agentId ?? ""}`;
          break;
        case "model":
          sortValue = `${session.modelProvider ?? session.providerOverride ?? ""} ${session.model ?? session.modelOverride ?? ""}`;
          break;
        case "tools":
          sortValue = usage?.toolUsage?.totalCalls ?? 0;
          break;
        case "duration":
          sortValue = usage?.durationMs ?? 0;
          break;
        case "recent":
          sortValue = session.updatedAt ?? 0;
          break;
        case "messages":
          sortValue = usage?.messageCounts?.total ?? 0;
          break;
        case "errors":
          sortValue = usage?.messageCounts?.errors ?? 0;
          break;
        case "cost":
          sortValue = cost;
          break;
        case "tokens":
          sortValue = tokens;
          break;
      }
      return {
        session,
        displayLabel: formatSessionListLabel(session),
        value: usage ? (isTokenMode ? tokens : cost) : null,
        tokens: usage ? tokens : null,
        cost: usage ? cost : null,
        sortValue,
      };
    })
    .toSorted((a, b) => {
      const valueDiff =
        typeof a.sortValue === "string" && typeof b.sortValue === "string"
          ? b.sortValue.localeCompare(a.sortValue)
          : Number(b.sortValue) - Number(a.sortValue);
      if (valueDiff !== 0) {
        return valueDiff;
      }
      const recentDiff = (b.session.updatedAt ?? 0) - (a.session.updatedAt ?? 0);
      if (recentDiff !== 0) {
        return recentDiff;
      }
      return a.displayLabel.localeCompare(b.displayLabel);
    });
  const sortedWithDir = sessionSortDir === "asc" ? sortedSessions.toReversed() : sortedSessions;

  const knownEntries = sortedWithDir.filter((entry) => entry.value !== null);
  const avgValue = knownEntries.length
    ? knownEntries.reduce((sum, entry) => sum + (entry.value ?? 0), 0) / knownEntries.length
    : null;
  const totalErrors = sortedWithDir.reduce(
    (sum, entry) => sum + (entry.session.usage?.messageCounts?.errors ?? 0),
    0,
  );

  const selectedSet = new Set(selectedSessions);
  const selectedEntries = sortedWithDir.filter((entry) => selectedSet.has(entry.session.key));
  const sessionMap = new Map(sortedWithDir.map((entry) => [entry.session.key, entry]));
  const recentEntries = recentSessions
    .map((key) => sessionMap.get(key))
    .filter((entry) => entry !== undefined);
  const displayedEntries = sessionsTab === "recent" ? recentEntries : sortedWithDir;
  const empty = t("usage.common.emptyValue");
  const columns = [
    { key: "label", label: t("usage.filters.session"), sort: "label", visible: true },
    { key: "agent", label: t("usage.filters.agent"), sort: null, visible: showColumn("agent") },
    { key: "model", label: t("usage.filters.model"), sort: "model", visible: showColumn("model") },
    {
      key: "channel",
      label: t("usage.filters.channel"),
      sort: "channel",
      visible: showColumn("channel"),
    },
    {
      key: "provider",
      label: t("usage.filters.provider"),
      sort: null,
      visible: showColumn("provider"),
    },
    {
      key: "messages",
      label: t("usage.sessions.msgsTitle"),
      sort: "messages",
      visible: showColumn("messages"),
    },
    { key: "tools", label: t("usage.details.tools"), sort: "tools", visible: showColumn("tools") },
    {
      key: "errors",
      label: t("usage.overview.errors"),
      sort: "errors",
      visible: showColumn("errors"),
    },
    {
      key: "duration",
      label: t("usage.details.duration"),
      sort: "duration",
      visible: showColumn("duration"),
    },
    {
      key: "value",
      label: t(isTokenMode ? "usage.metrics.tokens" : "usage.metrics.cost"),
      sort: isTokenMode ? "tokens" : "cost",
      visible: true,
    },
  ] as const;
  const sortOptions = [
    ...columns
      .filter((column) => column.key !== "value" && column.sort !== null)
      .map(({ sort, label }) => ({ sort, label })),
    { sort: "tokens", label: t("usage.metrics.tokens") },
    { sort: "cost", label: t("usage.metrics.cost") },
    { sort: "recent", label: t("usage.sessions.recentShort") },
  ] as const;
  const sortBy = (sort: typeof sessionSort) => {
    if (sessionSort === sort) onSessionSortDirChange(sessionSortDir === "asc" ? "desc" : "asc");
    else {
      onSessionSortChange(sort);
      onSessionSortDirChange("desc");
    }
  };
  const number = (value: number | undefined) =>
    value === undefined ? empty : value.toLocaleString("en-US");
  const renderRows = (entries: typeof sortedSessions) => {
    const orderedKeys = entries.map(({ session }) => session.key);
    return repeat(
      entries,
      ({ session }) => session.key,
      ({ session, displayLabel, value }) => {
        const usage = session.usage;
        const selected = selectedSet.has(session.key);
        const numericValues = [
          number(usage?.messageCounts?.total),
          number(usage?.toolUsage?.totalCalls),
          number(usage?.messageCounts?.errors),
          formatDurationCompact(usage?.durationMs) ?? empty,
          value === null
            ? empty
            : isTokenMode
              ? formatUsageTokens(value)
              : formatAnalysisCost(value, usage?.missingCostEntries),
        ];
        return html`
          <tr
            class="usage-session-row ${selected ? "selected" : ""}"
            aria-selected=${selected}
            title=${session.key}
            @click=${(event: MouseEvent) => {
              if (!(event.target as Element).closest("button, input"))
                onSelectSession(session.key, event.shiftKey, orderedKeys);
            }}
          >
            <td class="usage-session-name" data-column="label">
              <div class="usage-session-name-line">
                <input
                  class="usage-session-checkbox"
                  type="checkbox"
                  .checked=${selected}
                  aria-label=${t("usage.sessions.selectSession", { name: displayLabel })}
                  @click=${(event: MouseEvent) => {
                    if (event.shiftKey || !onToggleSession) {
                      onSelectSession(session.key, event.shiftKey, orderedKeys);
                    } else {
                      onToggleSession(session.key);
                    }
                  }}
                />
                <button
                  class="usage-session-open"
                  title=${session.key}
                  @click=${(event: MouseEvent) =>
                    onSelectSession(session.key, event.shiftKey, orderedKeys)}
                >
                  ${displayLabel}
                </button>
                <span class="usage-session-copy"
                  >${renderCopyButton(displayLabel, t("usage.sessions.copy"))}</span
                >
              </div>
            </td>
            ${columns.slice(1, 5).map((column) => {
              const value =
                column.key === "agent"
                  ? session.agentId
                  : column.key === "model"
                    ? (session.model ?? session.modelOverride)
                    : column.key === "channel"
                      ? session.channel
                      : (session.modelProvider ?? session.providerOverride);
              return html`<td
                data-column=${column.key}
                data-label=${column.label}
                ?hidden=${!column.visible}
              >
                <span class="usage-session-${column.key}" title=${value ?? empty}>
                  ${column.key === "provider" ? renderProviderBrandIcon(value ?? "?") : nothing}
                  <span>${value ?? empty}</span>
                </span>
              </td>`;
            })}
            ${columns
              .slice(5)
              .map(
                (column, index) => html`
                  <td
                    class="usage-session-number"
                    data-column=${column.key}
                    data-label=${column.label}
                    ?hidden=${!column.visible}
                  >
                    ${numericValues[index]}
                  </td>
                `,
              )}
          </tr>
        `;
      },
    );
  };
  const renderTable = (entries: typeof sortedSessions) => html`
    <div class="usage-session-table-wrap">
      <table
        class="usage-session-table ${columns.filter((column) => column.visible).length <= 4
          ? "usage-session-table--wide-name"
          : ""} ${selectedEntries.length ? "has-selection" : ""}"
      >
        <thead>
          <tr>
            ${columns.map(
              (column) => html`
                <th
                  scope="col"
                  data-column=${column.key}
                  ?hidden=${!column.visible}
                  aria-sort=${column.sort === null
                    ? nothing
                    : sessionSort === column.sort
                      ? sessionSortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"}
                >
                  ${column.sort === null
                    ? column.label
                    : html`<button @click=${() => sortBy(column.sort)}>
                        ${column.label}${sessionSort === column.sort
                          ? sessionSortDir === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </button>`}
                  ${column.key === "label"
                    ? html`<button
                        class="usage-session-recent-sort"
                        aria-label=${t("usage.sessions.recentShort")}
                        @click=${() => sortBy("recent")}
                      >
                        ${t("usage.sessions.recentShort")}${sessionSort === "recent"
                          ? sessionSortDir === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </button>`
                    : nothing}
                </th>
              `,
            )}
          </tr>
        </thead>
        <tbody>
          ${entries.length
            ? renderRows(entries)
            : html`<tr>
                <td
                  colspan=${columns.filter(({ visible }) => visible).length}
                  class="usage-empty-block"
                >
                  ${t(
                    sessionsTab === "recent"
                      ? "usage.sessions.noRecent"
                      : "usage.sessions.noneInRange",
                  )}
                </td>
              </tr>`}
        </tbody>
      </table>
    </div>
  `;
  return html`
    <section
      id="usage-sessions"
      class="usage-sessions ${sessionsTab === "recent" ? "usage-sessions--recent" : ""}"
    >
      <header class="usage-sessions-heading">
        <div class="usage-sessions-title">
          <h3>
            ${t("usage.sessions.title")}
            <span class="usage-sessions-count"
              >${displayedEntries.length.toLocaleString("en-US")}</span
            >
          </h3>
          ${counters ? html`<div class="usage-sessions-counters">${counters}</div>` : nothing}
        </div>
        ${renderSettingsSegmented({
          mode: "buttons",
          ariaPressed: false,
          className: "small",
          value: sessionsTab,
          onChange: onSessionsTabChange,
          onReselect: onSessionsTabChange,
          options: [
            { value: "all", label: t("usage.sessions.all") },
            { value: "recent", label: t("usage.sessions.recent") },
          ],
        })}
        <div class="usage-session-sort">
          <select
            class="settings-select"
            aria-label=${t("usage.sessions.sort")}
            @change=${(event: Event) => {
              const selected = sortOptions.find(
                ({ sort }) => sort === (event.target as HTMLSelectElement).value,
              );
              if (selected) onSessionSortChange(selected.sort);
            }}
          >
            ${sortOptions.map(
              ({ sort, label }) => html`
                <option value=${sort} ?selected=${sessionSort === sort}>${label}</option>
              `,
            )}
          </select>
          <button
            class="btn btn--sm"
            aria-label=${t(
              sessionSortDir === "asc" ? "usage.sessions.ascending" : "usage.sessions.descending",
            )}
            @click=${() => onSessionSortDirChange(sessionSortDir === "asc" ? "desc" : "asc")}
          >
            ${sessionSortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
        ${onToggleColumn
          ? html`<details class="usage-session-columns">
              <summary>${t("usage.sessions.columns")}</summary>
              <div class="usage-session-columns-menu">
                ${(
                  [
                    "agent",
                    "model",
                    "channel",
                    "provider",
                    "messages",
                    "tools",
                    "errors",
                    "duration",
                  ] as const
                ).map(
                  (key) => html` <label
                    ><input
                      type="checkbox"
                      .checked=${showColumn(key)}
                      @change=${() => onToggleColumn(key)}
                    />
                    ${columns.find((column) => column.key === key)?.label}
                  </label>`,
                )}
              </div>
            </details>`
          : nothing}
      </header>
      ${toolbar ? html`<div class="usage-sessions-toolbar">${toolbar}</div>` : nothing}
      <div class="usage-sessions-summary">
        <span
          >${t("usage.sessions.shown", { count: displayedEntries.length.toLocaleString("en-US") })}
          ${totalSessions !== displayedEntries.length
            ? ` · ${t("usage.sessions.total", { count: totalSessions.toLocaleString("en-US") })}`
            : ""}
          ·
          ${avgValue === null
            ? empty
            : isTokenMode
              ? formatUsageTokens(avgValue)
              : formatAnalysisCost(
                  avgValue,
                  sortedWithDir.reduce(
                    (sum, { session }) => sum + (session.usage?.missingCostEntries ?? 0),
                    0,
                  ),
                )}
          ${t("usage.sessions.avg")} · ${t("usage.overview.errors")}:
          ${knownEntries.length ? number(totalErrors) : empty}</span
        >
      </div>
      ${selectedEntries.length
        ? html`<div class="usage-session-selection">
            <span
              >${t("usage.sessions.selected", {
                count: selectedEntries.length.toLocaleString("en-US"),
              })}</span
            >
            <button class="btn btn--sm" @click=${onClearSessions}>
              ${t("usage.sessions.clearSelection")}
            </button>
          </div>`
        : nothing}
      ${renderTable(displayedEntries)}
      <p class="usage-session-help">${t("usage.sessions.openHint")}</p>
      ${recentEntries.length
        ? html`<nav class="usage-session-recents" aria-label=${t("usage.sessions.recent")}>
            <span>${t("usage.sessions.recent")}</span>
            ${recentEntries.map(
              ({ session, displayLabel }) => html`<button
                class="btn btn--sm btn--ghost"
                @click=${() =>
                  onSelectSession(
                    session.key,
                    false,
                    displayedEntries.map(({ session }) => session.key),
                  )}
              >
                ${displayLabel}
              </button>`,
            )}
          </nav>`
        : nothing}
      ${selectedEntries.length > 1
        ? html`<section
            class="usage-session-comparison"
            aria-label=${t("usage.sessions.compare", { count: String(selectedEntries.length) })}
          >
            <div class="usage-inspection-heading">
              <h3>${t("usage.details.inspection")}</h3>
              <a href="#usage-sessions">${t("usage.details.backToSessions")} ↑</a>
            </div>
            <header class="usage-session-comparison-heading">
              <div>
                <h4>${t("usage.sessions.compare", { count: String(selectedEntries.length) })}</h4>
                <p class="muted">${t("usage.sessions.compareHint")}</p>
              </div>
              <button class="btn btn--sm" @click=${onClearSessions}>
                ${t("usage.sessions.clearSelection")}
              </button>
            </header>
            <div class="usage-session-comparison-grid">
              ${selectedEntries.map(({ session, displayLabel, tokens, cost }) => {
                const usage = session.usage;
                const entries = [
                  [
                    t("usage.metrics.cost"),
                    cost === null ? empty : formatAnalysisCost(cost, usage?.missingCostEntries),
                  ],
                  [t("usage.metrics.tokens"), tokens === null ? empty : formatUsageTokens(tokens)],
                  [t("usage.overview.messages"), number(usage?.messageCounts?.total)],
                  [t("usage.overview.toolCalls"), number(usage?.toolUsage?.totalCalls)],
                  [t("usage.overview.errors"), number(usage?.messageCounts?.errors)],
                  [t("usage.details.duration"), formatDurationCompact(usage?.durationMs) ?? empty],
                ];
                return html`<article class="usage-session-comparison-item">
                  <h4>${displayLabel}</h4>
                  <p class="muted">
                    ${session.agentId ?? empty} · ${session.model ?? session.modelOverride ?? empty}
                  </p>
                  <div class="usage-session-comparison-value">${entries[0][1]}</div>
                  ${selectedDays.length
                    ? html`<p class="muted">
                        ${t("usage.details.fullSession")}: ${t("usage.overview.messages")},
                        ${t("usage.overview.toolCalls")}, ${t("usage.overview.errors")},
                        ${t("usage.details.duration")}
                      </p>`
                    : nothing}
                  <dl>
                    ${entries.map(
                      ([label, value]) =>
                        html`<div>
                          <dt>${label}</dt>
                          <dd>${value}</dd>
                        </div>`,
                    )}
                  </dl>
                  <button
                    class="btn"
                    @click=${() =>
                      onSelectSession(
                        session.key,
                        false,
                        selectedEntries.map(({ session }) => session.key),
                      )}
                  >
                    ${t("usage.sessions.inspectSession")}
                  </button>
                </article>`;
              })}
            </div>
          </section>`
        : nothing}
    </section>
  `;
}

export {
  renderCostBreakdownCompact,
  renderCostWindowComparison,
  renderFilterChips,
  renderInsightList,
  renderSessionsCard,
  renderUsageInsights,
  renderUsageSummary,
};
/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
