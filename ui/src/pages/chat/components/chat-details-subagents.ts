import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import { t } from "../../../i18n/index.ts";
import { isActiveTask } from "../../../lib/tasks/data.ts";
import type { BackgroundTasksProps } from "./chat-background-tasks.types.ts";

export function renderChatDetailsSubagents(backgroundTasks: BackgroundTasksProps | undefined) {
  if (!backgroundTasks) {
    return nothing;
  }
  const activeCount = backgroundTasks.tasks?.filter(isActiveTask).length ?? 0;
  const subagents = backgroundTasks.subagentActivity.rows;
  if (subagents.length === 0 && activeCount === 0) {
    return nothing;
  }
  return html`<section class="chat-details__section">
    <div class="chat-details__section-header">
      <span>${t("chat.details.subagents")}</span>
      ${activeCount > 0
        ? html`<span class="chat-details__section-count">${activeCount}</span>`
        : nothing}
    </div>
    ${subagents.map((task) => {
      const detail = task.progressSummary ?? task.lastActivity ?? task.lastToolName;
      return html`<button
        class="chat-details__row"
        type="button"
        @click=${() => backgroundTasks.onOpenTaskDetail?.(task)}
      >
        <span class="chat-details__row-icon chat-details__row-icon--active" aria-hidden="true"
          >${icons.claw}</span
        >
        <span class="chat-details__row-copy">
          <span class="chat-details__row-label">${task.title}</span>
          ${detail ? html`<span class="chat-details__row-detail">${detail}</span>` : nothing}
        </span>
        <span class="chat-details__row-trailing" aria-hidden="true">${icons.chevronRight}</span>
      </button>`;
    })}
    <button
      class="chat-details__row"
      type="button"
      @click=${() => backgroundTasks.collapsed && backgroundTasks.onToggleCollapsed()}
    >
      <span class="chat-details__row-icon" aria-hidden="true">${icons.listChecks}</span>
      <span class="chat-details__row-label">${t("chat.details.viewAllTasks")}</span>
      <span class="chat-details__row-trailing" aria-hidden="true">${icons.chevronRight}</span>
    </button>
  </section>`;
}
