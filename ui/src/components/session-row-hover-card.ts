import { html, nothing, type TemplateResult } from "lit";
import { t } from "../i18n/index.ts";
import { repoName } from "../lib/session-display.ts";
import type { SidebarRecentSession } from "./app-sidebar-session-types.ts";
import { icons } from "./icons.ts";
import type { SessionPullRequestIndicatorState } from "./session-menu-work.ts";
import { renderSessionOwnerChip, type SessionCreatedActor } from "./session-owner-chip.ts";
import { resolveCloudPlacementIcon } from "./session-row-badges.ts";

type HoverCardDetail = {
  icon: TemplateResult | ReturnType<typeof renderSessionOwnerChip>;
  label: string | TemplateResult;
  tone?: "danger";
};

type SessionHoverCardOwner = {
  actor: SessionCreatedActor;
  attribution: "created" | "archived";
  label: string;
  name: string;
};

function basename(path: string | undefined): string | undefined {
  const normalized = path?.trim().replace(/[\\/]+$/u, "");
  return normalized ? normalized.split(/[\\/]/u).findLast(Boolean) : undefined;
}

function renderDetail(detail: HoverCardDetail) {
  return html`<div
    class="session-row-hover-card__detail ${detail.tone === "danger"
      ? "session-row-hover-card__detail--danger"
      : ""}"
  >
    <span class="session-row-hover-card__detail-icon" aria-hidden="true">${detail.icon}</span>
    <span class="session-row-hover-card__detail-label">${detail.label}</span>
  </div>`;
}

function renderOwnerLabel(owner: SessionHoverCardOwner) {
  const nameOffset = owner.label.lastIndexOf(owner.name);
  const prefix = nameOffset >= 0 ? owner.label.slice(0, nameOffset).trimEnd() : owner.label;
  const suffix =
    nameOffset >= 0 ? owner.label.slice(nameOffset + owner.name.length).trimStart() : "";
  return html`<span class="session-row-hover-card__owner-label">
    <span>${prefix}</span>
    ${renderSessionOwnerChip(owner.actor, "row", owner.attribution)}
    <span>${owner.name}${suffix ? ` ${suffix}` : ""}</span>
  </span>`;
}

function renderDetailsBody(
  contextualDetails: readonly HoverCardDetail[],
  operationalDetails: readonly HoverCardDetail[] = [],
) {
  if (contextualDetails.length === 0 && operationalDetails.length === 0) {
    return nothing;
  }
  return html`<div class="session-row-hover-card__body">
    ${contextualDetails.length > 0
      ? html`<div class="session-row-hover-card__details">
          ${contextualDetails.map(renderDetail)}
        </div>`
      : nothing}
    ${contextualDetails.length > 0 && operationalDetails.length > 0
      ? html`<div class="sidebar-hover-card__divider" role="separator"></div>`
      : nothing}
    ${operationalDetails.length > 0
      ? html`<div class="session-row-hover-card__details">
          ${operationalDetails.map(renderDetail)}
        </div>`
      : nothing}
  </div>`;
}

export function renderSessionRowHoverCard(params: {
  session: SidebarRecentSession;
  label: string;
  meta: string;
  owner?: SessionHoverCardOwner;
  participantLabels: readonly string[];
  pullRequestState: SessionPullRequestIndicatorState;
  primaryStateLabel: string;
  primaryStateTone: "neutral" | "info" | "warning" | "danger";
  hasBoard: boolean;
}) {
  const { session } = params;
  const workspaceConflictCount = Math.max(0, Math.floor(session.workspaceConflictCount ?? 0));
  const hasCloudError = session.placementState === "failed" || workspaceConflictCount > 0;
  const project = session.worktree?.repoRoot
    ? repoName(session.worktree.repoRoot)
    : basename(session.execCwd);
  const branch = session.worktree?.branch;
  const contextualDetails: HoverCardDetail[] = [
    ...(project ? [{ icon: icons.folder, label: project }] : []),
    ...(branch ? [{ icon: icons.worktreeCreated, label: branch }] : []),
  ];
  const operationalDetails: HoverCardDetail[] = [
    ...(params.owner
      ? [
          {
            icon: icons.user,
            label: renderOwnerLabel(params.owner),
          },
        ]
      : []),
    ...(params.participantLabels.length > 0
      ? [{ icon: icons.users, label: params.participantLabels.join(", ") }]
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
    ...(session.automationNames && session.automationNames.length > 0
      ? [
          {
            icon: icons.clock,
            label: t("sessionsView.automationNamed", {
              name: session.automationNames.join(", "),
            }),
          },
        ]
      : []),
    ...(session.placementState
      ? [
          {
            icon: resolveCloudPlacementIcon(
              session.placementState,
              (session.workspaceConflictCount ?? 0) > 0,
            ),
            label:
              workspaceConflictCount > 0
                ? t(
                    workspaceConflictCount === 1
                      ? "sessionsView.cloudWorkerPlacementConflict"
                      : "sessionsView.cloudWorkerPlacementConflicts",
                    {
                      state: session.placementState,
                      count: String(workspaceConflictCount),
                    },
                  )
                : session.placementState === "reclaimed"
                  ? t("sessionsView.cloudWorkerReclaimed")
                  : t("sessionsView.cloudWorkerPlacement", { state: session.placementState }),
            tone: hasCloudError ? ("danger" as const) : undefined,
          },
        ]
      : []),
    ...(params.hasBoard
      ? [{ icon: icons.layoutDashboard, label: t("sessionsView.dashboardAvailable") }]
      : []),
    ...(params.primaryStateLabel && params.primaryStateTone === "danger"
      ? [
          {
            icon: icons.alertTriangle,
            label: params.primaryStateLabel,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return html`<div slot="content" class="sidebar-hover-card session-row-hover-card">
    <div class="session-row-hover-card__header">
      <span class="session-row-hover-card__title">${params.label}</span>
      ${params.meta
        ? html`<span class="session-row-hover-card__meta">${params.meta}</span>`
        : nothing}
    </div>
    ${renderDetailsBody(contextualDetails, operationalDetails)}
  </div>`;
}

export function renderCatalogSessionHoverCard(params: {
  label: string;
  meta: string;
  project?: string;
  cwd?: string;
  branch?: string;
}) {
  const project = params.project ?? basename(params.cwd);
  const details: HoverCardDetail[] = [
    ...(project ? [{ icon: icons.folder, label: project }] : []),
    ...(params.branch ? [{ icon: icons.gitBranch, label: params.branch }] : []),
  ];
  return html`<div slot="content" class="sidebar-hover-card session-row-hover-card">
    <div class="session-row-hover-card__header">
      <span class="session-row-hover-card__title">${params.label}</span>
      ${params.meta
        ? html`<span class="session-row-hover-card__meta">${params.meta}</span>`
        : nothing}
    </div>
    ${renderDetailsBody(details)}
  </div>`;
}
