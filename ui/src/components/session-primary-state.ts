import { html, nothing, type TemplateResult } from "lit";
import { t } from "../i18n/index.ts";
import type { SidebarRecentSession, SidebarSessionAttention } from "./app-sidebar-session-types.ts";
import { icons } from "./icons.ts";
import { renderSessionAttentionIcon } from "./session-attention-presentation.ts";
import { renderSessionGlyph, renderSessionUnreadBadge } from "./session-glyph.ts";

export type SessionPrimaryStateKind =
  | "attention"
  | "running"
  | "failed"
  | "timeout"
  | "done"
  | "killed"
  | "unread"
  | null;

export type SessionPrimaryStateModel = {
  kind: SessionPrimaryStateKind;
  tone: "neutral" | "info" | "warning" | "danger" | "success";
  attention?: Exclude<SidebarSessionAttention, { kind: "none" }>;
  runningRing: boolean;
  unreadBadge: boolean;
  source: "session" | "descendant";
  accessibleLabel: string;
};

function attentionLabel(attention: Exclude<SidebarSessionAttention, { kind: "none" }>): string {
  switch (attention.kind) {
    case "question":
      return t("sessionsView.waitingForAnswer");
    case "approval":
      return t("sessionsView.waitingForApproval");
    case "agent":
      return attention.note;
    case "error":
      return t("sessionsView.runFailedReason", { reason: attention.reason });
    default:
      return attention satisfies never;
  }
}

function withConcurrentState(label: string, running: boolean, unread: boolean): string {
  return [label, running ? t("sessionsView.activeRun") : "", unread ? t("sessionsView.unread") : ""]
    .filter(Boolean)
    .join(" · ");
}

export function getSessionPrimaryStateModel(
  session: SidebarRecentSession,
): SessionPrimaryStateModel {
  const source = session.attentionFromChild ? "descendant" : "session";
  const unread = session.unread && !session.hasActiveRun;
  if (session.attention.kind !== "none") {
    const label = withConcurrentState(
      attentionLabel(session.attention),
      session.hasActiveRun,
      unread,
    );
    return {
      kind: "attention",
      tone: session.attention.kind === "error" ? "danger" : "warning",
      attention: session.attention,
      runningRing: session.hasActiveRun,
      unreadBadge: unread,
      source,
      accessibleLabel:
        source === "descendant" ? `${label} · ${t("sessionsView.childSessions")}` : label,
    };
  }
  if (session.hasActiveRun) {
    return {
      kind: "running",
      tone: "info",
      runningRing: false,
      unreadBadge: false,
      source: "session",
      accessibleLabel: t("sessionsView.activeRun"),
    };
  }
  const terminalKind = session.isChild
    ? session.status === "failed" ||
      session.status === "timeout" ||
      session.status === "done" ||
      session.status === "killed"
      ? session.status
      : null
    : null;
  if (terminalKind) {
    const terminalLabel =
      terminalKind === "failed"
        ? t("sessionsView.statusFailed")
        : terminalKind === "timeout"
          ? t("sessionsView.statusTimeout")
          : terminalKind === "done"
            ? t("sessionsView.statusDone")
            : t("sessionsView.statusKilled");
    return {
      kind: terminalKind,
      tone:
        terminalKind === "failed" || terminalKind === "timeout"
          ? "danger"
          : terminalKind === "done"
            ? "success"
            : "neutral",
      runningRing: false,
      unreadBadge: session.unread,
      source: "session",
      accessibleLabel: withConcurrentState(terminalLabel, false, session.unread),
    };
  }
  if (unread) {
    return {
      kind: "unread",
      tone: "info",
      runningRing: false,
      unreadBadge: false,
      source: "session",
      accessibleLabel: t("sessionsView.unread"),
    };
  }
  return {
    kind: null,
    tone: "neutral",
    runningRing: false,
    unreadBadge: false,
    source: "session",
    accessibleLabel: "",
  };
}

export function sessionPrimaryStateHasVisibleIndicator(
  model: SessionPrimaryStateModel,
  suppressAttentionIcon = false,
): boolean {
  if (model.kind === "attention" && suppressAttentionIcon) {
    return model.runningRing || model.unreadBadge;
  }
  return model.kind !== null;
}

function renderPrimaryContent(
  model: SessionPrimaryStateModel,
  suppressAttentionIcon: boolean,
): TemplateResult | typeof nothing {
  if (model.kind === "attention" && model.attention) {
    if (suppressAttentionIcon) {
      if (model.runningRing) {
        return html`<span class="session-run-spinner" aria-hidden="true"></span>`;
      }
      return model.unreadBadge
        ? html`<span class="session-unread-dot" aria-hidden="true"></span>`
        : nothing;
    }
    if (model.attention.kind === "error") {
      return html`<span
        class="session-unread-dot session-unread-dot--danger"
        aria-hidden="true"
      ></span>`;
    }
    return renderSessionAttentionIcon(model.attention);
  }
  if (model.kind === "running") {
    return html`<span class="session-run-spinner" aria-hidden="true"></span>`;
  }
  if (model.kind === "unread") {
    return html`<span class="session-unread-dot" aria-hidden="true"></span>`;
  }
  if (model.kind === "done") {
    return html`<span class="session-primary-state__terminal" aria-hidden="true"
      >${icons.check}</span
    >`;
  }
  if (model.kind === "killed") {
    return html`<span class="session-primary-state__terminal" aria-hidden="true"
      >${icons.stop}</span
    >`;
  }
  if (model.kind === "failed" || model.kind === "timeout") {
    return html`<span
      class="session-unread-dot session-unread-dot--danger"
      aria-hidden="true"
    ></span>`;
  }
  return nothing;
}

export function renderSessionPrimaryStateIndicator(
  model: SessionPrimaryStateModel,
  stateId?: string,
  options: { suppressAttentionIcon?: boolean } = {},
) {
  const suppressAttentionIcon = options.suppressAttentionIcon === true;
  const content = renderPrimaryContent(model, suppressAttentionIcon);
  if (content === nothing) {
    return nothing;
  }
  const composite = suppressAttentionIcon
    ? model.runningRing && model.unreadBadge
    : model.runningRing || model.unreadBadge;
  return html`<span
    class="session-primary-state session-primary-state--${model.kind} session-primary-state--${model.tone}"
    id=${stateId ?? nothing}
    role="img"
    aria-label=${model.accessibleLabel}
    title=${model.accessibleLabel}
    data-session-primary-state=${model.kind}
    data-session-primary-source=${model.source}
    >${composite
      ? renderSessionGlyph({
          content,
          running: suppressAttentionIcon ? false : model.runningRing,
          badge: model.unreadBadge ? renderSessionUnreadBadge() : nothing,
        })
      : content}</span
  >`;
}
