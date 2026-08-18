import type { ProgressCard } from "@openclaw/gateway-protocol";
import { html, nothing, type TemplateResult } from "lit";
import type { SessionGoal } from "../../../api/types.ts";
import { icons } from "../../../components/icons.ts";
import { renderSessionProgressCard } from "../../../components/session-progress-card.ts";
import { t } from "../../../i18n/index.ts";
import { formatGoalElapsed, formatGoalStatusLabel, formatGoalUsage, goalElapsedMs } from "../../../lib/session-goal.ts";
import { renderChatTaskSuggestionTray, type ChatTaskSuggestionTrayProps } from "./chat-task-suggestions.ts";

export function renderChatDetailsWork(props: ChatTaskSuggestionTrayProps & {
  goal?: SessionGoal;
  progressCard?: ProgressCard | null;
  canActOnGoal: boolean;
  onGoalCommand?: (command: string) => void;
}) {
  const hasSuggestions = Boolean(props.taskSuggestions?.length);
  if (!props.goal && !props.progressCard && !hasSuggestions) {
    return nothing;
  }
  return html`<section class="chat-details__section">
    <div class="chat-details__section-header">${t("chat.details.work")}</div>
    ${props.goal ? renderDetailsGoal(props.goal, props.canActOnGoal, props.onGoalCommand) : nothing}
    ${renderSessionProgressCard(props.progressCard, "details")}
    ${renderChatTaskSuggestionTray(props)}
  </section>`;
}

function renderDetailsGoal(
  goal: SessionGoal,
  canAct: boolean,
  onGoalCommand: ((command: string) => void) | undefined,
) {
  const elapsed = formatGoalElapsed(goalElapsedMs(goal, Date.now()));
  const usage = formatGoalUsage(goal);
  const canResume = ["paused", "blocked", "usage_limited", "budget_limited"].includes(goal.status);
  return html`<details class="chat-details__goal">
    <summary class="chat-details__row">
      <span class="chat-details__row-icon" aria-hidden="true">${icons.target}</span>
      <span class="chat-details__row-label">${goal.objective}</span>
      <span class="chat-details__row-value">${formatGoalStatusLabel(goal.status)}</span>
      <span class="chat-details__row-trailing" aria-hidden="true">${icons.chevronRight}</span>
    </summary>
    <div class="chat-details__goal-body">
      ${goal.lastStatusNote
        ? html`<div class="chat-details__goal-note">${goal.lastStatusNote}</div>`
        : nothing}
      <div class="chat-details__goal-meta">${usage ? `${usage} · ${elapsed}` : elapsed}</div>
      ${canAct && onGoalCommand
        ? html`<div class="chat-details__goal-actions">
            ${goal.status === "active"
              ? detailsGoalAction(t("chat.goals.pause"), icons.pause, () =>
                  onGoalCommand("/goal pause"),
                )
              : nothing}
            ${canResume
              ? detailsGoalAction(t("chat.goals.resume"), icons.play, () =>
                  onGoalCommand("/goal resume"),
                )
              : nothing}
            ${detailsGoalAction(t("chat.goals.clear"), icons.trash, () =>
              onGoalCommand("/goal clear"),
            )}
          </div>`
        : nothing}
    </div>
  </details>`;
}

function detailsGoalAction(label: string, icon: TemplateResult, onClick: () => void) {
  return html`<button class="chat-details__goal-action" type="button" @click=${onClick}>
    <span aria-hidden="true">${icon}</span>${label}
  </button>`;
}
