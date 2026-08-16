// Shared approval card keeps the inline surface independent from the lazy modal.
import { html, nothing } from "lit";
import { formatApprovalDisplayPath } from "../../../src/infra/approval-display-paths.ts";
import type {
  ExecApprovalDecision,
  ExecApprovalRequest,
  ExecApprovalRequestPayload,
} from "../app/exec-approval.ts";
import { t } from "../i18n/index.ts";
import { formatCountdown } from "../lib/format.ts";

const DEFAULT_EXEC_APPROVAL_DECISIONS = [
  "allow-once",
  "allow-always",
  "deny",
] as const satisfies readonly ExecApprovalDecision[];

type ExecApprovalCardProps = {
  approval: ExecApprovalRequest;
  busy: boolean;
  error: string | null;
  nowMs: number;
  variant: "inline" | "popover";
  sessionDisplayName?: string;
  commandExpanded?: boolean;
  onToggleCommand?: () => void;
  onDecision: (approvalId: string, decision: ExecApprovalDecision) => void | Promise<void>;
};

function approvalRemainingLabel(expiresAtMs: number, nowMs: number): string {
  return expiresAtMs > nowMs
    ? t("execApproval.expiresIn", { time: formatCountdown(expiresAtMs, nowMs, true) })
    : t("execApproval.expired");
}

function renderMetaRow(label: string, value?: string | null, opts?: { path?: boolean }) {
  if (!value) {
    return nothing;
  }
  return html`<div class="exec-approval-meta-row">
    <span>${label}</span><span>${opts?.path ? formatApprovalDisplayPath(value) : value}</span>
  </div>`;
}

function renderCommandWithSpans(
  request: ExecApprovalRequestPayload,
  options: { collapsed?: boolean } = {},
) {
  const commandClass = `exec-approval-command mono ${
    options.collapsed ? "exec-approval-command--collapsed" : ""
  }`;
  const spans = [...(request.commandSpans ?? [])]
    .filter(
      (span) =>
        Number.isSafeInteger(span.startIndex) &&
        Number.isSafeInteger(span.endIndex) &&
        span.startIndex >= 0 &&
        span.endIndex > span.startIndex &&
        span.endIndex <= request.command.length,
    )
    .toSorted((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const accepted: typeof spans = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.startIndex >= cursor) {
      accepted.push(span);
      cursor = span.endIndex;
    }
  }
  if (!accepted.length) {
    return html`<div class=${commandClass}>${request.command}</div>`;
  }
  const parts = [];
  cursor = 0;
  for (const span of accepted) {
    if (span.startIndex > cursor) {
      parts.push(request.command.slice(cursor, span.startIndex));
    }
    parts.push(
      html`<mark class="exec-approval-command-span"
        >${request.command.slice(span.startIndex, span.endIndex)}</mark
      >`,
    );
    cursor = span.endIndex;
  }
  if (cursor < request.command.length) {
    parts.push(request.command.slice(cursor));
  }
  return html`<div class=${commandClass}>${parts}</div>`;
}

function renderExecBody(request: ExecApprovalRequestPayload) {
  return html` ${renderCommandWithSpans(request)}
    <div class="exec-approval-meta">
      ${renderMetaRow(t("execApproval.labels.host"), request.host)}
      ${renderMetaRow(t("execApproval.labels.agent"), request.agentId)}
      ${renderMetaRow(t("execApproval.labels.session"), request.sessionKey)}
      ${renderMetaRow(t("execApproval.labels.cwd"), request.cwd, { path: true })}
      ${renderMetaRow(t("execApproval.labels.resolved"), request.resolvedPath, { path: true })}
      ${renderMetaRow(t("execApproval.labels.security"), request.security)}
      ${renderMetaRow(t("execApproval.labels.ask"), request.ask)}
    </div>`;
}

function renderPluginBody(active: ExecApprovalRequest) {
  return html` ${active.pluginDescription
      ? html`<pre class="exec-approval-command mono" style="white-space:pre-wrap">
${active.pluginDescription}</pre>`
      : nothing}
    <div class="exec-approval-meta">
      ${renderMetaRow(t("execApproval.labels.severity"), active.pluginSeverity)}
      ${renderMetaRow(t("execApproval.labels.plugin"), active.pluginId)}
      ${renderMetaRow(t("execApproval.labels.agent"), active.request.agentId)}
      ${renderMetaRow(t("execApproval.labels.session"), active.request.sessionKey)}
    </div>`;
}

function renderMetaChip(label: string, value?: string | null) {
  return value
    ? html`<span class="exec-approval-meta-chip"><span>${label}</span>${value}</span>`
    : nothing;
}

function commandNeedsExpansion(command: string): boolean {
  return command.length > 72 || command.split("\n").length > 2;
}

function renderPopoverBody(props: ExecApprovalCardProps) {
  const active = props.approval;
  const request = active.request;
  const command = active.kind === "exec" ? request.command : (active.pluginDescription ?? "");
  const canExpand = commandNeedsExpansion(command);
  const commandClass = `exec-approval-command mono ${
    canExpand && props.commandExpanded !== true ? "exec-approval-command--collapsed" : ""
  }`;
  return html`
    ${command
      ? html`<div class="exec-approval-command-shell">
          ${active.kind === "exec"
            ? renderCommandWithSpans(request, {
                collapsed: canExpand && props.commandExpanded !== true,
              })
            : html`<pre class=${commandClass}>${command}</pre>`}
          ${canExpand
            ? html`<button
                class="exec-approval-command-toggle"
                type="button"
                aria-expanded=${String(props.commandExpanded === true)}
                @click=${props.onToggleCommand}
              >
                ${t(
                  props.commandExpanded === true
                    ? "execApproval.hideCommand"
                    : "execApproval.showCommand",
                )}
              </button>`
            : nothing}
        </div>`
      : nothing}
    <div class="exec-approval-meta-chips">
      ${active.kind === "plugin"
        ? renderMetaChip(t("execApproval.labels.severity"), active.pluginSeverity)
        : renderMetaChip(t("execApproval.labels.security"), request.security)}
      ${renderMetaChip(t("execApproval.labels.plugin"), active.pluginId)}
    </div>
    <details class="exec-approval-details">
      <summary>${t("execApproval.technicalDetails")}</summary>
      <div class="exec-approval-meta">
        ${renderMetaRow(t("execApproval.labels.agent"), request.agentId)}
        ${renderMetaRow(t("execApproval.labels.sessionId"), request.sessionKey?.trim())}
        ${renderMetaRow(t("execApproval.labels.host"), request.host)}
        ${renderMetaRow(t("execApproval.labels.cwd"), request.cwd, { path: true })}
        ${renderMetaRow(t("execApproval.labels.resolved"), request.resolvedPath, { path: true })}
        ${renderMetaRow(t("execApproval.labels.ask"), request.ask)}
      </div>
    </details>
  `;
}

function decisionLabel(decision: ExecApprovalDecision) {
  return t(
    decision === "allow-once"
      ? "execApproval.allowOnce"
      : decision === "allow-always"
        ? "execApproval.alwaysAllow"
        : "execApproval.deny",
  );
}

function decisionClass(decision: ExecApprovalDecision, variant: ExecApprovalCardProps["variant"]) {
  if (decision === "allow-once") {
    return "btn primary";
  }
  return decision === "deny" && variant === "inline" ? "btn danger" : "btn";
}

function decisionShortcut(decision: ExecApprovalDecision) {
  return decision === "allow-once"
    ? "Ctrl/Cmd+Enter"
    : decision === "allow-always"
      ? "Ctrl/Cmd+Shift+Enter"
      : "Ctrl/Cmd+D";
}

export function resolveApprovalDecisions(
  active: ExecApprovalRequest,
): readonly ExecApprovalDecision[] {
  if (active.request.allowedDecisions?.length) {
    return active.request.allowedDecisions;
  }
  return active.kind === "exec" && active.request.ask === "always"
    ? ["allow-once", "deny"]
    : DEFAULT_EXEC_APPROVAL_DECISIONS;
}

function approvalTitle(active: ExecApprovalRequest): string {
  return active.kind !== "exec"
    ? (active.pluginTitle ?? t("execApproval.pluginApprovalNeeded"))
    : t("execApproval.execApprovalNeeded");
}

export function renderExecApprovalCard(props: ExecApprovalCardProps) {
  const active = props.approval;
  const decisions = resolveApprovalDecisions(active);
  const title =
    props.variant === "popover" && props.sessionDisplayName
      ? props.sessionDisplayName
      : approvalTitle(active);
  // A timer role preserves context without per-second aria-live announcements.
  return html` <div
    class="exec-approval-card exec-approval-card--${props.variant}"
    data-approval-id=${active.id}
  >
    <div class="exec-approval-header">
      <div>
        <div class="exec-approval-title">${title}</div>
        <div class="exec-approval-sub exec-approval-countdown" role="timer">
          ${props.variant === "popover"
            ? html`${approvalTitle(active)} · `
            : nothing}${approvalRemainingLabel(active.expiresAtMs, props.nowMs)}
        </div>
      </div>
    </div>
    ${props.variant === "popover"
      ? renderPopoverBody(props)
      : active.kind === "exec"
        ? renderExecBody(active.request)
        : renderPluginBody(active)}
    ${active.kind === "exec" && !decisions.includes("allow-always")
      ? html`<div class="exec-approval-warning">${t("execApproval.allowAlwaysUnavailable")}</div>`
      : nothing}
    ${props.error ? html`<div class="exec-approval-error">${props.error}</div>` : nothing}
    <div class="exec-approval-actions">
      ${decisions.map((decision) => {
        const label = decisionLabel(decision);
        return html`<button
          class=${`${decisionClass(decision, props.variant)} exec-approval-action--${decision}`}
          type="button"
          ?disabled=${props.busy}
          title=${props.variant === "popover" ? `${label} (${decisionShortcut(decision)})` : label}
          @click=${() => props.onDecision(active.id, decision)}
        >
          <span>${label}</span>
        </button>`;
      })}
    </div>
  </div>`;
}
