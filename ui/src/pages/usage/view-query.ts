import { html, nothing } from "lit";
import "../../components/tooltip.ts";
import "../../components/web-awesome.ts";
import { icons } from "../../components/icons.ts";
import { renderProviderBrandIcon } from "../../components/provider-icon.ts";
import { t } from "../../i18n/index.ts";
import { extractQueryTerms } from "./helpers.ts";
import {
  applySuggestionToQuery,
  buildQuerySuggestions,
  buildUsageFilterOptions,
  normalizeQueryText,
  removeQueryToken,
  setQueryTokensForKey,
} from "./query.ts";
import type { UsageProps, UsageSessionEntry } from "./types.ts";

function setQueryEditing(target: EventTarget | null, editing: boolean) {
  if (!(target instanceof Element)) return;
  const search = target.closest(".usage-query-search");
  const popup = search?.querySelector<HTMLElement>(".usage-query-suggestions");
  const input = search?.querySelector("input");
  const open = editing && Boolean(input?.value.trim());
  if (popup) popup.hidden = !open;
  input?.setAttribute("aria-expanded", String(open));
}

function focusQueryInput(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  target.closest(".usage-query-search")?.querySelector<HTMLInputElement>("input")?.focus();
}

export function renderUsageQuery(
  {
    data,
    filters,
    callbacks,
  }: {
    data: Pick<UsageProps["data"], "loading" | "aggregates">;
    filters: Pick<UsageProps["filters"], "query" | "queryDraft">;
    callbacks: {
      filters: Pick<
        UsageProps["callbacks"]["filters"],
        "onQueryDraftChange" | "onApplyQuery" | "onClearQuery"
      >;
    };
  },
  {
    sessions,
    matchedCount,
    warnings,
  }: {
    sessions: UsageSessionEntry[];
    matchedCount: number;
    warnings: string[];
  },
) {
  const filterActions = callbacks.filters;
  const hasQuery = filters.query.trim().length > 0;
  const hasDraftQuery = filters.queryDraft.trim().length > 0;
  const filterOptions = buildUsageFilterOptions(sessions, data.aggregates);
  const querySuggestions = buildQuerySuggestions(filters.queryDraft, filterOptions);
  const queryTerms = extractQueryTerms(filters.queryDraft);
  const appliedFilterTerms = extractQueryTerms(filters.query).filter((term) => term.key);
  const renderFilterSelect = (key: string, label: string, options: string[]) => {
    if (options.length === 0) {
      return nothing;
    }
    const selected = queryTerms
      .filter((term) => normalizeQueryText(term.key ?? "") === key)
      .map((term) => term.value)
      .filter(Boolean);
    const selectedSet = new Set(selected.map((value) => normalizeQueryText(value)));
    const allSelected =
      options.length > 0 && options.every((value) => selectedSet.has(normalizeQueryText(value)));
    const selectedCount = selected.length;
    return html`
      <wa-dropdown
        class="usage-filter-select"
        placement="bottom-start"
        @wa-select=${(event: CustomEvent<{ item: { value?: string; checked: boolean } }>) => {
          event.preventDefault();
          const value = event.detail.item.value;
          if (value === "command:select-all") {
            filterActions.onQueryDraftChange(
              setQueryTokensForKey(filters.queryDraft, key, options),
            );
            return;
          }
          if (value === "command:clear") {
            filterActions.onQueryDraftChange(setQueryTokensForKey(filters.queryDraft, key, []));
            return;
          }
          if (value?.startsWith("option:")) {
            const optionValue = decodeURIComponent(value.slice("option:".length));
            filterActions.onQueryDraftChange(
              setQueryTokensForKey(
                filters.queryDraft,
                key,
                event.detail.item.checked
                  ? [...selected, optionValue]
                  : selected.filter(
                      (entry) => normalizeQueryText(entry) !== normalizeQueryText(optionValue),
                    ),
              ),
            );
          }
        }}
      >
        <button slot="trigger" type="button" class="btn btn--sm usage-filter-trigger">
          <span>${label}</span>
          ${selectedCount > 0
            ? html`<span class="settings-count">${selectedCount}</span>`
            : html` <span class="settings-count">${t("usage.filters.all")}</span> `}
        </button>
        <wa-dropdown-item value="command:select-all" ?disabled=${allSelected}>
          ${t("usage.filters.selectAll")}
        </wa-dropdown-item>
        <wa-dropdown-item value="command:clear" ?disabled=${selectedCount === 0}>
          ${t("usage.filters.clear")}
        </wa-dropdown-item>
        <div class="session-menu__separator" role="separator"></div>
        ${options.map((value) => {
          const checked = selectedSet.has(normalizeQueryText(value));
          return html`
            <wa-dropdown-item
              class="usage-filter-option"
              type="checkbox"
              value=${`option:${encodeURIComponent(value)}`}
              .checked=${checked}
            >
              ${key === "provider"
                ? html`<span slot="icon">${renderProviderBrandIcon(value)}</span>`
                : nothing}
              ${value}
            </wa-dropdown-item>
          `;
        })}
      </wa-dropdown>
    `;
  };
  return html`
    <div class="usage-session-filters">
      <div class="usage-query-row">
        <div
          class="usage-query-search"
          @focusout=${(event: FocusEvent) => {
            const search = event.currentTarget as HTMLElement;
            if (!(event.relatedTarget instanceof Node) || !search.contains(event.relatedTarget)) {
              setQueryEditing(search, false);
            }
          }}
          @keydown=${(event: KeyboardEvent) => {
            const search = event.currentTarget as HTMLElement;
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              focusQueryInput(search);
              setQueryEditing(search, false);
              return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const choices = [
              ...search.querySelectorAll<HTMLButtonElement>(".usage-query-suggestion"),
            ];
            if (!choices.length) return;
            event.preventDefault();
            setQueryEditing(search, true);
            const index = choices.indexOf(event.target as HTMLButtonElement);
            const next =
              index < 0
                ? event.key === "ArrowDown"
                  ? 0
                  : choices.length - 1
                : index + (event.key === "ArrowDown" ? 1 : -1);
            if (next < 0 || next >= choices.length) focusQueryInput(search);
            else choices[next]?.focus();
          }}
        >
          <span class="usage-query-search-trigger" aria-hidden="true">${icons.search}</span>
          <input
            class="settings-input usage-query-input"
            type="text"
            .value=${filters.queryDraft}
            placeholder=${t("usage.query.placeholder")}
            title=${t("usage.query.tip")}
            aria-label=${t("usage.query.placeholder")}
            role="combobox"
            aria-haspopup="dialog"
            aria-controls="usage-query-suggestions"
            aria-expanded="false"
            autocomplete="off"
            @focus=${(event: FocusEvent) => setQueryEditing(event.currentTarget, true)}
            @click=${(event: MouseEvent) => setQueryEditing(event.currentTarget, true)}
            @input=${(event: Event) => {
              setQueryEditing(event.currentTarget, true);
              filterActions.onQueryDraftChange((event.target as HTMLInputElement).value);
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                event.preventDefault();
                filterActions.onApplyQuery();
                setQueryEditing(event.currentTarget, false);
              }
            }}
          />
          ${hasDraftQuery || hasQuery
            ? html`<button
                type="button"
                class="usage-query-clear"
                aria-label=${t("usage.filters.clear")}
                title=${t("usage.filters.clear")}
                @click=${(event: MouseEvent) => {
                  filterActions.onClearQuery();
                  focusQueryInput(event.currentTarget);
                  setQueryEditing(event.currentTarget, false);
                }}
              >
                ${icons.x}
              </button>`
            : nothing}
          <div
            id="usage-query-suggestions"
            class="usage-query-suggestions"
            role="dialog"
            aria-label=${t("usage.query.placeholder")}
            hidden
          >
            ${querySuggestions.map(
              (suggestion) =>
                html`<button
                  type="button"
                  class="usage-query-suggestion"
                  @click=${(event: MouseEvent) => {
                    filterActions.onQueryDraftChange(
                      applySuggestionToQuery(filters.queryDraft, suggestion.value),
                    );
                    focusQueryInput(event.currentTarget);
                    setQueryEditing(event.currentTarget, false);
                  }}
                >
                  ${suggestion.label}
                </button>`,
            )}
            <div class="usage-query-actions">
              <button
                type="button"
                class="btn btn--sm"
                ?disabled=${data.loading || (!hasDraftQuery && !hasQuery)}
                @click=${(event: MouseEvent) => {
                  filterActions.onApplyQuery();
                  focusQueryInput(event.currentTarget);
                  setQueryEditing(event.currentTarget, false);
                }}
              >
                ${t("usage.query.apply")}
              </button>
            </div>
          </div>
        </div>
        <button
          id="usage-query-filters-trigger"
          type="button"
          class="btn btn--sm usage-query-filters-trigger"
          aria-haspopup="dialog"
        >
          ${t("usage.filters.title")}${icons.chevronDown}
        </button>
        <wa-popover
          class="usage-query-filters-popover"
          for="usage-query-filters-trigger"
          placement="bottom-end"
          without-arrow
        >
          <div class="usage-filter-row">
            ${(["channel", "provider", "model", "tool"] as const).map((key) =>
              renderFilterSelect(key, t(`usage.filters.${key}`), filterOptions[key]),
            )}
          </div></wa-popover
        >
        <span class="usage-query-hint">
          ${hasQuery
            ? t("usage.query.matching", {
                shown: matchedCount.toLocaleString("en-US"),
                total: sessions.length.toLocaleString("en-US"),
              })
            : t("usage.query.inRange", { total: sessions.length.toLocaleString("en-US") })}
        </span>
      </div>
      ${appliedFilterTerms.length > 0
        ? html`
            <div class="usage-query-chips">
              ${appliedFilterTerms.map((term) => {
                const label = term.raw;
                return html`
                  <span class="usage-query-chip">
                    ${normalizeQueryText(term.key ?? "") === "provider"
                      ? renderProviderBrandIcon(term.value)
                      : nothing}
                    ${label}
                    <openclaw-tooltip .content=${t("usage.filters.remove")}>
                      <button
                        aria-label=${t("usage.filters.remove")}
                        @click=${() =>
                          filterActions.onQueryDraftChange(
                            removeQueryToken(filters.queryDraft, label),
                          )}
                      >
                        ×
                      </button>
                    </openclaw-tooltip>
                  </span>
                `;
              })}
            </div>
          `
        : nothing}
      ${warnings.length > 0
        ? html`
            <div class="callout warning usage-callout usage-callout--tight">
              ${warnings.join(" · ")}
            </div>
          `
        : nothing}
    </div>
  `;
}
