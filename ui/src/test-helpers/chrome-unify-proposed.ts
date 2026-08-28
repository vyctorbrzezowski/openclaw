import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../components/icons.ts";
import "../styles/chrome-unify-proposed.css";

export const chromeUnifyProposalSections = [
  { id: "proposal-dashboards", label: "Dashboards" },
  { id: "proposal-tasks", label: "Tasks" },
  { id: "proposal-worktrees", label: "Worktrees" },
] as const;

type PageHeaderProps = {
  title: string;
  description: string;
  context?: TemplateResult;
  secondaryAction?: TemplateResult;
  primaryAction?: TemplateResult;
  overflowAction?: TemplateResult;
};

type DataToolbarProps = {
  searchLabel: string;
  searchPlaceholder: string;
  quickFilters?: TemplateResult;
  filters?: TemplateResult;
  view?: TemplateResult;
  utilities?: TemplateResult;
};

function renderPageHeader(props: PageHeaderProps) {
  const hasTrailing = Boolean(
    props.context || props.secondaryAction || props.primaryAction || props.overflowAction,
  );
  return html`
    <header class="chrome-proposal__page-header">
      <div class="chrome-proposal__heading">
        <h1>${props.title}</h1>
        <p>${props.description}</p>
      </div>
      ${hasTrailing
        ? html`<div class="chrome-proposal__header-trailing">
            ${props.context
              ? html`<div class="chrome-proposal__context">${props.context}</div>`
              : nothing}
            ${props.secondaryAction ?? nothing}${props.primaryAction ??
            nothing}${props.overflowAction ?? nothing}
          </div>`
        : nothing}
    </header>
  `;
}

function renderAgentContext() {
  return html`<button
    class="btn chrome-proposal__context-trigger"
    type="button"
    aria-haspopup="listbox"
    aria-label="Agent scope: Molty"
  >
    <span>Agent:</span> <strong>Molty</strong> ${icons.chevronsUpDown}
  </button>`;
}

function renderRefreshControl(label: string) {
  return html`<button class="btn btn--icon" type="button" aria-label=${label} title=${label}>
    ${icons.refresh}
  </button>`;
}

function renderFilterButton(label = "Filters", count = 0) {
  return html`<button class="btn chrome-proposal__filter-button" type="button">
    ${icons.listFilter}<span>${label}</span>${count > 0
      ? html`<span class="chrome-proposal__filter-count">${count}</span>`
      : nothing}
  </button>`;
}

function renderSelect(label: string, value: string) {
  return html`<button
    class="btn chrome-proposal__select"
    type="button"
    aria-haspopup="listbox"
    aria-label=${`${label}: ${value}`}
  >
    <span class="chrome-proposal__select-label">${label}:</span>
    <span>${value}</span>
    ${icons.chevronsUpDown}
  </button>`;
}

function renderDataToolbar(props: DataToolbarProps) {
  return html`
    <div class="chrome-proposal__toolbar" role="group" aria-label="Data controls">
      <label class="chrome-proposal__search">
        <span class="sr-only">${props.searchLabel}</span>
        ${icons.search}
        <input type="search" placeholder=${props.searchPlaceholder} />
      </label>
      ${props.quickFilters
        ? html`<div class="chrome-proposal__toolbar-group">${props.quickFilters}</div>`
        : nothing}
      ${props.filters
        ? html`<div class="chrome-proposal__toolbar-group">${props.filters}</div>`
        : nothing}
      ${props.view || props.utilities
        ? html`<div class="chrome-proposal__toolbar-end">
            ${props.view ?? nothing}${props.utilities ?? nothing}
          </div>`
        : nothing}
    </div>
  `;
}

function renderResultMeta(content: TemplateResult | string) {
  return html`<div class="chrome-proposal__result-meta" role="status">${content}</div>`;
}

function renderEmptyState(title: string, description: string, action?: TemplateResult) {
  return html`<div class="chrome-proposal__empty-state">
    <div class="chrome-proposal__empty-title">${title}</div>
    <p>${description}</p>
    ${action ?? nothing}
  </div>`;
}

function renderBenchSection(id: string, label: string, content: TemplateResult) {
  return html`<section id=${id} class="chrome-fixture__section chrome-proposal__section">
    <header class="chrome-fixture__section-header">
      <h2>${label}</h2>
      <span class="chrome-fixture__status">shared grammar · direction</span>
    </header>
    <div class="chrome-proposal__page">${content}</div>
  </section>`;
}

function renderDashboardsProposal() {
  return renderBenchSection(
    "proposal-dashboards",
    "Dashboards",
    html`
      ${renderPageHeader({
        title: "Dashboards",
        description: "Sessions configured to open in dashboard mode.",
      })}
      ${renderEmptyState(
        "No dashboards yet",
        "Sessions configured for dashboard mode will appear here.",
        html`<a class="btn" href="/sessions">Open sessions</a>`,
      )}
    `,
  );
}

function renderTasksProposal() {
  return renderBenchSection(
    "proposal-tasks",
    "Tasks",
    html`
      ${renderPageHeader({
        title: "Tasks",
        description: "Monitor agent tasks and their current state.",
        context: renderAgentContext(),
      })}
      ${renderDataToolbar({
        searchLabel: "Search tasks",
        searchPlaceholder: "Search tasks…",
        quickFilters: renderSelect("Status", "All"),
        filters: renderFilterButton(),
        utilities: renderRefreshControl("Refresh tasks"),
      })}
      ${renderResultMeta("No tasks")}
      ${renderEmptyState(
        "No tasks yet",
        "Tasks started by this agent will appear here with their current state.",
      )}
    `,
  );
}

function renderWorktreesProposal() {
  return renderBenchSection(
    "proposal-worktrees",
    "Worktrees",
    html`
      ${renderPageHeader({
        title: "Worktrees",
        description: "Isolated task checkouts and recovery snapshots.",
        primaryAction: html`<button class="btn primary" type="button">New worktree</button>`,
        overflowAction: html`<button
          class="btn btn--icon"
          type="button"
          aria-label="More worktree actions"
          title="More worktree actions"
        >
          ${icons.moreHorizontal}
        </button>`,
      })}
      ${renderDataToolbar({
        searchLabel: "Search worktrees",
        searchPlaceholder: "Search worktrees…",
        quickFilters: renderSelect("Status", "All"),
        filters: renderFilterButton(),
        utilities: renderRefreshControl("Refresh worktrees"),
      })}
      ${renderResultMeta(
        html`<strong>3</strong> worktrees <span aria-hidden="true">·</span> Updated 2m ago`,
      )}
      <div class="chrome-proposal__content-preview" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    `,
  );
}

export function renderChromeUnifyProposal() {
  return html`${renderDashboardsProposal()}${renderTasksProposal()}${renderWorktreesProposal()}`;
}
