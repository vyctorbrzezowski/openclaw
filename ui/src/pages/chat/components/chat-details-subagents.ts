import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import { t } from "../../../i18n/index.ts";
import { isActiveTask } from "../../../lib/tasks/data.ts";
import type { BackgroundTasksProps } from "./chat-background-tasks.types.ts";
import { renderSubagentActivity } from "./chat-subagent-activity.ts";

export function renderChatDetailsSubagents(backgroundTasks: BackgroundTasksProps | undefined) {
  if (!backgroundTasks) {
    return nothing;
  }
  const activeCount = backgroundTasks.tasks?.filter(isActiveTask).length ?? 0;
  const subagents = renderSubagentActivity(
    backgroundTasks.subagentActivity,
    backgroundTasks.onOpenTaskDetail,
  );
  if (subagents === nothing && activeCount === 0) {
    return nothing;
  }
  return html`<section class="chat-details__section">
    <div class="chat-details__section-header">
      <span>${t("chat.details.subagents")}</span>
      ${activeCount > 0
        ? html`<span class="chat-details__section-count">${activeCount}</span>`
        : nothing}
    </div>
    ${subagents}
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
