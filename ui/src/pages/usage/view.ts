import { html, nothing, type TemplateResult } from "lit";
import {
  addCostUsageTotals,
  createEmptyCostUsageTotals,
} from "../../../../src/infra/session-cost-usage-totals.js";
import { titleForRoute } from "../../app-navigation.ts";
import "../../components/web-awesome-popover.ts";
import { icons } from "../../components/icons.ts";
import { renderSettingsPage, renderSettingsSegmented } from "../../components/settings-ui.ts";
import "../../components/tooltip.ts";
import "../../components/web-awesome.ts";
import { t } from "../../i18n/index.ts";
import { downloadTextFile } from "../../lib/download.ts";
import "../../styles/usage.css";
import { filterSessionsByQuery } from "./helpers.ts";
import {
  buildAggregatesFromSessions,
  buildPeakErrorHours,
  buildUsageInsightStats,
  formatIsoDate,
  formatDayLabel,
  renderUsageMosaic,
  sessionTouchesSelectedHours,
} from "./metrics.ts";
import { buildDailyCsv, buildSessionsCsv, normalizeQueryText } from "./query.ts";
import type { UsageProps, UsageSessionEntry, UsageTotals } from "./types.ts";
import { renderSessionDetailPanel, usageDateKey } from "./view-details.ts";
import { renderUsageDimensions } from "./view-dimensions.ts";
import { renderUsageHeatmap } from "./view-heatmap.ts";
import { renderUsageHero } from "./view-hero.ts";
import { renderUsageLimits } from "./view-limits.ts";
import { renderUsageLoadingState } from "./view-loading.ts";
import {
  renderCostBreakdownCompact,
  renderCostWindowComparison,
  renderFilterChips,
  renderSessionsCard,
} from "./view-overview.ts";
import { renderUsageQuery } from "./view-query.ts";
import { renderUsageOperations } from "./view-summary.ts";

function renderUsageLoadingStatus(label: unknown) {
  return html`
    <span class="settings-status settings-status--accent">
      <span class="usage-loading-spinner" aria-hidden="true"></span>
      ${label}
    </span>
  `;
}

function renderUsageEmptyState(onRefresh: () => void) {
  return html`
    <section class="settings-group usage-panel usage-empty-state">
      <div class="usage-empty-state__title">${t("usage.empty.title")}</div>
      <div class="card-sub usage-empty-state__subtitle">${t("usage.empty.subtitle")}</div>
      <div class="usage-empty-state__actions">
        <button class="btn" @click=${onRefresh}>${t("common.refresh")}</button>
      </div>
    </section>
  `;
}

export function renderUsage(
  props: UsageProps,
  agentScopeControl: TemplateResult | typeof nothing = nothing,
) {
  const { data, filters, display, detail, callbacks } = props;
  const filterActions = callbacks.filters;
  const displayActions = callbacks.display;
  const detailActions = callbacks.details;

  const isTokenMode = display.chartMode === "tokens";
  const hasQuery = filters.query.trim().length > 0;
  const selectedDaySet = new Set(filters.selectedDays);
  const selectedSessionSet = new Set(filters.selectedSessions);

  // Sort sessions by tokens or cost depending on mode
  const sortedSessions = data.sessions.toSorted((a, b) => {
    const valA = isTokenMode ? (a.usage?.totalTokens ?? 0) : (a.usage?.totalCost ?? 0);
    const valB = isTokenMode ? (b.usage?.totalTokens ?? 0) : (b.usage?.totalCost ?? 0);
    return valB - valA;
  });

  const agentScopedSessions = filters.agentId
    ? sortedSessions.filter(
        (s) => normalizeQueryText(s.agentId ?? "") === normalizeQueryText(filters.agentId ?? ""),
      )
    : sortedSessions;

  const hourFilteredSessions =
    filters.selectedHours.length > 0
      ? agentScopedSessions.filter((session) =>
          sessionTouchesSelectedHours(session, filters.selectedHours, filters.timeZone),
        )
      : agentScopedSessions;
  const queryResult = filterSessionsByQuery(hourFilteredSessions, filters.query);
  const matchesSelectedDays = (session: UsageSessionEntry) => {
    if (selectedDaySet.size === 0) {
      return true;
    }
    if (session.usage?.activityDates?.length) {
      return session.usage.activityDates.some((date) => selectedDaySet.has(date));
    }
    return Boolean(
      session.updatedAt && selectedDaySet.has(usageDateKey(session.updatedAt, filters.timeZone)),
    );
  };
  const filteredSessions = queryResult.sessions.filter(matchesSelectedDays);

  // Get first selected session for detail view (timeseries, logs)
  const primarySelectedEntry =
    props.detail.open && filters.selectedSessions.length === 1
      ? data.sessions.find((s) => s.key === filters.selectedSessions[0])
      : null;

  const scopedSessions = selectedSessionSet.size
    ? queryResult.sessions.filter((session) => selectedSessionSet.has(session.key))
    : queryResult.sessions;
  const aggregateSessions = scopedSessions.filter(matchesSelectedDays);
  const hasSessionFilters =
    selectedSessionSet.size > 0 ||
    hasQuery ||
    filters.selectedHours.length > 0 ||
    Boolean(filters.agentId);
  const hasAggregateFilters = hasSessionFilters || selectedDaySet.size > 0;
  const computeTotals = (sources: Array<UsageTotals | null | undefined>): UsageTotals | null => {
    if (sources.length > 0 && sources.every((source) => !source)) return null;
    const totals = createEmptyCostUsageTotals();
    for (const source of sources) {
      if (source) {
        addCostUsageTotals(totals, source);
      }
    }
    return totals;
  };
  // Keep global daily totals when no row scope is active: the visible session page can be capped.
  const filteredDaily = hasSessionFilters
    ? (() => {
        const days = new Map<string, UsageTotals>();
        for (const session of scopedSessions) {
          for (const day of session.usage?.dailyBreakdown ?? []) {
            const totals = days.get(day.date) ?? createEmptyCostUsageTotals();
            addCostUsageTotals(totals, day);
            days.set(day.date, totals);
          }
        }
        return Array.from(days, ([date, totals]) => ({ date, ...totals })).toSorted((a, b) =>
          a.date.localeCompare(b.date),
        );
      })()
    : data.costDaily;
  const displayTotals = selectedDaySet.size
    ? computeTotals(filteredDaily.filter((day) => selectedDaySet.has(day.date)))
    : hasSessionFilters
      ? computeTotals(aggregateSessions.map((session) => session.usage))
      : data.totals;
  const totalSessions = agentScopedSessions.length;
  const scopedAggregates = hasSessionFilters
    ? buildAggregatesFromSessions(scopedSessions)
    : buildAggregatesFromSessions([], data.aggregates);
  const activeAggregates = selectedDaySet.size
    ? buildAggregatesFromSessions(aggregateSessions)
    : scopedAggregates;
  const insightsUseVisiblePage = data.sessionsLimitReached && !hasAggregateFilters;
  const insightTotals = insightsUseVisiblePage
    ? computeTotals(aggregateSessions.map((session) => session.usage))
    : displayTotals;
  const insightAggregates = insightsUseVisiblePage
    ? buildAggregatesFromSessions(aggregateSessions)
    : activeAggregates;
  // Cost windows use range-wide daily totals; filtered pages need exact scoped data.
  const costWindowComparison = hasAggregateFilters
    ? nothing
    : renderCostWindowComparison(data.costDaily, filters.startDate, filters.endDate);

  // Session duration and message counters have no daily equivalent in this response.
  const operationsTotals = selectedDaySet.size
    ? computeTotals(aggregateSessions.map((session) => session.usage))
    : insightTotals;
  const operationsStats = buildUsageInsightStats(
    aggregateSessions,
    operationsTotals,
    insightAggregates,
  );
  // The gateway always returns a totals object (all-zero when idle), so key
  // the empty state off content — and never render it under an error callout,
  // where "no usage data yet" would misexplain the failure.
  const isEmpty =
    !data.loading &&
    !data.error &&
    data.sessions.length === 0 &&
    (data.totals?.totalTokens ?? 0) === 0;
  const hasMissingCost =
    (operationsTotals?.missingCostEntries ?? 0) > 0 ||
    (operationsTotals
      ? operationsTotals.totalTokens > 0 &&
        operationsTotals.totalCost === 0 &&
        operationsTotals.input +
          operationsTotals.output +
          operationsTotals.cacheRead +
          operationsTotals.cacheWrite >
          0
      : false);
  const datePresets = [
    { label: t("usage.presets.today"), days: 1 },
    { label: t("usage.presets.last7d"), days: 7 },
    { label: t("usage.presets.last30d"), days: 30 },
    { label: t("usage.presets.last90d"), days: 90 },
    { label: t("usage.presets.last1y"), days: 365 },
  ];
  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    filterActions.onStartDateChange(formatIsoDate(start));
    filterActions.onEndDateChange(formatIsoDate(end));
  };
  const applyAllRange = () => {
    filterActions.onStartDateChange("1970-01-01");
    filterActions.onEndDateChange(formatIsoDate(new Date()));
  };
  const exportStamp = formatIsoDate(new Date());
  const rangeDays =
    Math.round((Date.parse(filters.endDate) - Date.parse(filters.startDate)) / 86400000) + 1;
  const dateInputs = [
    { key: "startDate", onChange: filterActions.onStartDateChange },
    { key: "endDate", onChange: filterActions.onEndDateChange },
  ] as const;

  const dateControls = html`<div class="usage-presets">
      ${renderSettingsSegmented({
        mode: "buttons",
        value: filters.startDate === "1970-01-01" ? "all" : String(rangeDays),
        onChange: (value) => (value === "all" ? applyAllRange() : applyPreset(Number(value))),
        options: [
          ...datePresets.map((preset) => ({ value: String(preset.days), label: preset.label })),
          { value: "all", label: t("usage.presets.all") },
        ],
      })}
    </div>
    <div class="usage-date-range">
      ${dateInputs.map(
        ({ key, onChange }) => html`<label class="usage-date-field">
          <span>${t(`usage.filters.${key}`)}</span>
          <input
            class="settings-input usage-date-input"
            type="date"
            ?disabled=${data.loading && !data.totals}
            .value=${filters[key]}
            aria-label=${t(`usage.filters.${key}`)}
            @change=${(event: Event) => onChange((event.target as HTMLInputElement).value)}
          />
        </label>`,
      )}
    </div>`;
  const scopeControls = html`<label class="usage-date-field">
      <span>${t("usage.filters.timeZone")}</span>
      <select
        class="settings-select usage-select"
        aria-label=${t("usage.filters.timeZone")}
        .value=${filters.timeZone}
        @change=${(event: Event) =>
          filterActions.onTimeZoneChange(
            (event.target as HTMLSelectElement).value as "local" | "utc",
          )}
      >
        <option value="local">${t("usage.filters.timeZoneLocal")}</option>
        <option value="utc">${t("usage.filters.timeZoneUtc")}</option>
      </select></label
    >
    <div class="usage-date-field">
      <span>${t("usage.scope.title")}</span>
      ${renderSettingsSegmented({
        mode: "buttons",
        ariaLabel: t("usage.scope.title"),
        value: filters.scope,
        onChange: filterActions.onScopeChange,
        onReselect: filterActions.onScopeChange,
        options: [
          {
            value: "instance",
            label: t("usage.scope.instance"),
            title: t("usage.scope.instanceHint"),
          },
          { value: "family", label: t("usage.scope.family"), title: t("usage.scope.familyHint") },
        ],
      })}
    </div>`;
  const headerActions = html`<button
      type="button"
      class="btn btn--sm usage-icon-button"
      aria-label=${t("common.refresh")}
      title=${t("common.refresh")}
      @click=${filterActions.onRefresh}
      ?disabled=${data.loading}
    >
      ${data.loading ? renderUsageLoadingStatus(nothing) : icons.refresh}
    </button>
    <wa-dropdown
      class="usage-export-menu"
      placement="bottom-end"
      @wa-select=${(event: CustomEvent<{ item: { value?: string } }>) => {
        switch (event.detail.item.value) {
          case "sessions-csv":
            downloadTextFile(
              `openclaw-usage-sessions-${exportStamp}.csv`,
              buildSessionsCsv(filteredSessions),
              "text/csv;charset=utf-8",
            );
            break;
          case "daily-csv":
            downloadTextFile(
              `openclaw-usage-daily-${exportStamp}.csv`,
              buildDailyCsv(filteredDaily),
              "text/csv;charset=utf-8",
            );
            break;
          case "json":
            displayActions.onExportJson({
              totals: displayTotals,
              sessions: filteredSessions,
              daily: filteredDaily,
              aggregates: activeAggregates,
            });
            break;
          case undefined:
            break;
        }
      }}
    >
      <button
        slot="trigger"
        type="button"
        class="btn btn--sm usage-export-trigger"
        aria-label=${t("usage.export.label")}
        title=${t("usage.export.label")}
        aria-busy=${data.exporting}
        ?disabled=${data.exporting}
      >
        ${data.exporting ? renderUsageLoadingStatus(nothing) : t("usage.export.label")}
        ${icons.chevronDown}
      </button>
      <wa-dropdown-item value="sessions-csv" ?disabled=${filteredSessions.length === 0}>
        ${t("usage.export.sessionsCsv")}
      </wa-dropdown-item>
      <wa-dropdown-item value="daily-csv" ?disabled=${filteredDaily.length === 0}>
        ${t("usage.export.dailyCsv")}
      </wa-dropdown-item>
      <wa-dropdown-item
        value="json"
        ?disabled=${data.exporting ||
        data.loading ||
        (filteredSessions.length === 0 && filteredDaily.length === 0)}
      >
        ${t("usage.export.json")}
      </wa-dropdown-item>
    </wa-dropdown>`;
  const queryControl = renderUsageQuery(props, {
    sessions: agentScopedSessions,
    warnings: queryResult.warnings,
  });
  const rangeCrossesYears = filters.startDate.slice(0, 4) !== filters.endDate.slice(0, 4);
  return renderSettingsPage(
    html`
      <div class="usage-page">
        <header class="usage-header">
          <div class="usage-header-top">
            <div class="usage-header-copy">
              <h1>${titleForRoute("usage")}</h1>
            </div>
            <div class="usage-header-actions">${headerActions}</div>
          </div>
        </header>
        <div class="usage-toolbar">
          <div class="usage-header-toolbar">
            <div class="usage-header-scope">
              <button
                id="usage-dates-trigger"
                type="button"
                class="btn btn--sm usage-range-trigger"
                aria-haspopup="dialog"
              >
                ${icons.calendarClock}<span
                  >${formatDayLabel(filters.startDate, rangeCrossesYears)} –
                  ${formatDayLabel(filters.endDate, rangeCrossesYears)}</span
                >${icons.chevronDown}
              </button>
              <wa-popover
                class="usage-more-filters usage-period-popover"
                for="usage-dates-trigger"
                placement="bottom-start"
                without-arrow
              >
                <div class="usage-more-filters-panel">${dateControls}</div>
              </wa-popover>
              ${agentScopeControl}
              <button
                id="usage-scope-trigger"
                type="button"
                class="btn btn--sm"
                aria-haspopup="dialog"
              >
                ${t("usage.scope.title")}${icons.chevronDown}
              </button>
              <wa-popover
                class="usage-more-filters usage-scope-popover"
                for="usage-scope-trigger"
                placement="bottom-start"
                without-arrow
              >
                <div class="usage-more-filters-panel">${scopeControls}</div>
              </wa-popover>
            </div>
            ${queryControl}
          </div>
          ${renderFilterChips(props)}
        </div>
        ${data.totals && !isEmpty
          ? html`${renderUsageHero({
              sessions: scopedSessions,
              aggregates: scopedAggregates,
              totals: displayTotals,
              timeZone: filters.timeZone,
              daily: filteredDaily,
              selectedDays: filters.selectedDays,
              chartMode: display.chartMode,
              dailyChartMode: display.dailyChartMode,
              onDailyChartModeChange: displayActions.onDailyChartModeChange,
              onChartModeChange: displayActions.onChartModeChange,
              onSelectDay: filterActions.onSelectDay,
            })}`
          : nothing}
        ${data.error
          ? html`<div class="callout danger usage-callout">${data.error}</div>`
          : nothing}
        ${data.cacheRefresh !== "complete"
          ? html`
              <div
                class="callout warning usage-callout usage-cache-warning"
                role="status"
                aria-live="polite"
              >
                ${t(
                  data.cacheRefresh === "exhausted"
                    ? "usage.cacheStatus.paused"
                    : "usage.cacheStatus.warning",
                )}
              </div>
            `
          : nothing}
        ${data.sessionsLimitReached
          ? html`
              <div class="callout warning usage-callout">${t("usage.sessions.limitReached")}</div>
            `
          : nothing}
        ${data.loading && !data.totals
          ? renderUsageLoadingState()
          : isEmpty
            ? renderUsageEmptyState(filterActions.onRefresh)
            : nothing}
        ${((data.loading || data.error) && !data.totals) || isEmpty
          ? renderUsageLimits(
              data.providerUsage,
              data.providerUsageUnavailable,
              data.providerUsageStalled,
            )
          : nothing}
        ${((data.loading || data.error) && !data.totals) || isEmpty
          ? nothing
          : html`
              ${displayTotals
                ? html`<section class="usage-composition">
                    <header class="usage-section-heading">
                      <h2>
                        ${t(
                          isTokenMode
                            ? "usage.breakdown.tokensByType"
                            : "usage.breakdown.costByType",
                        )}
                      </h2>
                    </header>
                    ${renderCostBreakdownCompact({
                      mode: display.chartMode,
                      values: displayTotals,
                      total: isTokenMode ? displayTotals.totalTokens : displayTotals.totalCost,
                      tokenValues: displayTotals,
                      variant: "overview",
                    })}
                  </section>`
                : nothing}
              ${costWindowComparison !== nothing
                ? html`<section class="usage-cost-windows-section">
                    <h2>${t("usage.costWindows.title")}</h2>
                    ${costWindowComparison}
                  </section>`
                : nothing}
              ${renderUsageOperations(
                operationsTotals,
                insightAggregates,
                operationsStats,
                hasMissingCost,
                aggregateSessions.length,
                selectedDaySet.size > 0,
              )}
              ${renderUsageLimits(
                data.providerUsage,
                data.providerUsageUnavailable,
                data.providerUsageStalled,
              )}
              <section class="usage-analysis-row" aria-label=${t("usage.patterns.title")}>
                <h2>${t("usage.patterns.title")}</h2>
                ${renderUsageDimensions({
                  mode: "rankings",
                  aggregates: insightAggregates,
                  totals: insightTotals,
                  showCostShares: selectedDaySet.size === 0,
                  selectedDays: filters.selectedDays,
                  onSelectDay: filterActions.onSelectDay,
                  errorHours: buildPeakErrorHours(aggregateSessions, filters.timeZone),
                })}
              </section>
              <section class="usage-activity" aria-label=${t("usage.mosaic.title")}>
                ${renderUsageMosaic(
                  aggregateSessions,
                  filters.timeZone,
                  filters.selectedHours,
                  filterActions.onSelectHour,
                )}
                <section class="usage-activity-calendar" aria-label=${t("usage.heatmap.title")}>
                  ${renderUsageHeatmap(filteredDaily, filters.startDate, filters.endDate)}
                </section>
                <div class="usage-activity-errors">
                  ${renderUsageDimensions({
                    mode: "errors",
                    aggregates: insightAggregates,
                    totals: insightTotals,
                    showCostShares: selectedDaySet.size === 0,
                    selectedDays: filters.selectedDays,
                    onSelectDay: filterActions.onSelectDay,
                    errorHours: buildPeakErrorHours(aggregateSessions, filters.timeZone),
                  })}
                </div>
              </section>
              <div class="usage-sessions-section">
                ${renderSessionsCard(
                  filteredSessions,
                  filters.selectedSessions,
                  filters.selectedDays,
                  isTokenMode,
                  display.sessionSort,
                  display.sessionSortDir,
                  display.recentSessions,
                  display.sessionsTab,
                  detailActions.onSelectSession,
                  displayActions.onSessionSortChange,
                  displayActions.onSessionSortDirChange,
                  displayActions.onSessionsTabChange,
                  display.visibleColumns,
                  totalSessions,
                  filterActions.onClearSessions,
                  detailActions.onToggleSession,
                  nothing,
                  nothing,
                  displayActions.onToggleColumn,
                )}
              </div>
              ${primarySelectedEntry
                ? renderSessionDetailPanel(primarySelectedEntry, props)
                : nothing}
            `}
      </div>
    `,
    { wide: true },
  );
}

/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
