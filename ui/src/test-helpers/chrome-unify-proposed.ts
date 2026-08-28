import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../components/icons.ts";
import "../styles/chrome-unify-proposed.css";

export const chromeUnifyProposalSections = [
  { id: "proposal-dashboards", currentId: "dashboards", label: "Dashboards" },
  { id: "proposal-tasks", currentId: "tasks", label: "Tasks" },
  { id: "proposal-worktrees", currentId: "worktrees", label: "Worktrees" },
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

type SelectOption = {
  label: string;
  value: string;
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
  return html`<label class="btn chrome-proposal__context-trigger">
    <span>Agent:</span>
    <select aria-label="Agent scope">
      <option>Molty</option>
      <option>Main</option>
      <option>Research</option>
    </select>
    ${icons.chevronsUpDown}
  </label>`;
}

function renderRefreshControl(label: string) {
  return html`<button
    class="btn btn--icon"
    type="button"
    aria-label=${label}
    title=${label}
    data-proposal-refresh
  >
    ${icons.refresh}
  </button>`;
}

function renderFilterMenu(id: string, options: readonly string[]) {
  return html`<details class="chrome-proposal__menu" data-proposal-filter>
    <summary class="btn chrome-proposal__filter-button">
      ${icons.listFilter}<span>Filters</span>
      <span class="chrome-proposal__filter-count" data-filter-count hidden>0</span>
    </summary>
    <div class="chrome-proposal__menu-panel" aria-label="Filters">
      <div class="chrome-proposal__menu-title">Filters</div>
      ${options.map(
        (option, index) => html`<label class="chrome-proposal__check-row">
          <input type="checkbox" name=${`${id}-filter-${index}`} />
          <span>${option}</span>
        </label>`,
      )}
      <div class="chrome-proposal__menu-footer">
        <button class="btn" type="button" data-filter-clear>Clear</button>
        <button class="btn primary" type="button" data-filter-apply>Apply</button>
      </div>
    </div>
  </details>`;
}

function renderSelect(label: string, options: readonly SelectOption[]) {
  return html`<label class="btn chrome-proposal__select">
    <span class="chrome-proposal__select-label">${label}:</span>
    <select aria-label=${label} data-proposal-status>
      ${options.map((option) => html`<option value=${option.value}>${option.label}</option>`)}
    </select>
    ${icons.chevronsUpDown}
  </label>`;
}

function renderOverflowMenu() {
  return html`<details class="chrome-proposal__menu chrome-proposal__menu--end">
    <summary class="btn btn--icon" aria-label="More worktree actions" title="More worktree actions">
      ${icons.moreHorizontal}
    </summary>
    <div class="chrome-proposal__menu-panel chrome-proposal__menu-panel--compact">
      <button type="button" data-dialog-target="worktree-cleanup-dialog">Clean up…</button>
    </div>
  </details>`;
}

function renderDataToolbar(props: DataToolbarProps) {
  return html`
    <div class="chrome-proposal__toolbar" role="group" aria-label="Data controls">
      <label class="chrome-proposal__search">
        <span class="sr-only">${props.searchLabel}</span>
        ${icons.search}
        <input type="search" placeholder=${props.searchPlaceholder} data-proposal-search />
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
  const beforeTabId = `${id}-before-tab`;
  const beforePanelId = `${id}-before-panel`;
  const afterTabId = `${id}-after-tab`;
  const afterPanelId = `${id}-after-panel`;
  return html`<section id=${id} class="chrome-fixture__section chrome-proposal__section">
    <header class="chrome-fixture__section-header">
      <h2>${label}</h2>
      <div
        class="chrome-proposal__comparison-tabs"
        role="tablist"
        aria-label=${`${label} comparison`}
      >
        <button
          id=${beforeTabId}
          type="button"
          role="tab"
          aria-controls=${beforePanelId}
          aria-selected="false"
          tabindex="-1"
          data-comparison-view="before"
        >
          Before
        </button>
        <button
          id=${afterTabId}
          type="button"
          role="tab"
          aria-controls=${afterPanelId}
          aria-selected="true"
          tabindex="0"
          data-comparison-view="after"
        >
          After
        </button>
      </div>
    </header>
    <div class="chrome-proposal__comparison-stage">
      <div
        id=${beforePanelId}
        class="chrome-proposal__comparison-panel"
        role="tabpanel"
        aria-labelledby=${beforeTabId}
        data-comparison-panel="before"
        hidden
      ></div>
      <div
        id=${afterPanelId}
        class="chrome-proposal__comparison-panel"
        role="tabpanel"
        aria-labelledby=${afterTabId}
        data-comparison-panel="after"
      >
        <div class="chrome-proposal__page">${content}</div>
      </div>
    </div>
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
        quickFilters: renderSelect("Status", [
          { label: "All", value: "all" },
          { label: "Running", value: "running" },
          { label: "Queued", value: "queued" },
          { label: "Completed", value: "completed" },
        ]),
        filters: renderFilterMenu("tasks", ["Has failures", "Assigned to me", "Created today"]),
        utilities: renderRefreshControl("Refresh tasks"),
      })}
      ${renderResultMeta(html`<span>No tasks</span><span data-refresh-status></span>`)}
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
        primaryAction: html`<button
          class="btn primary"
          type="button"
          data-dialog-target="worktree-create-dialog"
        >
          New worktree
        </button>`,
        overflowAction: renderOverflowMenu(),
      })}
      ${renderDataToolbar({
        searchLabel: "Search worktrees",
        searchPlaceholder: "Search worktrees…",
        quickFilters: renderSelect("Status", [
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Archived", value: "archived" },
        ]),
        filters: renderFilterMenu("worktrees", [
          "Include archived",
          "Recovery available",
          "Owned by this agent",
        ]),
        utilities: renderRefreshControl("Refresh worktrees"),
      })}
      ${renderResultMeta(
        html`<strong data-result-count>3</strong><span data-result-label>worktrees</span>
          <span aria-hidden="true">·</span> <span data-refresh-status>Updated 2m ago</span>`,
      )}
      <div class="chrome-proposal__content-preview" data-proposal-items>
        <div class="chrome-proposal__content-row" data-proposal-item data-status="active">
          <div><strong>chrome-unify</strong><span>bench/chrome-unify</span></div>
          <span class="chrome-proposal__item-status">Active</span>
        </div>
        <div class="chrome-proposal__content-row" data-proposal-item data-status="active">
          <div><strong>dashboard-polish</strong><span>feature/dashboard-polish</span></div>
          <span class="chrome-proposal__item-status">Active</span>
        </div>
        <div class="chrome-proposal__content-row" data-proposal-item data-status="archived">
          <div><strong>session-recovery</strong><span>recovery/session-recovery</span></div>
          <span class="chrome-proposal__item-status">Archived</span>
        </div>
      </div>
      <dialog id="worktree-create-dialog" class="chrome-proposal__dialog">
        <form method="dialog">
          <header>
            <h2>Create worktree</h2>
            <p>Create a mock worktree to exercise the proposed flow.</p>
          </header>
          <label>
            <span>Name</span>
            <input name="worktree-name" value="usage-chrome" required />
          </label>
          <div class="chrome-proposal__dialog-actions">
            <button class="btn" type="submit" value="cancel">Cancel</button>
            <button class="btn primary" type="submit" value="create">Create worktree</button>
          </div>
        </form>
      </dialog>
      <dialog id="worktree-cleanup-dialog" class="chrome-proposal__dialog">
        <form method="dialog">
          <header>
            <h2>Clean up worktrees?</h2>
            <p>The archived mock worktree will be removed from this fixture.</p>
          </header>
          <div class="chrome-proposal__dialog-actions">
            <button class="btn" type="submit" value="cancel">Cancel</button>
            <button class="btn primary" type="submit" value="cleanup">Clean up worktrees</button>
          </div>
        </form>
      </dialog>
    `,
  );
}

export function renderChromeUnifyProposal() {
  return html`${renderDashboardsProposal()}${renderTasksProposal()}${renderWorktreesProposal()}`;
}
