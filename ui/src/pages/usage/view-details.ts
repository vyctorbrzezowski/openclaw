import { expectDefined } from "@openclaw/normalization-core";
import { normalizeLowercaseStringOrEmpty } from "@openclaw/normalization-core/string-coerce";
import { html, svg, nothing } from "lit";
import {
  renderPanelRefreshStatus,
  type PanelRefreshStatus,
} from "../../components/panel-refresh-status.ts";
import { renderSettingsSegmented } from "../../components/settings-ui.ts";
import { t } from "../../i18n/index.ts";
import {
  formatDurationCompact,
  formatDateTimeMs,
  formatMs,
  formatTimeMs,
} from "../../lib/format.ts";
import "../../components/tooltip.ts";
import { smoothPath } from "./chart-path.ts";
import { parseToolSummary } from "./helpers.ts";
import {
  charsToTokens,
  formatAnalysisCost,
  formatUsageCost,
  formatUsageTokens,
  USAGE_TOKEN_CATEGORIES,
} from "./metrics.ts";
import type {
  SessionLogEntry,
  TimeSeriesPoint,
  UsageContextDetail,
  UsageProps,
  UsageSessionEntry,
} from "./types.ts";
import { renderUsageDetailSkeleton } from "./view-loading.ts";
import { renderCostBreakdownCompact, renderInsightList } from "./view-overview.ts";

const CHART_BAR_WIDTH_RATIO = 0.75; // Fraction of slot used for bar (rest is gap)
const CHART_MAX_BAR_WIDTH = 8; // Max bar width in SVG viewBox units
const CHART_SELECTION_OPACITY = 0.06; // Opacity of range selection overlay
const HANDLE_WIDTH = 5; // Width of drag handle in SVG units
const HANDLE_HEIGHT = 12; // Height of drag handle
const HANDLE_GRIP_OFFSET = 0.7; // Offset of grip lines inside handle

function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

/** Normalize a log timestamp to milliseconds (handles seconds vs ms). */
function normalizeLogTimestamp(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts;
}

function dateBoundaryMs(date: string, timeZone: "local" | "utc", dayOffset: 0 | 1): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10)) + dayOffset;
  // Build the target date directly; advancing a normalized skipped midnight can retain 01:00.
  return timeZone === "utc" ? Date.UTC(year, month, day) : new Date(year, month, day).getTime();
}

export function usageDateKey(timestamp: number, timeZone: "local" | "utc"): string {
  const value = new Date(timestamp);
  const year = timeZone === "utc" ? value.getUTCFullYear() : value.getFullYear();
  const month = (timeZone === "utc" ? value.getUTCMonth() : value.getMonth()) + 1;
  const day = timeZone === "utc" ? value.getUTCDate() : value.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function filterLogsByRange(
  logs: SessionLogEntry[],
  rangeStart: number,
  rangeEnd: number,
): SessionLogEntry[] {
  const lo = Math.min(rangeStart, rangeEnd);
  const hi = Math.max(rangeStart, rangeEnd);
  return logs.filter((log) => {
    if (log.timestamp <= 0) {
      return true;
    }
    const ts = normalizeLogTimestamp(log.timestamp);
    return ts >= lo && ts <= hi;
  });
}

function renderUsageRefreshStatus(
  status: PanelRefreshStatus,
  detailKey: string,
  kind: "timeline" | "conversation" | "context",
  loading: boolean,
) {
  return html`${status.hasLoaded && (loading || status.awaitingGateway)
    ? html`<div class="card-sub" role="status">
        ${t(status.awaitingGateway ? "usage.details.awaitingGateway" : "common.refreshing")}
      </div>`
    : nothing}${renderPanelRefreshStatus({
    status,
    errorMessage: status.error
      ? t("usage.details.loadFailed", {
          detail: normalizeLowercaseStringOrEmpty(t(detailKey)),
          error: status.error,
        })
      : undefined,
    className: `usage-callout usage-detail-error--${kind}`,
  })}`;
}

function renderSessionSummary(
  session: UsageSessionEntry,
  filteredUsage?: UsageSessionEntry["usage"],
  filteredLogs?: SessionLogEntry[],
  hasRange = false,
) {
  const usage = filteredUsage || session.usage;
  if (!usage) {
    return {
      figures: html`<div class="usage-empty-block">${t("usage.details.noUsageData")}</div>`,
      toolsModels: nothing,
    };
  }

  const formatTs = (ts?: number): string => (ts ? formatMs(ts) : t("usage.common.emptyValue"));

  // Always use the full tool list for stable layout; update counts when filtering
  const baseTools = usage.toolUsage?.tools.slice(0, 6) ?? [];
  let toolCounts: Map<string, number> | undefined;
  if (filteredLogs) {
    toolCounts = new Map();
    // Result rows carry tool names for filtering, but only assistant rows record calls.
    for (const log of filteredLogs.filter(({ role }) => role === "assistant")) {
      for (const [name, count] of parseToolSummary(log.content).tools) {
        toolCounts.set(name, (toolCounts.get(name) ?? 0) + count);
      }
    }
  }
  const toolItems = baseTools.map((tool) => ({
    label: tool.name,
    value: `${(toolCounts ? (toolCounts.get(tool.name) ?? 0) : tool.count).toLocaleString("en-US")} ${t("usage.overview.calls")}`,
  }));
  const toolCallCount = toolCounts
    ? [...toolCounts.values()].reduce((sum, count) => sum + count, 0)
    : (usage.toolUsage?.totalCalls ?? 0);
  const uniqueToolCount = toolCounts ? toolCounts.size : (usage.toolUsage?.uniqueTools ?? 0);
  const modelItems =
    usage.modelUsage?.slice(0, 6).map((entry) => ({
      label: entry.model ?? t("usage.common.unknown"),
      value: formatAnalysisCost(entry.totals.totalCost, entry.totals.missingCostEntries),
      sub: formatUsageTokens(entry.totals.totalTokens),
    })) ?? [];
  const messages = hasRange
    ? filteredLogs?.reduce(
        (counts, { role }) => {
          if (role === "user" || role === "assistant") {
            counts[role] += 1;
            counts.total += 1;
          }
          return counts;
        },
        { total: 0, user: 0, assistant: 0 },
      )
    : (usage.messageCounts ?? { total: 0, user: 0, assistant: 0 });
  const fullSession = hasRange ? ` · ${t("usage.details.fullSession")}` : "";
  const toolScope = filteredLogs ? "" : fullSession;
  const cards = [
    {
      labelKey: hasRange ? "usage.details.visibleMessages" : "usage.overview.messages",
      value: messages?.total ?? t("usage.common.emptyValue"),
      meta: messages
        ? html`${messages.user.toLocaleString("en-US")}
          ${normalizeLowercaseStringOrEmpty(t("usage.overview.user"))} ·
          ${messages.assistant.toLocaleString("en-US")}
          ${normalizeLowercaseStringOrEmpty(t("usage.overview.assistant"))}`
        : nothing,
    },
    {
      labelKey: "usage.overview.toolCalls",
      scope: toolScope,
      value: toolCallCount,
      meta: html`${uniqueToolCount.toLocaleString("en-US")} ${t("usage.overview.toolsUsed")} ·
      ${(usage.messageCounts?.toolResults ?? 0).toLocaleString("en-US")}
      ${t("usage.overview.toolResults")}${filteredLogs ? fullSession : ""}`,
    },
    {
      labelKey: "usage.overview.errors",
      scope: fullSession,
      value: usage.messageCounts?.errors ?? 0,
      meta: nothing,
    },
    {
      labelKey: "usage.details.duration",
      value: formatDurationCompact(usage.durationMs) ?? t("usage.common.emptyValue"),
      meta: nothing,
    },
    {
      labelKey: "usage.details.firstActivity",
      timestamp: true,
      value: formatTs(usage.firstActivity),
      meta: nothing,
    },
    {
      labelKey: "usage.details.lastActivity",
      timestamp: true,
      value: formatTs(usage.lastActivity),
      meta: nothing,
    },
  ];

  return {
    figures: html`
      <div class="session-summary-grid">
        ${cards.map(
          ({ labelKey, value, meta, scope, timestamp }) => html`
            <div class="session-summary-card">
              <div class="session-summary-title">${t(labelKey)}${scope ?? ""}</div>
              <div
                class="stat-value session-summary-value ${timestamp
                  ? "session-summary-timestamp"
                  : ""}"
              >
                ${typeof value === "number" ? value.toLocaleString("en-US") : value}
              </div>
              <div class="session-summary-meta">${meta}</div>
            </div>
          `,
        )}
      </div>
    `,
    toolsModels: html`
      <div class="session-detail-tools-models">
        ${renderInsightList(
          t("usage.overview.topTools") + toolScope,
          toolItems,
          t("usage.overview.noToolCalls"),
        )}
        ${renderInsightList(
          t("usage.details.modelMix") + fullSession,
          modelItems,
          t("usage.overview.noModelData"),
        )}
      </div>
    `,
  };
}

function computeFilteredUsage(
  baseUsage: NonNullable<UsageSessionEntry["usage"]>,
  points: TimeSeriesPoint[],
  rangeStart: number,
  rangeEnd: number,
): UsageSessionEntry["usage"] | undefined {
  const lo = Math.min(rangeStart, rangeEnd);
  const hi = Math.max(rangeStart, rangeEnd);
  const filtered = points.filter((p) => p.timestamp >= lo && p.timestamp <= hi);
  if (filtered.length === 0) {
    return undefined;
  }

  let totalTokens = 0;
  let totalCost = 0;
  const tokenTotals = { output: 0, input: 0, cacheWrite: 0, cacheRead: 0 };

  for (const p of filtered) {
    totalTokens += p.totalTokens || 0;
    totalCost += p.cost || 0;
    for (const { key } of USAGE_TOKEN_CATEGORIES) {
      tokenTotals[key] += p[key] || 0;
    }
  }
  const first = expectDefined(filtered[0], "filtered usage first point");
  const last = expectDefined(filtered.at(-1), "filtered usage last point");

  return {
    ...baseUsage,
    ...tokenTotals,
    totalTokens,
    totalCost,
    durationMs: last.timestamp - first.timestamp,
    firstActivity: first.timestamp,
    lastActivity: last.timestamp,
  };
}

type UsageDetailViewProps = {
  detail: UsageProps["detail"];
  display: Pick<UsageProps["display"], "contextExpanded">;
  filters: Pick<UsageProps["filters"], "startDate" | "endDate" | "selectedDays" | "timeZone">;
  callbacks: {
    details: Omit<UsageProps["callbacks"]["details"], "onSelectSession">;
    filters: Pick<UsageProps["callbacks"]["filters"], "onClearSessions">;
  };
};

function renderSessionDetailPanel(
  session: UsageSessionEntry,
  { detail, display, filters, callbacks }: UsageDetailViewProps,
) {
  const label = session.label || session.key;
  const usage = session.usage;

  const { timeSeriesCursorStart: cursorStart, timeSeriesCursorEnd: cursorEnd } = detail;
  const hasRange = cursorStart !== null && cursorEnd !== null;
  const filteredUsage =
    hasRange && detail.timeSeries?.points && usage
      ? computeFilteredUsage(usage, detail.timeSeries.points, cursorStart, cursorEnd)
      : undefined;
  const headerStats = filteredUsage
    ? { totalTokens: filteredUsage.totalTokens, totalCost: filteredUsage.totalCost }
    : { totalTokens: usage?.totalTokens ?? 0, totalCost: usage?.totalCost ?? 0 };
  const cursorIndicator = filteredUsage ? t("usage.details.filtered") : "";
  const badges = [
    { label: "channel", value: session.channel },
    { label: "agent", value: session.agentId },
    { label: "provider", value: session.modelProvider ?? session.providerOverride },
    { label: "model", value: session.model },
  ].filter((badge) => badge.value);
  const summary = renderSessionSummary(
    session,
    filteredUsage,
    hasRange && detail.sessionLogs
      ? filterLogsByRange(detail.sessionLogs, cursorStart, cursorEnd)
      : undefined,
    hasRange,
  );

  return html`
    <section
      class="usage-session-inspection"
      tabindex="-1"
      aria-label=${t("usage.details.inspection")}
    >
      <div class="usage-inspection-heading">
        <h3>${t("usage.details.inspection")}</h3>
        <a href="#usage-sessions">${t("usage.details.backToSessions")} ↑</a>
      </div>
      <div class="session-detail-panel">
        <header class="session-detail-heading">
          <div class="session-detail-header">
            <div class="session-detail-header-left">
              <openclaw-tooltip .content=${label} .disabled=${label.length <= 50} open-on-click>
                <div
                  class="session-detail-title"
                  tabindex=${label.length > 50 ? 0 : nothing}
                  aria-label=${label}
                >
                  ${label}
                  ${cursorIndicator
                    ? html`<span class="session-detail-indicator">${cursorIndicator}</span>`
                    : nothing}
                </div>
              </openclaw-tooltip>
            </div>
            <div class="session-detail-stats">
              ${usage
                ? html`
                    <span
                      ><strong>${formatUsageTokens(headerStats.totalTokens)}</strong>
                      ${normalizeLowercaseStringOrEmpty(t("usage.metrics.tokens"))}</span
                    >
                    <span class="session-detail-cost"
                      ><strong>
                        ${formatAnalysisCost(headerStats.totalCost, usage.missingCostEntries)}
                      </strong></span
                    >
                  `
                : nothing}
            </div>
            <openclaw-tooltip .content=${t("usage.details.close")}>
              <button
                class="btn btn--sm btn--ghost session-detail-close"
                @click=${callbacks.filters.onClearSessions}
                aria-label=${t("usage.details.close")}
              >
                ×
              </button>
            </openclaw-tooltip>
          </div>
        </header>
        <div class="session-detail-content">
          <div class="session-detail-metadata">
            ${label.length > 50
              ? html`<div class="session-detail-full-label">${label}</div>`
              : nothing}
            ${label !== session.key
              ? html`<div class="session-detail-key">${session.key}</div>`
              : nothing}
            ${session.scope === "family" && session.includedSessionIds?.length
              ? html`<div class="usage-lineage-note">
                  ${t("usage.scope.familyIncluded", {
                    count: session.includedSessionIds.length.toLocaleString("en-US"),
                  })}
                </div>`
              : nothing}
            ${badges.length
              ? html`<div class="usage-badges">
                  ${badges.map(
                    (badge) => html`<span class="session-detail-identity">
                      <span class="session-detail-identity-label"
                        >${t(`usage.filters.${badge.label}`)}</span
                      >
                      <span class="session-detail-identity-value">${badge.value}</span>
                    </span>`,
                  )}
                </div>`
              : nothing}
          </div>
          ${summary.figures} ${summary.toolsModels}
          ${renderTimeSeriesCompact({ detail, filters, callbacks })}
          <div class="usage-inspection-bottom">
            ${renderSessionLogsCompact({ detail, callbacks })}
            ${renderContextPanel(
              detail.context,
              usage,
              display.contextExpanded,
              callbacks.details.onToggleContextExpanded,
            )}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTimeSeriesCompact({
  detail,
  filters: { startDate, endDate, selectedDays, timeZone },
  callbacks: { details: actions },
}: Pick<UsageDetailViewProps, "detail" | "filters" | "callbacks">) {
  const {
    timeSeries,
    timeSeriesLoading: loading,
    timeSeriesStatus: status,
    timeSeriesMode: mode,
    timeSeriesBreakdownMode: breakdownMode,
    timeSeriesCursorStart: cursorStart,
    timeSeriesCursorEnd: cursorEnd,
  } = detail;
  const title = html`<div class="card-title usage-section-title">
    ${t("usage.details.usageOverTime")}
  </div>`;
  const initialLoading = (loading || status.awaitingGateway) && !status.hasLoaded;
  const initialError = status.error && !status.hasLoaded;
  const refreshStatus = initialLoading
    ? nothing
    : renderUsageRefreshStatus(status, "usage.details.usageOverTime", "timeline", loading);
  let points = timeSeries?.points ?? [];
  if (startDate || endDate || (selectedDays && selectedDays.length > 0)) {
    const startTs = startDate ? dateBoundaryMs(startDate, timeZone, 0) : 0;
    const endTs = endDate ? dateBoundaryMs(endDate, timeZone, 1) : Infinity;
    const selectedDaySet = selectedDays?.length ? new Set(selectedDays) : undefined;
    points = points.filter((p) => {
      if (p.timestamp < startTs || p.timestamp >= endTs) {
        return false;
      }
      if (selectedDaySet) {
        return selectedDaySet.has(usageDateKey(p.timestamp, timeZone));
      }
      return true;
    });
  }
  if (initialLoading || initialError || points.length < 2) {
    const emptyKey = initialError
      ? null
      : !timeSeries || timeSeries.points.length < 2
        ? "usage.details.noTimeline"
        : "usage.details.noDataInRange";
    return html`
      <div class="session-timeseries-compact">
        ${title} ${refreshStatus}
        ${initialLoading
          ? renderUsageDetailSkeleton("timeline", t("usage.details.usageOverTime"))
          : emptyKey
            ? html`<div class="usage-empty-block">${t(emptyKey)}</div>`
            : nothing}
      </div>
    `;
  }
  let cumTokens = 0,
    cumCost = 0;
  points = points.map((p) => {
    cumTokens += p.totalTokens;
    cumCost += p.cost;
    return { ...p, cumulativeTokens: cumTokens, cumulativeCost: cumCost };
  });

  const hasSelection = cursorStart != null && cursorEnd != null;
  const rangeStartTs = hasSelection ? Math.min(cursorStart, cursorEnd) : 0;
  const rangeEndTs = hasSelection ? Math.max(cursorStart, cursorEnd) : Infinity;

  let rangeStartIdx = 0;
  let rangeEndIdx = points.length;
  if (hasSelection) {
    rangeStartIdx = points.findIndex((p) => p.timestamp >= rangeStartTs);
    if (rangeStartIdx === -1) {
      rangeStartIdx = points.length;
    }
    const endIdx = points.findIndex((p) => p.timestamp > rangeEndTs);
    rangeEndIdx = endIdx === -1 ? points.length : endIdx;
  }

  const filteredPoints = hasSelection ? points.slice(rangeStartIdx, rangeEndIdx) : points;
  const filteredTokens = { output: 0, input: 0, cacheRead: 0, cacheWrite: 0 };
  for (const p of filteredPoints) {
    for (const { key } of USAGE_TOKEN_CATEGORIES) {
      filteredTokens[key] += p[key];
    }
  }

  const width = 400,
    height = 200;
  const padding = { top: 8, right: 4, bottom: 8, left: 4 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const isCumulative = mode === "cumulative";
  const breakdownByType = mode === "per-turn" && breakdownMode === "by-type";
  const timeZoneOptions: Intl.DateTimeFormatOptions = timeZone === "utc" ? { timeZone: "UTC" } : {};
  const firstTimestamp = expectDefined(points[0], "time series first point").timestamp;
  const lastTimestamp = expectDefined(points.at(-1), "time series last point").timestamp;
  const formatRangeTime = (timestamp: number, start: number, end: number) => {
    const startDay = usageDateKey(start, timeZone);
    const endDay = usageDateKey(end, timeZone);
    const sameDay = startDay === endDay;
    const options: Intl.DateTimeFormatOptions = {
      ...timeZoneOptions,
      hour: "2-digit",
      minute: "2-digit",
      ...(sameDay ? {} : { month: "short", day: "numeric" }),
      ...(startDay.slice(0, 4) === endDay.slice(0, 4) ? {} : { year: "numeric" }),
    };
    return (sameDay ? formatTimeMs : formatDateTimeMs)(timestamp, options, "");
  };

  const totalTypeTokens = Object.values(filteredTokens).reduce(
    (total, tokens) => total + tokens,
    0,
  );
  const barTotals = points.map((p) =>
    isCumulative
      ? p.cumulativeTokens
      : breakdownByType
        ? p.input + p.output + p.cacheRead + p.cacheWrite
        : p.totalTokens,
  );
  const maxValue = Math.max(...barTotals, 1);
  // Ensure bars + gaps fit exactly within chartWidth
  const slotWidth = chartWidth / points.length; // space per bar including gap
  const barWidth = Math.min(CHART_MAX_BAR_WIDTH, Math.max(1, slotWidth * CHART_BAR_WIDTH_RATIO));
  const barGap = slotWidth - barWidth;

  const leftHandleX = padding.left + rangeStartIdx * (barWidth + barGap);
  const rightHandleX =
    rangeEndIdx >= points.length
      ? padding.left + (points.length - 1) * (barWidth + barGap) + barWidth // right edge of last bar
      : padding.left + (rangeEndIdx - 1) * (barWidth + barGap) + barWidth; // right edge of last selected bar

  const cumulativeXs = points.map((_, index) => padding.left + index * slotWidth + barWidth / 2);
  const cumulativePath = isCumulative
    ? smoothPath(barTotals, cumulativeXs, chartWidth, chartHeight, maxValue, false)
    : "";
  const renderCumulativeArea = () => svg`
    <path class="ts-area" d=${`${cumulativePath} L${cumulativeXs.at(-1)},${chartHeight} L${cumulativeXs[0]},${chartHeight} Z`}></path>
    <path class="ts-line" d=${cumulativePath} vector-effect="non-scaling-stroke"></path>
  `;

  const makeDragHandler = (side: "left" | "right") => (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    const svgEl = handle.closest(".timeseries-chart-wrapper")?.querySelector("svg");
    if (!svgEl) {
      return;
    }
    // Capture geometry once; range updates rerender while this drag remains active
    const rect = svgEl.getBoundingClientRect();
    const svgWidth = rect.width;
    const chartLeftPx = (padding.left / width) * svgWidth;
    const chartRightPx = ((width - padding.right) / width) * svgWidth;
    const chartW = chartRightPx - chartLeftPx;

    const posToIdx = (clientX: number) => {
      const x = Math.max(0, Math.min(1, (clientX - rect.left - chartLeftPx) / chartW));
      return Math.min(Math.floor(x * points.length), points.length - 1);
    };

    // Compute click offset: where on the handle the user grabbed
    const handleSvgX = side === "left" ? leftHandleX : rightHandleX;
    const handleClientX = rect.left + (handleSvgX / width) * svgWidth;
    const grabOffset = e.clientX - handleClientX;

    handle.setPointerCapture(e.pointerId);
    const drag = new AbortController();
    const handleMove = (me: PointerEvent) => {
      if (me.pointerId !== e.pointerId) {
        return;
      }
      const adjustedX = me.clientX - grabOffset;
      const idx = posToIdx(adjustedX);
      const pt = points[idx];
      if (!pt) {
        return;
      }
      const left = side === "left";
      const boundary = left
        ? (cursorEnd ?? expectDefined(points.at(-1), "time series right cursor point").timestamp)
        : (cursorStart ?? expectDefined(points[0], "time series left cursor point").timestamp);
      // Clamp the dragged handle against its fixed sibling to preserve range ordering.
      actions.onTimeSeriesCursorRangeChange(
        left ? Math.min(pt.timestamp, boundary) : boundary,
        left ? boundary : Math.max(pt.timestamp, boundary),
      );
    };

    // Pointerup/cancel releases capture; listeners stay owned by this handle.
    handle.addEventListener("pointermove", handleMove, { signal: drag.signal });
    handle.addEventListener("lostpointercapture", () => drag.abort(), {
      once: true,
      signal: drag.signal,
    });
  };

  return html`
    <div class="session-timeseries-compact">
      <div class="timeseries-header-row">
        ${title}
        <div class="timeseries-controls">
          ${hasSelection
            ? html`
                <div class="settings-segmented small">
                  <button
                    class="btn btn--sm settings-segmented__btn settings-segmented__btn--active"
                    @click=${() => actions.onTimeSeriesCursorRangeChange(null, null)}
                  >
                    ${t("usage.details.reset")}
                  </button>
                </div>
              `
            : nothing}
          ${renderSettingsSegmented({
            mode: "buttons",
            ariaPressed: false,
            className: "small",
            value: mode,
            onChange: actions.onTimeSeriesModeChange,
            onReselect: actions.onTimeSeriesModeChange,
            options: [
              { value: "per-turn", label: t("usage.details.perSample") },
              { value: "cumulative", label: t("usage.details.cumulative") },
            ],
          })}
          ${!isCumulative
            ? renderSettingsSegmented({
                mode: "buttons",
                ariaPressed: false,
                className: "small",
                value: breakdownMode,
                onChange: actions.onTimeSeriesBreakdownChange,
                onReselect: actions.onTimeSeriesBreakdownChange,
                options: [
                  { value: "total", label: t("usage.daily.total") },
                  { value: "by-type", label: t("usage.daily.byType") },
                ],
              })
            : nothing}
        </div>
      </div>
      ${refreshStatus}
      <div class="timeseries-chart">
        <div class="timeseries-scale">
          <span class="ts-axis-label">${formatUsageTokens(maxValue)}</span>
          <span class="ts-axis-label">0</span>
        </div>
        <div class="timeseries-chart-wrapper">
          <svg
            viewBox="0 0 ${width} ${height}"
            height=${height}
            preserveAspectRatio="none"
            class="timeseries-svg"
          >
            ${[
              {
                x1: padding.left,
                y1: padding.top,
                x2: padding.left,
                y2: padding.top + chartHeight,
              },
              {
                x1: padding.left,
                y1: padding.top + chartHeight,
                x2: width - padding.right,
                y2: padding.top + chartHeight,
              },
            ].map(
              ({ x1, y1, x2, y2 }) =>
                svg`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--border)" />`,
            )}
            ${isCumulative
              ? svg`
              <g transform=${`translate(0,${padding.top})`} opacity=${hasSelection ? 0.25 : 1}>${renderCumulativeArea()}</g>
              ${hasSelection && rightHandleX > leftHandleX ? svg`<svg x=${leftHandleX} y=${padding.top} width=${rightHandleX - leftHandleX} height=${chartHeight} viewBox=${`${leftHandleX} 0 ${rightHandleX - leftHandleX} ${chartHeight}`} preserveAspectRatio="none" overflow="hidden">${renderCumulativeArea()}</svg>` : nothing}
            `
              : nothing}
            ${points.map((p, i) => {
              const val = expectDefined(barTotals[i], "time series bar total");
              const x = padding.left + i * (barWidth + barGap);
              const bh = (val / maxValue) * chartHeight;
              const y = padding.top + chartHeight - bh;
              const tooltipLines = [
                formatDateTimeMs(
                  p.timestamp,
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    ...timeZoneOptions,
                  },
                  "",
                ),
                `${formatUsageTokens(val)} ${normalizeLowercaseStringOrEmpty(t("usage.metrics.tokens"))}`,
              ];
              if (breakdownByType) {
                tooltipLines.push(
                  ...USAGE_TOKEN_CATEGORIES.map(
                    ({ key, short }) => `${short} ${formatUsageTokens(p[key])}`,
                  ),
                );
              }
              const tooltip = tooltipLines.join(" · ");
              const isOutside = hasSelection && (i < rangeStartIdx || i >= rangeEndIdx);

              if (isCumulative) {
                return svg`<rect x=${x} y=${padding.top} width=${slotWidth} height=${chartHeight} fill="transparent" data-tooltip=${tooltip} aria-label=${tooltip}></rect>`;
              }
              if (!breakdownByType) {
                return svg`<rect x="${x}" y="${y}" width="${barWidth}" height="${bh}" class="ts-bar${isOutside ? " dimmed" : ""}" rx="1" data-tooltip=${tooltip} aria-label=${tooltip}></rect>`;
              }
              let yC = padding.top + chartHeight;
              const dim = isOutside ? " dimmed" : "";
              return svg`
              ${USAGE_TOKEN_CATEGORIES.map(({ key, className }) => {
                const value = p[key];
                if (value <= 0 || val <= 0) {
                  return nothing;
                }
                const sh = bh * (value / val);
                yC -= sh;
                return svg`<rect x="${x}" y="${yC}" width="${barWidth}" height="${sh}" class="ts-bar ${className}${dim}" rx="1" data-tooltip=${tooltip} aria-label=${tooltip}></rect>`;
              })}
            `;
            })}
            <!-- Selection highlight overlay (always visible between handles) -->
            ${svg`
            <rect 
              x="${leftHandleX}" 
              y="${padding.top}" 
              width="${Math.max(1, rightHandleX - leftHandleX)}" 
              height="${chartHeight}" 
              fill="var(--accent)" 
              opacity="${CHART_SELECTION_OPACITY}" 
              pointer-events="none"
            />
          `}
            ${[leftHandleX, rightHandleX].map(
              (handleX) => svg`
              <line x1="${handleX}" y1="${padding.top}" x2="${handleX}" y2="${padding.top + chartHeight}" stroke="var(--accent)" stroke-width="0.8" opacity="0.7" />
              <rect x="${handleX - HANDLE_WIDTH / 2}" y="${padding.top + chartHeight / 2 - HANDLE_HEIGHT / 2}" width="${HANDLE_WIDTH}" height="${HANDLE_HEIGHT}" rx="1.5" fill="var(--accent)" class="cursor-handle" />
              ${[-HANDLE_GRIP_OFFSET, HANDLE_GRIP_OFFSET].map(
                (offset) =>
                  svg`<line x1="${handleX + offset}" y1="${padding.top + chartHeight / 2 - HANDLE_HEIGHT / 5}" x2="${handleX + offset}" y2="${padding.top + chartHeight / 2 + HANDLE_HEIGHT / 5}" stroke="var(--bg)" stroke-width="0.4" pointer-events="none" />`,
              )}
            `,
            )}
          </svg>
          <!-- Handle drag zones (only on handles, not full chart) -->
          ${(["left", "right"] as const).map((side) => {
            const x = side === "left" ? leftHandleX : rightHandleX;
            return html`<div
              class="chart-handle-zone chart-handle-${side}"
              style="--cursor-position: ${((x / width) * 100).toFixed(1)}%;"
              @pointerdown=${makeDragHandler(side)}
            ></div>`;
          })}
        </div>
        <div class="timeseries-ticks">
          ${[firstTimestamp, lastTimestamp].map(
            (timestamp) => html`<span class="ts-axis-label">
              ${formatRangeTime(timestamp, firstTimestamp, lastTimestamp)}
            </span>`,
          )}
        </div>
      </div>
      <div class="timeseries-summary">
        ${hasSelection
          ? html`
              <span class="timeseries-summary__range">
                ${t("usage.details.sampleRange", {
                  start: (rangeStartIdx + 1).toLocaleString("en-US"),
                  end: rangeEndIdx.toLocaleString("en-US"),
                  total: points.length.toLocaleString("en-US"),
                })}
              </span>
              ·
              ${formatRangeTime(rangeStartTs, rangeStartTs, rangeEndTs)}–${formatRangeTime(
                rangeEndTs,
                rangeStartTs,
                rangeEndTs,
              )}
              · ${formatUsageTokens(totalTypeTokens)} ·
              ${formatUsageCost(filteredPoints.reduce((s, p) => s + (p.cost || 0), 0))}
            `
          : html`${points.length.toLocaleString("en-US")} ${t("usage.details.samples")} ·
            ${formatUsageTokens(cumTokens)} · ${formatUsageCost(cumCost)}`}
      </div>
      ${breakdownByType
        ? renderCostBreakdownCompact({
            mode: "tokens",
            values: filteredTokens,
            total: totalTypeTokens,
            variant: "timeline",
          })
        : nothing}
    </div>
  `;
}

function renderContextPanel(
  { weight: contextWeight, loading, status }: UsageContextDetail,
  usage: UsageSessionEntry["usage"],
  expanded: boolean,
  onToggleExpanded: () => void,
) {
  const initialLoading = (loading || status.awaitingGateway) && !status.hasLoaded;
  const refreshStatus = initialLoading
    ? nothing
    : renderUsageRefreshStatus(status, "usage.details.systemPromptBreakdown", "context", loading);
  const title = html`<div class="card-title usage-section-title">
    ${t("usage.details.systemPromptBreakdown")}
  </div>`;
  if (!contextWeight) {
    return html`
      <div class="context-details-panel">
        <div class="context-breakdown-header">${title}</div>
        ${refreshStatus}
        ${initialLoading
          ? renderUsageDetailSkeleton("context", t("usage.details.systemPromptBreakdown"))
          : status.error
            ? nothing
            : html`<div class="usage-empty-block">${t("usage.details.noContextData")}</div>`}
      </div>
    `;
  }
  const groups = [
    {
      className: "skills",
      labelKey: "usage.details.skills",
      tokens: charsToTokens(contextWeight.skills.promptChars),
      entries: contextWeight.skills.entries.map(({ name, blockChars }) => ({
        name,
        chars: blockChars,
      })),
    },
    {
      className: "tools",
      labelKey: "usage.details.tools",
      tokens: charsToTokens(contextWeight.tools.listChars + contextWeight.tools.schemaChars),
      entries: contextWeight.tools.entries.map(({ name, summaryChars, schemaChars }) => ({
        name,
        chars: summaryChars + schemaChars,
      })),
    },
    {
      className: "files",
      labelKey: "usage.details.files",
      tokens: charsToTokens(
        contextWeight.injectedWorkspaceFiles.reduce(
          (sum, file) =>
            file.injectionStatus === "native_unverified" ? sum : sum + file.injectedChars,
          0,
        ),
      ),
      entries: contextWeight.injectedWorkspaceFiles.map(({ name, injectedChars }) => ({
        name,
        chars: injectedChars,
      })),
    },
  ].map(({ className, labelKey, tokens, entries }) => ({
    className,
    labelKey,
    tokens,
    entries: entries.toSorted((left, right) => {
      if (left.chars === null) {
        return right.chars === null ? 0 : 1;
      }
      return right.chars === null ? -1 : right.chars - left.chars;
    }),
  }));
  const categories = [
    {
      className: "system",
      labelKey: "usage.details.system",
      tokens: charsToTokens(contextWeight.systemPrompt.chars),
    },
    ...groups,
  ];
  const totalContextTokens = categories.reduce((sum, { tokens }) => sum + tokens, 0);
  const inputTokens = usage && usage.totalTokens > 0 ? usage.input + usage.cacheRead : 0;
  const contextDescription =
    inputTokens > 0
      ? `~${Math.min((totalContextTokens / inputTokens) * 100, 100).toFixed(0)}% ${t("usage.details.ofInput")}`
      : t("usage.details.baseContextPerMessage");
  const defaultLimit = 4;
  const hasMore = groups.some(({ entries }) => entries.length > defaultLimit);

  return html`
    <div class="context-details-panel">
      <div class="context-breakdown-header">
        ${title}
        ${hasMore
          ? html`<button class="btn btn--sm" @click=${onToggleExpanded}>
              ${expanded ? t("usage.details.collapse") : t("usage.details.expandAll")}
            </button>`
          : nothing}
      </div>
      ${refreshStatus}
      <p class="context-weight-desc">${contextDescription}</p>
      <div class="context-stacked-bar">
        ${categories.map(
          ({ className, labelKey, tokens }) => html`
            <div
              class="context-segment ${className}"
              style="width: ${pct(tokens, totalContextTokens).toFixed(1)}%"
              title="${t(labelKey)}: ~${formatUsageTokens(tokens)}"
            ></div>
          `,
        )}
      </div>
      <div class="context-legend">
        ${categories.map(
          ({ className, labelKey, tokens }) => html`
            <span class="legend-item"
              ><span class="legend-dot ${className}"></span>${t(
                className === "system" ? "usage.details.systemShort" : labelKey,
              )}
              ~${formatUsageTokens(tokens)}</span
            >
          `,
        )}
      </div>
      <div class="context-total">
        ${t("usage.breakdown.total")}: ~${formatUsageTokens(totalContextTokens)}
      </div>
      <div class="context-breakdown-grid">
        ${groups
          .filter(({ entries }) => entries.length > 0)
          .map(({ labelKey, entries }) => {
            const visible = expanded ? entries : entries.slice(0, defaultLimit);
            const more = entries.length - visible.length;
            return html`
              <div class="context-breakdown-card">
                <div class="context-breakdown-title">${t(labelKey)} (${entries.length})</div>
                <div class="context-breakdown-list">
                  ${visible.map(
                    ({ name, chars }) => html`
                      <div class="context-breakdown-item">
                        <span class="mono" title=${name}>${name}</span>
                        <span class="muted"
                          >${chars === null
                            ? t("usage.common.unknown")
                            : `~${formatUsageTokens(charsToTokens(chars))}`}</span
                        >
                      </div>
                    `,
                  )}
                </div>
                ${more > 0
                  ? html`
                      <div class="context-breakdown-more">
                        ${t("usage.sessions.more", { count: String(more) })}
                      </div>
                    `
                  : nothing}
              </div>
            `;
          })}
      </div>
    </div>
  `;
}

function renderSessionLogsCompact({
  detail,
  callbacks: { details: actions },
}: Pick<UsageDetailViewProps, "detail" | "callbacks">) {
  const {
    sessionLogs: logs,
    sessionLogsLoading: loading,
    sessionLogsStatus: status,
    sessionLogsExpanded: expandedAll,
    logFilters: filters,
    timeSeriesCursorStart: cursorStart,
    timeSeriesCursorEnd: cursorEnd,
  } = detail;
  const initialLoading = (loading || status.awaitingGateway) && !status.hasLoaded;
  const initialError = status.error && !status.hasLoaded;
  const refreshStatus = initialLoading
    ? nothing
    : renderUsageRefreshStatus(status, "usage.details.conversation", "conversation", loading);
  if (initialLoading || initialError || !logs?.length) {
    return html`
      <div class="session-logs-compact">
        <div class="session-logs-header">${t("usage.details.conversation")}</div>
        ${refreshStatus}
        ${initialLoading
          ? renderUsageDetailSkeleton("conversation", t("usage.details.conversation"))
          : initialError
            ? nothing
            : html`<div class="usage-empty-block">${t("usage.details.noMessages")}</div>`}
      </div>
    `;
  }

  const normalizedQuery = normalizeLowercaseStringOrEmpty(filters.query);
  const entries = logs.map((log) => {
    const toolInfo = parseToolSummary(log.content);
    const cleanContent = toolInfo.cleanContent || log.content;
    return { log, toolInfo, cleanContent };
  });
  const toolOptions = Array.from(
    new Set(entries.flatMap((entry) => entry.toolInfo.tools.map(([name]) => name))),
  ).toSorted((a, b) => a.localeCompare(b));
  const hasCursorFilter = cursorStart != null && cursorEnd != null;
  const cursorMin = hasCursorFilter ? Math.min(cursorStart, cursorEnd) : 0;
  const cursorMax = hasCursorFilter ? Math.max(cursorStart, cursorEnd) : Infinity;
  const filteredEntries = entries.filter((entry) => {
    // Filter by cursor timeline range (only if logs cover the range)
    if (hasCursorFilter && entry.log.timestamp > 0) {
      const timestamp = normalizeLogTimestamp(entry.log.timestamp);
      if (timestamp < cursorMin || timestamp > cursorMax) {
        return false;
      }
    }
    return (
      (filters.roles.length === 0 || filters.roles.includes(entry.log.role)) &&
      (!filters.hasTools || entry.toolInfo.tools.length > 0) &&
      (filters.tools.length === 0 ||
        entry.toolInfo.tools.some(([name]) => filters.tools.includes(name))) &&
      (!normalizedQuery ||
        normalizeLowercaseStringOrEmpty(entry.cleanContent).includes(normalizedQuery))
    );
  });
  const hasActiveFilters =
    filters.roles.length > 0 || filters.tools.length > 0 || filters.hasTools || normalizedQuery;
  const displayedCount =
    hasActiveFilters || hasCursorFilter
      ? `${filteredEntries.length.toLocaleString("en-US")} ${t("usage.details.of")} ${logs.length.toLocaleString("en-US")}${hasCursorFilter ? ` (${t("usage.details.timelineFiltered")})` : ""}`
      : `${logs.length.toLocaleString("en-US")}`;

  const roleSelected = new Set(filters.roles);
  const toolSelected = new Set(filters.tools);

  return html`
    <div class="session-logs-compact">
      <div class="session-logs-header">
        <span>
          ${t("usage.details.conversation")}
          <span class="session-logs-header-count">
            (${displayedCount} ${normalizeLowercaseStringOrEmpty(t("usage.overview.messages"))})
            ${hasCursorFilter ? nothing : html` · ${t("usage.details.fullSession")}`}
          </span>
        </span>
        <button class="btn btn--sm" @click=${actions.onToggleSessionLogsExpanded}>
          ${expandedAll ? t("usage.details.collapseAll") : t("usage.details.expandAll")}
        </button>
      </div>
      ${refreshStatus}
      <div class="session-log-filters">
        <div class="session-log-filter-chips">
          <div
            class="session-log-role-chips"
            role="group"
            aria-label=${t("usage.details.filterByRole")}
          >
            ${(
              [
                ["user", "usage.overview.user"],
                ["assistant", "usage.overview.assistant"],
                ["tool", "usage.details.tool"],
                ["toolResult", "usage.details.toolResult"],
              ] as const
            ).map(
              ([role, labelKey]) => html`<button
                type="button"
                class="btn btn--sm session-log-filter-chip"
                aria-pressed=${roleSelected.has(role)}
                @click=${() =>
                  actions.onLogFilterRolesChange(
                    roleSelected.has(role)
                      ? filters.roles.filter((selected) => selected !== role)
                      : [...filters.roles, role],
                  )}
              >
                ${t(labelKey)}
              </button>`,
            )}
          </div>
          <div
            class="session-log-tool-chips"
            role="group"
            aria-label=${t("usage.details.filterByTool")}
          >
            ${toolOptions.map(
              (tool) => html`<button
                type="button"
                class="btn btn--sm session-log-filter-chip"
                aria-pressed=${toolSelected.has(tool)}
                @click=${() =>
                  actions.onLogFilterToolsChange(
                    toolSelected.has(tool)
                      ? filters.tools.filter((selected) => selected !== tool)
                      : [...filters.tools, tool],
                  )}
              >
                ${tool}
              </button>`,
            )}
          </div>
          <button
            type="button"
            class="btn btn--sm session-log-filter-chip"
            aria-pressed=${filters.hasTools}
            @click=${() => actions.onLogFilterHasToolsChange(!filters.hasTools)}
          >
            ${t("usage.details.hasTools")}
          </button>
        </div>
        <div class="session-log-search-row">
          <input
            class="settings-input"
            type="text"
            placeholder=${t("usage.details.searchConversation")}
            aria-label=${t("usage.details.searchConversation")}
            .value=${filters.query}
            @input=${(event: Event) =>
              actions.onLogFilterQueryChange((event.target as HTMLInputElement).value)}
          />
          <button type="button" class="btn btn--sm" @click=${actions.onLogFilterClear}>
            ${t("usage.filters.clear")}
          </button>
        </div>
      </div>
      <div class="session-logs-list">
        ${filteredEntries.map((entry) => {
          const { log, toolInfo, cleanContent } = entry;
          const roleClass = log.role === "user" ? "user" : "assistant";
          const roleLabel =
            log.role === "user"
              ? t("usage.details.you")
              : log.role === "assistant"
                ? t("usage.overview.assistant")
                : t("usage.details.tool");
          return html`
            <div class="session-log-entry ${roleClass}">
              <div class="session-log-meta">
                <span class="session-log-role">${roleLabel}</span>
                <span>${formatMs(log.timestamp)}</span>
                ${log.tokens ? html`<span>${formatUsageTokens(log.tokens)}</span>` : nothing}
              </div>
              <div class="session-log-content">${cleanContent}</div>
              ${toolInfo.tools.length > 0
                ? html`
                    <details class="session-log-tools" ?open=${expandedAll}>
                      <summary>${toolInfo.summary}</summary>
                      <div class="session-log-tools-list">
                        ${toolInfo.tools.map(
                          ([name, count]) => html`
                            <span class="session-log-tools-pill"
                              >${name} × ${count.toLocaleString("en-US")}</span
                            >
                          `,
                        )}
                      </div>
                    </details>
                  `
                : nothing}
            </div>
          `;
        })}
        ${filteredEntries.length === 0
          ? html`
              <div class="usage-empty-block usage-empty-block--compact">
                ${t("usage.details.noMessagesMatch")}
              </div>
            `
          : nothing}
      </div>
    </div>
  `;
}

export { renderSessionDetailPanel };
/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
