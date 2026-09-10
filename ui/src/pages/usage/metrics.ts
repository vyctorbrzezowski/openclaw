import { normalizeLowercaseStringOrEmpty } from "@openclaw/normalization-core/string-coerce";
import { html, nothing } from "lit";
import {
  addCostUsageTotals,
  createEmptyCostUsageTotals,
} from "../../../../src/infra/session-cost-usage-totals.js";
import { createUsageAggregateAccumulator } from "../../../../src/shared/usage-aggregates.js";
import { t } from "../../i18n/index.ts";
import { formatCompactTokenCount } from "../../lib/format.ts";
import type { UsageSessionEntry, UsageTotals, UsageAggregates } from "./types.ts";

const CHARS_PER_TOKEN = 4;
const DAY_MS = 86_400_000;

export const USAGE_TOKEN_CATEGORIES = (
  [
    ["output", "usage.details.assistantOutputTokens", "Out", "--usage-token-output"],
    ["input", "usage.details.userToolInputTokens", "In", "--usage-token-input"],
    ["cacheWrite", "usage.details.tokensWrittenToCache", "CW", "--usage-token-cache-write"],
    ["cacheRead", "usage.details.tokensReadFromCache", "CR", "--usage-token-cache-read"],
  ] as const
).map(([key, hintKey, short, color]) => ({
  key,
  costKey: `${key}Cost` as const,
  className: `usage-token-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
  labelKey: `usage.breakdown.${key}`,
  hintKey,
  short,
  color,
}));

type UsageCostWindowSummary = {
  days: number;
  startDate: string;
  endDate: string;
  totals: UsageTotals;
};

function charsToTokens(chars: number): number {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function formatUsageTokens(n: number): string {
  return formatCompactTokenCount(n, { thousandsSuffix: "K", trimTrailingZero: false });
}

// Usage charts choose fixed precision from the surrounding scale; the shared
// adaptive cost formatter would change labels as values cross its thresholds.
function formatUsageCost(n: number, decimals = 2): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatAnalysisCost(value: number, missingCostEntries = 0): string {
  if (value === 0 && missingCostEntries > 0) return "—";
  const magnitude = Math.abs(value);
  const decimals = magnitude === 0 || magnitude >= 0.01 ? 2 : magnitude >= 0.0001 ? 4 : 6;
  const formatted =
    magnitude > 0 && magnitude < 0.0000005
      ? value < 0
        ? ">-$0.000001"
        : "<$0.000001"
      : formatUsageCost(value, decimals);
  return missingCostEntries > 0 ? `${formatted}*` : formatted;
}

function formatHourLabel(hour: number): string {
  // The bucket hour is already zoned; a fixed UTC date avoids local DST normalization.
  const date = new Date(Date.UTC(1970, 0, 1, hour));
  return date.toLocaleTimeString(undefined, { hour: "numeric", timeZone: "UTC" });
}

function forEachSessionHourSlice(
  session: UsageSessionEntry,
  timeZone: "local" | "utc",
  visitor: (params: {
    usage: NonNullable<UsageSessionEntry["usage"]>;
    hour: number;
    weekday: number;
    share: number;
  }) => void,
) {
  const usage = session.usage;
  if (!usage) {
    return false;
  }

  const start = usage.firstActivity ?? session.updatedAt;
  const end = usage.lastActivity ?? session.updatedAt;
  if (!start || !end) {
    return false;
  }

  const startMs = Math.min(start, end);
  const endMs = Math.max(start, end);

  if (startMs === endMs) {
    const date = new Date(startMs);
    visitor({
      usage,
      hour: getZonedHour(date, timeZone),
      weekday: getZonedWeekday(date, timeZone),
      share: 1,
    });
    return true;
  }

  const totalMinutes = (endMs - startMs) / 60000;
  let cursor = startMs;
  while (cursor < endMs) {
    const date = new Date(cursor);
    const nextHour = setToHourEnd(date, timeZone);
    const nextMs = Math.min(nextHour.getTime(), endMs);
    const minutes = Math.max((nextMs - cursor) / 60000, 0);
    visitor({
      usage,
      hour: getZonedHour(date, timeZone),
      weekday: getZonedWeekday(date, timeZone),
      share: minutes / totalMinutes,
    });
    cursor = nextMs + 1;
  }

  return true;
}

function buildPeakErrorHours(sessions: UsageSessionEntry[], timeZone: "local" | "utc") {
  const hourErrors = Array.from({ length: 24 }, () => 0);
  const hourMsgs = Array.from({ length: 24 }, () => 0);

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage?.messageCounts || usage.messageCounts.total === 0) {
      continue;
    }
    const messageCounts = usage.messageCounts;

    // Prefer precise quarter-hour message counts when available.
    // Data is stored as UTC quarter-hour buckets (quarterIndex 0-95) with UTC date keys.
    // For local view, construct a Date from the UTC components and use getHours()
    // so the browser's DST-aware timezone logic handles offset automatically.
    if (usage.utcQuarterHourMessageCounts && usage.utcQuarterHourMessageCounts.length > 0) {
      for (const quarterHour of usage.utcQuarterHourMessageCounts) {
        const mapped = getHourAndWeekdayForUtcQuarterBucket(
          quarterHour.date,
          quarterHour.quarterIndex,
          timeZone,
        );
        if (!mapped) {
          continue;
        }
        hourErrors[mapped.hour] = (hourErrors[mapped.hour] ?? 0) + quarterHour.errors;
        hourMsgs[mapped.hour] = (hourMsgs[mapped.hour] ?? 0) + quarterHour.total;
      }
      continue;
    }

    // Fallback: time-based proportional allocation (legacy algorithm)
    forEachSessionHourSlice(session, timeZone, ({ hour, share }) => {
      hourErrors[hour] = (hourErrors[hour] ?? 0) + (messageCounts.errors ?? 0) * share;
      hourMsgs[hour] = (hourMsgs[hour] ?? 0) + messageCounts.total * share;
    });
  }

  return hourMsgs
    .map((msgs, hour) => {
      const errors = hourErrors[hour] ?? 0;
      const rate = msgs > 0 ? errors / msgs : 0;
      return {
        hour,
        rate,
        errors,
        msgs,
      };
    })
    .filter((entry) => entry.msgs > 0 && entry.errors > 0)
    .toSorted((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map((entry) => ({
      label: formatHourLabel(entry.hour),
      value: `${(entry.rate * 100).toFixed(2)}%`,
      sub: `${t(Math.round(entry.errors) === 1 ? "usage.overview.errorCountOne" : "usage.overview.errorCountOther", { count: Math.round(entry.errors).toLocaleString("en-US") }).replaceAll(" ", "\u00a0")} · ${formatUsageTokens(Math.round(entry.msgs))}\u00a0${t("usage.overview.messagesAbbrev")}`,
    }));
}

type UsageMosaicStats = {
  hasData: boolean;
  totalTokens: number;
  hourTotals: number[];
  weekdayTotals: Array<{ label: string; tokens: number }>;
};

function getZonedHour(date: Date, zone: "local" | "utc"): number {
  return zone === "utc" ? date.getUTCHours() : date.getHours();
}

function getZonedWeekday(date: Date, zone: "local" | "utc"): number {
  return zone === "utc" ? date.getUTCDay() : date.getDay();
}

function getUtcQuarterHourBucketDate(dateStr: string, quarterIndex: number): Date | null {
  if (!Number.isInteger(quarterIndex) || quarterIndex < 0 || quarterIndex > 95) {
    return null;
  }
  const date = parseYmdDate(dateStr, "utc");
  date?.setUTCMinutes(quarterIndex * 15);
  return date;
}

function getHourAndWeekdayForUtcQuarterBucket(
  dateStr: string,
  quarterIndex: number,
  timeZone: "local" | "utc",
): { hour: number; weekday: number } | null {
  const date = getUtcQuarterHourBucketDate(dateStr, quarterIndex);
  if (!date) {
    return null;
  }
  return {
    hour: getZonedHour(date, timeZone),
    weekday: getZonedWeekday(date, timeZone),
  };
}

function setToHourEnd(date: Date, zone: "local" | "utc"): Date {
  const next = new Date(date);
  if (zone === "utc") {
    next.setUTCMinutes(59, 59, 999);
  } else {
    next.setMinutes(59, 59, 999);
  }
  return next;
}

function forEachSessionTokenUsageBucket(
  session: UsageSessionEntry,
  timeZone: "local" | "utc",
  visitor: (params: { hour: number; weekday: number; tokens: number }) => void,
): boolean {
  const buckets = session.usage?.utcQuarterHourTokenUsage;
  if (!buckets || buckets.length === 0) {
    return false;
  }
  let visited = false;
  for (const bucket of buckets) {
    if (bucket.totalTokens <= 0) {
      continue;
    }
    const mapped = getHourAndWeekdayForUtcQuarterBucket(bucket.date, bucket.quarterIndex, timeZone);
    if (!mapped) {
      continue;
    }
    visited = true;
    visitor({ hour: mapped.hour, weekday: mapped.weekday, tokens: bucket.totalTokens });
  }
  return visited;
}

function sessionSpanTouchesSelectedHours(
  session: UsageSessionEntry,
  hours: number[],
  timeZone: "local" | "utc",
): boolean {
  const usage = session.usage;
  const start = usage?.firstActivity ?? session.updatedAt;
  const end = usage?.lastActivity ?? session.updatedAt;
  if (!start || !end) {
    return false;
  }
  const startMs = Math.min(start, end);
  const endMs = Math.max(start, end);
  let cursor = startMs;
  while (cursor <= endMs) {
    const date = new Date(cursor);
    const hour = getZonedHour(date, timeZone);
    if (hours.includes(hour)) {
      return true;
    }
    const nextHour = setToHourEnd(date, timeZone);
    const nextMs = Math.min(nextHour.getTime(), endMs);
    cursor = nextMs + 1;
  }
  return false;
}

function sessionTouchesSelectedHours(
  session: UsageSessionEntry,
  hours: number[],
  timeZone: "local" | "utc",
): boolean {
  if (hours.length === 0) {
    return true;
  }
  let touches = false;
  const hasPreciseTokenBuckets = forEachSessionTokenUsageBucket(session, timeZone, ({ hour }) => {
    if (hours.includes(hour)) {
      touches = true;
    }
  });
  if (hasPreciseTokenBuckets) {
    return touches;
  }
  return sessionSpanTouchesSelectedHours(session, hours, timeZone);
}

function buildUsageMosaicStats(
  sessions: UsageSessionEntry[],
  timeZone: "local" | "utc",
): UsageMosaicStats {
  const hourTotals = Array.from({ length: 24 }, () => 0);
  const weekdayTotals = Array.from({ length: 7 }, () => 0);
  let totalTokens = 0;
  let hasData = false;

  for (const session of sessions) {
    const usage = session.usage;
    if (!usage || !usage.totalTokens || usage.totalTokens <= 0) {
      continue;
    }
    totalTokens += usage.totalTokens;

    if (
      forEachSessionTokenUsageBucket(session, timeZone, ({ hour, weekday, tokens }) => {
        hourTotals[hour] = (hourTotals[hour] ?? 0) + tokens;
        weekdayTotals[weekday] = (weekdayTotals[weekday] ?? 0) + tokens;
      })
    ) {
      hasData = true;
      continue;
    }

    if (
      !forEachSessionHourSlice(session, timeZone, ({ usage: usageLocal, hour, weekday, share }) => {
        hourTotals[hour] = (hourTotals[hour] ?? 0) + usageLocal.totalTokens * share;
        weekdayTotals[weekday] = (weekdayTotals[weekday] ?? 0) + usageLocal.totalTokens * share;
      })
    ) {
      continue;
    }
    hasData = true;
  }

  const weekdayLabels = [
    t("usage.mosaic.sun"),
    t("usage.mosaic.mon"),
    t("usage.mosaic.tue"),
    t("usage.mosaic.wed"),
    t("usage.mosaic.thu"),
    t("usage.mosaic.fri"),
    t("usage.mosaic.sat"),
  ].map((label, index) => ({
    label,
    tokens: weekdayTotals[index] ?? 0,
  }));

  return {
    hasData,
    totalTokens,
    hourTotals,
    weekdayTotals: weekdayLabels,
  };
}

function renderUsageMosaic(
  sessions: UsageSessionEntry[],
  timeZone: "local" | "utc",
  selectedHours: number[],
  onSelectHour: (hour: number, shiftKey: boolean) => void,
) {
  const stats = buildUsageMosaicStats(sessions, timeZone);
  if (!stats.hasData) {
    return html`<section class="usage-pattern-section">
      <h3>${t("usage.mosaic.title")}</h3>
      <p class="usage-pattern-description">${t("usage.mosaic.subtitleEmpty")}</p>
      <p class="usage-pattern-description">${t("usage.mosaic.noTimelineData")}</p>
    </section>`;
  }

  const hourLabelKeys = ["midnight", "fourAm", "eightAm", "noon", "fourPm", "eightPm"];
  const maxHour = Math.max(...stats.hourTotals, 1);
  const maxWeekday = Math.max(...stats.weekdayTotals.map((d) => d.tokens), 1);

  return html`<section class="usage-pattern-section">
    <div class="usage-pattern-header">
      <div>
        <h3>${t("usage.mosaic.title")}</h3>
        <p class="usage-pattern-description">
          ${t("usage.mosaic.subtitle", {
            zone:
              timeZone === "utc"
                ? t("usage.filters.timeZoneUtc")
                : t("usage.filters.timeZoneLocal"),
          })}
        </p>
      </div>
      <span class="usage-mosaic-total"
        >${formatUsageTokens(stats.totalTokens)}
        ${normalizeLowercaseStringOrEmpty(t("usage.metrics.tokens"))}</span
      >
    </div>
    <div class="usage-mosaic">
      <div class="usage-mosaic-grid">
        <div class="usage-mosaic-section">
          <div class="usage-mosaic-section-title">${t("usage.mosaic.dayOfWeek")}</div>
          <div class="usage-daypart-grid">
            ${stats.weekdayTotals.map((part) => {
              const intensity = Math.min(part.tokens / maxWeekday, 1);
              return html`
                <div class="usage-daypart-cell">
                  <div class="usage-daypart-label">${part.label}</div>
                  <div class="usage-daypart-value" title=${part.tokens.toLocaleString("en-US")}>
                    ${part.tokens.toLocaleString("en-US", {
                      notation: "compact",
                      maximumSignificantDigits: 3,
                    })}
                  </div>
                  <div class="usage-daypart-track" aria-hidden="true">
                    <span style="width: ${(intensity * 100).toFixed(1)}%"></span>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
        <div class="usage-mosaic-section">
          <div class="usage-mosaic-section-title">
            <span>${t("usage.filters.hours")}</span>
            <span class="usage-mosaic-sub">0 → 23</span>
          </div>
          <div class="usage-hour-grid">
            ${stats.hourTotals.map((value, hour) => {
              const intensity = Math.min(value / maxHour, 1);
              const bg =
                value > 0
                  ? `color-mix(in srgb, var(--usage-data-accent) ${(8 + intensity * 70).toFixed(1)}%, transparent)`
                  : "transparent";
              const title = `${hour}:00 · ${formatUsageTokens(value)} ${normalizeLowercaseStringOrEmpty(
                t("usage.metrics.tokens"),
              )}`;
              const border =
                intensity > 0.7
                  ? "color-mix(in srgb, var(--usage-data-accent) 60%, transparent)"
                  : "color-mix(in srgb, var(--usage-data-accent) 24%, transparent)";
              const selected = selectedHours.includes(hour);
              return html`
                <div class="usage-hour-column">
                  <button
                    type="button"
                    class="usage-hour-cell ${selected ? "selected" : ""}"
                    style="background: ${bg}; border-color: ${border};"
                    title="${title}"
                    aria-label=${title}
                    aria-pressed=${selected ? "true" : "false"}
                    @click=${(e: MouseEvent) => onSelectHour(hour, e.shiftKey)}
                  ></button>
                  ${hour % 4 === 0
                    ? html`<span class="usage-hour-label" aria-hidden="true"
                        >${t(`usage.mosaic.${hourLabelKeys[hour / 4]}`)}</span
                      >`
                    : nothing}
                </div>
              `;
            })}
          </div>
          <div class="usage-hour-legend">
            <span></span>
            ${t("usage.mosaic.legend")}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseYmdDate(dateStr: string, zone: "local" | "utc"): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utc = zone === "utc";
  const date = utc ? new Date(Date.UTC(year, monthIndex, day)) : new Date(year, monthIndex, day);
  // Round-trip in the same calendar, retaining rejection of years 0000–0099
  // and local dates skipped by a time-zone transition.
  if (
    (utc ? date.getUTCFullYear() : date.getFullYear()) !== year ||
    (utc ? date.getUTCMonth() : date.getMonth()) !== monthIndex ||
    (utc ? date.getUTCDate() : date.getDate()) !== day
  ) {
    return null;
  }
  return date;
}

function parseIsoDayIndex(dateStr: string): number | null {
  const date = parseYmdDate(dateStr, "utc");
  return date === null ? null : date.getTime() / DAY_MS;
}

function formatIsoDayIndex(dayIndex: number): string {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string, includeYear = false): string {
  const date = parseYmdDate(dateStr, "local");
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
  });
}

function formatFullDate(dateStr: string): string {
  const date = parseYmdDate(dateStr, "local");
  if (!date) {
    return dateStr;
  }
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function buildUsageCostWindowSummary(
  daily: Array<UsageTotals & { date: string }>,
  startDate: string,
  endDate: string,
): UsageCostWindowSummary | null {
  const startDay = parseIsoDayIndex(startDate);
  const endDay = parseIsoDayIndex(endDate);
  if (startDay === null || endDay === null || startDay > endDay) {
    return null;
  }

  const totals = createEmptyCostUsageTotals();
  for (const entry of daily) {
    const day = parseIsoDayIndex(entry.date);
    if (day !== null && day >= startDay && day <= endDay) {
      addCostUsageTotals(totals, entry);
    }
  }

  return {
    days: endDay - startDay + 1,
    startDate,
    endDate,
    totals,
  };
}

function buildUsageCostWindows(
  daily: Array<UsageTotals & { date: string }>,
  rangeStartDate: string,
  rangeEndDate: string,
  periods: number[] = [1, 7, 30, 90],
): UsageCostWindowSummary[] {
  const rangeStartDay = parseIsoDayIndex(rangeStartDate);
  const rangeEndDay = parseIsoDayIndex(rangeEndDate);
  if (rangeStartDay === null || rangeEndDay === null || rangeStartDay > rangeEndDay) {
    return [];
  }

  const rangeDays = rangeEndDay - rangeStartDay + 1;
  return Array.from(new Set(periods.map((days) => Math.max(1, Math.trunc(days)))))
    .filter((days) => days < rangeDays)
    .toSorted((left, right) => left - right)
    .map((days) => {
      const startDate = formatIsoDayIndex(rangeEndDay - days + 1);
      return buildUsageCostWindowSummary(daily, startDate, rangeEndDate);
    })
    .filter((summary): summary is UsageCostWindowSummary => summary !== null);
}

const buildAggregatesFromSessions = (
  sessions: UsageSessionEntry[],
  fallback?: UsageAggregates | null,
): UsageAggregates => {
  if (sessions.length === 0) {
    return (
      fallback ?? {
        messages: { total: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, errors: 0 },
        tools: { totalCalls: 0, uniqueTools: 0, tools: [] },
        byModel: [],
        byProvider: [],
        byAgent: [],
        byChannel: [],
        daily: [],
      }
    );
  }

  const accumulator = createUsageAggregateAccumulator();
  for (const session of sessions) {
    accumulator.add(session);
  }
  return accumulator.finish();
};

type UsageInsightStats = {
  durationCount: number;
  avgDurationMs: number;
  throughputTokensPerMin?: number;
  throughputCostPerMin?: number;
  errorRate: number;
};

const buildUsageInsightStats = (
  sessions: UsageSessionEntry[],
  totals: UsageTotals | null,
  aggregates: UsageAggregates,
): UsageInsightStats => {
  let durationSumMs = 0;
  let durationCount = 0;
  for (const session of sessions) {
    const duration = session.usage?.durationMs ?? 0;
    if (duration > 0) {
      durationSumMs += duration;
      durationCount += 1;
    }
  }

  const avgDurationMs = durationCount ? durationSumMs / durationCount : 0;
  const throughputTokensPerMin =
    totals && durationSumMs > 0 ? totals.totalTokens / (durationSumMs / 60000) : undefined;
  const throughputCostPerMin =
    totals && durationSumMs > 0 ? totals.totalCost / (durationSumMs / 60000) : undefined;

  const errorRate = aggregates.messages.total
    ? aggregates.messages.errors / aggregates.messages.total
    : 0;

  return {
    durationCount,
    avgDurationMs,
    throughputTokensPerMin,
    throughputCostPerMin,
    errorRate,
  };
};

export type { UsageInsightStats };
export {
  buildAggregatesFromSessions,
  buildUsageCostWindowSummary,
  buildUsageCostWindows,
  buildPeakErrorHours,
  buildUsageInsightStats,
  charsToTokens,
  formatAnalysisCost,
  formatUsageCost,
  formatDayLabel,
  formatFullDate,
  formatIsoDate,
  formatUsageTokens,
  renderUsageMosaic,
  sessionTouchesSelectedHours,
};
