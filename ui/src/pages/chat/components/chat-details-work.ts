import type { ProgressCard } from "@openclaw/gateway-protocol";
import { html, nothing, type TemplateResult } from "lit";
import type { SessionGoal } from "../../../api/types.ts";
import { icons } from "../../../components/icons.ts";
import { t } from "../../../i18n/index.ts";
import {
  formatGoalElapsed,
  formatGoalStatusLabel,
  formatGoalUsage,
  goalElapsedMs,
} from "../../../lib/session-goal.ts";
import type { ChatTaskSuggestionTrayProps } from "./chat-task-suggestions.ts";

export function renderChatDetailsWork(
  props: ChatTaskSuggestionTrayProps & {
    goal?: SessionGoal;
    progressCard?: ProgressCard | null;
    canActOnGoal: boolean;
    onGoalCommand?: (command: string) => void;
    onGoalEdit?: (goal: SessionGoal) => void;
  },
) {
  const hasSuggestions = Boolean(props.taskSuggestions?.length);
  if (!props.goal && !props.progressCard && !hasSuggestions) {
    return nothing;
  }
  return html`<section class="chat-details__section">
    <div class="chat-details__section-header">${t("chat.details.work")}</div>
    ${props.goal
      ? renderDetailsGoal(props.goal, props.canActOnGoal, props.onGoalCommand, props.onGoalEdit)
      : nothing}
    ${renderDetailsProgress(props.progressCard)} ${renderDetailsSuggestions(props)}
  </section>`;
}

function renderDetailsProgress(card: ProgressCard | null | undefined) {
  if (!card) {
    return nothing;
  }
  const steps = card.steps ?? [];
  const completed = steps.filter((step) => step.status === "completed").length;
  const current =
    steps.find((step) => step.status === "in_progress") ??
    steps.find((step) => step.status === "pending");
  return html`<details class="chat-details__progress">
    <summary class="chat-details__row">
      <span class="chat-details__row-icon" aria-hidden="true">${icons.listChecks}</span>
      <span class="chat-details__row-label"
        >${current?.step ?? t("sessionProgressCard.title")}</span
      >
      <span class="chat-details__row-value">${completed}/${steps.length}</span>
      <span class="chat-details__row-trailing" aria-hidden="true">${icons.chevronRight}</span>
    </summary>
    <ol class="chat-details__progress-steps">
      ${steps.map(
        (step) => html`<li data-status=${step.status}>
          <span aria-hidden="true"
            >${step.status === "completed" ? "✓" : step.status === "in_progress" ? "▸" : "·"}</span
          >${step.step}
        </li>`,
      )}
    </ol>
  </details>`;
}

function renderDetailsSuggestions(props: ChatTaskSuggestionTrayProps) {
  const suggestions = props.taskSuggestions ?? [];
  if (suggestions.length === 0) {
    return nothing;
  }
  return suggestions.map((suggestion) => {
    const busy = props.taskSuggestionBusyIds?.has(suggestion.id) === true;
    return html`<div class="chat-details__suggestion">
      <button
        class="chat-details__row"
        type="button"
        ?disabled=${busy || props.canAcceptTaskSuggestions !== true}
        @click=${() => props.onAcceptTaskSuggestion?.(suggestion, "worktree")}
      >
        <span class="chat-details__row-icon" aria-hidden="true">${icons.spark}</span>
        <span class="chat-details__row-copy">
          <span class="chat-details__row-label">${suggestion.title}</span>
          <span class="chat-details__row-detail">${suggestion.tldr}</span>
        </span>
        <span class="chat-details__row-trailing" aria-hidden="true">${icons.play}</span>
      </button>
      ${props.canDismissTaskSuggestions
        ? html`<button
            class="chat-details__dismiss"
            type="button"
            aria-label=${t("chat.taskSuggestions.dismiss", { title: suggestion.title })}
            @click=${() => props.onDismissTaskSuggestion?.(suggestion)}
          >
            ${icons.x}
          </button>`
        : nothing}
    </div>`;
  });
}

function renderDetailsGoal(
  goal: SessionGoal,
  canAct: boolean,
  onGoalCommand: ((command: string) => void) | undefined,
  onGoalEdit: ((goal: SessionGoal) => void) | undefined,
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
            ${goal.status !== "complete" && onGoalEdit
              ? detailsGoalAction(t("chat.goals.edit"), icons.penLine, () => onGoalEdit(goal))
              : nothing}
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
