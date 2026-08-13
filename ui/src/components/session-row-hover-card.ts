import { html, nothing, type TemplateResult } from "lit";
import { t } from "../i18n/index.ts";
import { repoName } from "../lib/session-display.ts";
import type { SidebarRecentSession } from "./app-sidebar-session-types.ts";
import { icons } from "./icons.ts";
import type { SessionPullRequestIndicatorState } from "./session-menu-work.ts";
import { resolveCloudPlacementIcon } from "./session-row-badges.ts";

type HoverCardDetail = {
  icon: TemplateResult;
  label: string;
};

function basename(path: string | undefined): string | undefined {
  const normalized = path?.trim().replace(/[\\/]+$/u, "");
  return normalized ? normalized.split(/[\\/]/u).findLast(Boolean) : undefined;
}

function renderDetail(detail: HoverCardDetail) {
  return html`<div class="session-row-hover-card__detail">
    <span class="session-row-hover-card__detail-icon" aria-hidden="true">${detail.icon}</span>
    <span class="session-row-hover-card__detail-label">${detail.label}</span>
  </div>`;
}

export function renderSessionRowHoverCard(params: {
  session: SidebarRecentSession;
  label: string;
  meta: string;
  ownerLabel?: string;
  participantLabels: readonly string[];
  pullRequestState: SessionPullRequestIndicatorState;
  primaryStateLabel: string;
  hasBoard: boolean;
}) {
  const { session } = params;
  const project = session.worktree?.repoRoot
    ? repoName(session.worktree.repoRoot)
    : basename(session.execCwd);
  const branch = session.worktree?.branch;
  const contextualDetails: HoverCardDetail[] = [
    ...(project ? [{ icon: icons.folder, label: project }] : []),
    ...(branch ? [{ icon: icons.gitFork, label: branch }] : []),
  ];
  const operationalDetails: HoverCardDetail[] = [
    ...(params.ownerLabel ? [{ icon: icons.users, label: params.ownerLabel }] : []),
    ...(params.participantLabels.length > 0
      ? [{ icon: icons.users, label: params.participantLabels.join(", ") }]
      : []),
    ...(session.forkSource
      ? [{ icon: icons.gitFork, label: t("sessionsView.forkedSession") }]
      : []),
    ...(params.pullRequestState !== "none"
      ? [
          {
            icon: icons.gitPullRequest,
            label:
              params.pullRequestState === "open"
                ? t("sessionsView.openPullRequest")
                : t("chat.pullRequests.merged"),
          },
        ]
      : []),
    ...(session.hasAutomation
      ? [{ icon: icons.clock, label: t("sessionsView.automationAttached") }]
      : []),
    ...(session.placementState
      ? [
          {
            icon: resolveCloudPlacementIcon(
              session.placementState,
              (session.workspaceConflictCount ?? 0) > 0,
            ),
            label: t("sessionsView.cloudWorkerPlacement", { state: session.placementState }),
          },
        ]
      : []),
    ...(params.hasBoard
      ? [{ icon: icons.layoutDashboard, label: t("sessionsView.dashboardAvailable") }]
      : []),
    ...(params.primaryStateLabel
      ? [{ icon: icons.activity, label: params.primaryStateLabel }]
      : []),
  ];

  return html`<div slot="content" class="sidebar-hover-card session-row-hover-card">
    <div class="session-row-hover-card__header">
      <span class="session-row-hover-card__title">${params.label}</span>
      ${params.meta
        ? html`<span class="session-row-hover-card__meta">${params.meta}</span>`
        : nothing}
    </div>
    ${contextualDetails.length > 0
      ? html`<div class="session-row-hover-card__details">
          ${contextualDetails.map(renderDetail)}
        </div>`
      : nothing}
    ${operationalDetails.length > 0
      ? html`${contextualDetails.length > 0
            ? html`<div class="sidebar-hover-card__divider" role="separator"></div>`
            : nothing}
          <div class="session-row-hover-card__details session-row-hover-card__details--secondary">
            ${operationalDetails.map(renderDetail)}
          </div>`
      : nothing}
  </div>`;
}

export function renderCatalogSessionHoverCard(params: {
  label: string;
  meta: string;
  project?: string;
  cwd?: string;
  branch?: string;
  stateLabel?: string;
}) {
  const project = params.project ?? basename(params.cwd);
  const details: HoverCardDetail[] = [
    ...(project ? [{ icon: icons.folder, label: project }] : []),
    ...(params.branch ? [{ icon: icons.gitFork, label: params.branch }] : []),
    ...(params.stateLabel ? [{ icon: icons.activity, label: params.stateLabel }] : []),
  ];
  return html`<div slot="content" class="sidebar-hover-card session-row-hover-card">
    <div class="session-row-hover-card__header">
      <span class="session-row-hover-card__title">${params.label}</span>
      ${params.meta
        ? html`<span class="session-row-hover-card__meta">${params.meta}</span>`
        : nothing}
    </div>
    ${details.length > 0
      ? html`<div class="session-row-hover-card__details">${details.map(renderDetail)}</div>`
      : nothing}
  </div>`;
}
