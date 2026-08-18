import type { SessionSharingRole, SessionSuggestion, SessionSuggestionResolution } from "@openclaw/gateway-protocol";
import { html, nothing } from "lit";
import type { ApplicationCloudStartupStatus } from "../../../app/cloud-session-startup.ts";
import type { ExecApprovalDecision, ExecApprovalRequest } from "../../../app/exec-approval.ts";
import type { QuestionPrompt } from "../../../app/question-prompt.ts";
import { renderExecApprovalCard } from "../../../components/exec-approval-card.ts";
import { icons } from "../../../components/icons.ts";
import { t } from "../../../i18n/index.ts";
import type { CompactionStatus, FallbackStatus } from "../tool-stream.ts";
import { renderChatAuthorAvatar } from "./chat-author-avatar.ts";
import {
  renderChatRunStatusIndicator,
  renderCompactionIndicator,
  renderFallbackIndicator,
  type ComposerRunStatus,
} from "./chat-composer-status.ts";
import { createGatewayQuestionPanelProps } from "./chat-question-card.ts";
import { renderChatSessionSuggestions } from "./chat-session-suggestions.ts";
import { renderCloudStartupStatus } from "./chat-working-indicator.ts";

export type ChatThreadActivityProps = {
  approval?: ExecApprovalRequest | null;
  approvalBusy?: boolean;
  approvalErrors?: ReadonlyMap<string, string>;
  approvalNowMs?: number;
  onApprovalDecision?: (id: string, decision: ExecApprovalDecision) => void | Promise<void>;
  questions?: readonly QuestionPrompt[];
  onQuestionChange?: () => void;
  onQuestionSubmit?: (id: string, answers: Record<string, string[]>) => void | Promise<void>;
  onQuestionSkip?: (id: string) => void | Promise<void>;
  suggestions?: readonly SessionSuggestion[];
  suggestionRole?: SessionSharingRole;
  suggestionBusyIds?: ReadonlySet<string>;
  suggestionsArchived?: boolean;
  canResolveSuggestions?: boolean;
  onResolveSuggestion?: (suggestion: SessionSuggestion, resolution: SessionSuggestionResolution) => void;
  typingActors?: readonly { id: string; label: string }[];
  cloudStartup?: ApplicationCloudStartupStatus | null;
  onRetryCloudStartup?: () => void;
  runError?: { summary: string } | null;
  runStatus?: ComposerRunStatus | null;
  compactionStatus?: CompactionStatus | null;
  fallbackStatus?: FallbackStatus | null;
};

export function renderChatThreadActivity(props: ChatThreadActivityProps) {
  const questions = (props.questions ?? []).filter((prompt) => prompt.status === "pending");
  return html`<div class="chat-thread-activity">
    ${renderCloudStartupStatus(props.cloudStartup, props.onRetryCloudStartup)}
    ${props.runError
      ? html`<div class="chat-run-error" role="alert">
          <span class="chat-run-error__icon" aria-hidden="true">${icons.alertTriangle}</span>
          <span class="chat-run-error__summary">${props.runError.summary}</span>
        </div>`
      : nothing}
    ${renderChatRunStatusIndicator(props.runStatus)} ${renderFallbackIndicator(props.fallbackStatus)}
    ${renderCompactionIndicator(props.compactionStatus)}
    ${props.approval && props.onApprovalDecision
      ? html`<div class="chat-inline-approval">
          ${renderExecApprovalCard({
            approval: props.approval,
            busy: props.approvalBusy === true,
            error: props.approvalErrors?.get(props.approval.id) ?? null,
            nowMs: props.approvalNowMs ?? Date.now(),
            variant: "inline",
            onDecision: props.onApprovalDecision,
          })}
        </div>`
      : nothing}
    ${questions.map(
      (prompt) => html`<openclaw-chat-question-panel
        .props=${createGatewayQuestionPanelProps(prompt, {
          collapsed: false,
          onChange: props.onQuestionChange,
          onSubmit: props.onQuestionSubmit
            ? (answers) => props.onQuestionSubmit?.(prompt.id, answers)
            : undefined,
          onSkip: props.onQuestionSkip ? () => props.onQuestionSkip?.(prompt.id) : undefined,
        })}
      ></openclaw-chat-question-panel>`,
    )}
    ${renderChatSessionSuggestions({
      suggestions: props.suggestions ?? [],
      role: props.suggestionRole,
      busyIds: props.suggestionBusyIds ?? new Set(),
      archived: props.suggestionsArchived === true,
      canResolve: props.canResolveSuggestions === true,
      onResolve: (suggestion, resolution) => props.onResolveSuggestion?.(suggestion, resolution),
    })}
    ${renderTypingActors(props.typingActors)}
  </div>`;
}

function renderTypingActors(actors: ChatThreadActivityProps["typingActors"]) {
  if (!actors?.length) {
    return nothing;
  }
  return html`<div class="agent-chat__typing-indicator agent-chat__typing-indicator--outside" role="status">
    <span class="agent-chat__typing-avatars" aria-hidden="true">
      ${actors.slice(0, 3).map((actor) => renderChatAuthorAvatar({ id: actor.id, name: actor.label }))}
    </span>
    <span class="agent-chat__typing-text">${actors.map((actor) => actor.label).join(", ")}</span>
  </div>`;
}
