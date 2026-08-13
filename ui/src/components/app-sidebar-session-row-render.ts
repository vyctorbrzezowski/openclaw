import { html, nothing, type TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { keyed } from "lit/directives/keyed.js";
import { ref } from "lit/directives/ref.js";
import type { SessionObserverDigest } from "../../../packages/gateway-protocol/src/schema/sessions.js";
import type { NavigationRouteId } from "../app-navigation.ts";
import { sessionHasPendingApproval } from "../app/approval-presentation.ts";
import type { ApplicationNavigationOptions } from "../app/context.ts";
import type { AuthenticatedUser } from "../app/user-profile.ts";
import { t } from "../i18n/index.ts";
import { sessionHasBoard } from "../lib/board/provider.ts";
import { handleContextMenuEvent } from "../lib/keyboard-shortcuts.ts";
import { createOverflowFadeRef } from "../lib/overflow-fade.ts";
import { writeSessionDragData } from "../lib/sessions/drag.ts";
import type { SidebarSessionsGrouping } from "../lib/sessions/grouping.ts";
import type { NewSessionTarget } from "../pages/new-session/location.ts";
import type {
  CatalogBackingSessionDisplay,
  CatalogSessionMenuRequest,
} from "./app-sidebar-session-catalogs.ts";
import { formatSidebarTimestamp } from "./app-sidebar-session-catalogs.ts";
import {
  rowDemandsVisibility,
  sidebarSessionStateId,
  type SidebarRecentSession,
  type SidebarSessionStatusFilter,
} from "./app-sidebar-session-types.ts";
import { icons } from "./icons.ts";
import type { SessionDataController } from "./session-data-controller.ts";
import type { SessionPullRequestIndicatorState } from "./session-menu-work.ts";
import type { SessionOrganizerController } from "./session-organizer-controller.ts";
import { renderSessionOwnerChip, type SessionCreatedActor } from "./session-owner-chip.ts";
import {
  getSessionPrimaryStateModel,
  renderSessionPrimaryStateIndicator,
  sessionPrimaryStateHasVisibleIndicator,
} from "./session-primary-state.ts";
import { renderSessionRowBadges } from "./session-row-badges.ts";
import { renderSessionRowEndcap } from "./session-row-endcap.ts";
import { renderSessionRowHoverCard } from "./session-row-hover-card.ts";
import {
  renderSidebarSessionSubtitle,
  resolveSidebarSessionSubtitle,
} from "./session-row-subtitle.ts";
import type { SidebarMenusController } from "./sidebar-menus-controller.ts";
import { presenceViewerLabel, sessionPresenceViewers } from "./viewer-facepile.ts";
import "./tooltip.ts";

const SIDEBAR_VISIBLE_CHILD_SESSION_LIMIT = 4;

function pullRequestStateLabel(state: Exclude<SessionPullRequestIndicatorState, "none">) {
  return state === "open" ? t("sessionsView.openPullRequest") : t("chat.pullRequests.merged");
}

function renderOperationalPullRequest(state: SessionPullRequestIndicatorState) {
  if (state === "none") {
    return nothing;
  }
  const label = pullRequestStateLabel(state);
  return html`<span
    class="sidebar-session-pr-indicator sidebar-session-pr-indicator--${state}"
    data-session-pr-state=${state}
    role="img"
    aria-label=${label}
    title=${label}
    >${icons.gitBranch}</span
  >`;
}

function renderSessionRowOrigin(params: {
  actor?: SessionCreatedActor;
  attribution: "created" | "archived";
  draft: boolean;
  incognito: boolean;
}) {
  const owner = params.actor?.id
    ? renderSessionOwnerChip(params.actor, "row", params.attribution)
    : nothing;
  const qualifier = params.incognito
    ? html`<span
        class="session-row-origin__qualifier session-row-origin__qualifier--icon"
        role="img"
        aria-label=${t("sessionsView.incognito")}
        title=${t("sessionsView.incognito")}
        >${icons.hatGlasses}</span
      >`
    : params.draft
      ? html`<span class="session-row-origin__qualifier" title=${t("chat.sessionSharing.draft")}
          >${t("chat.sessionSharing.draft")}</span
        >`
      : nothing;
  if (owner === nothing) {
    return qualifier === nothing
      ? nothing
      : html`<span class="session-row-origin session-row-origin--qualifier-only"
          >${qualifier}</span
        >`;
  }
  return qualifier === nothing
    ? owner
    : html`<span class="session-row-origin session-row-origin--compound"
        >${owner}${qualifier}</span
      >`;
}

export interface SessionListHost {
  readonly sessionDataContext:
    | {
        gateway: { snapshot: { selfUser?: AuthenticatedUser | null } };
      }
    | undefined;
  readonly sidebarLiveActivity: boolean;
  readonly sidebarNarrationLines: ReadonlyMap<string, string>;
  readonly sidebarObserverDigests: ReadonlyMap<string, SessionObserverDigest>;
  readonly selectedSessionKeys: ReadonlySet<string>;
  readonly connected: boolean;
  readonly sessionData: Pick<
    SessionDataController,
    | "approvalBadgeSnapshot"
    | "loadMoreSessionCatalog"
    | "presenceInstanceId"
    | "presencePayload"
    | "refreshSessionCatalogs"
    | "sessionCatalogRefreshStatus"
    | "sessionMutationError"
  >;
  readonly fullyShownChildSessionKeys: ReadonlySet<string>;
  readonly sessionsGrouping: SidebarSessionsGrouping;
  readonly collapsedSessionSections: ReadonlySet<string>;
  readonly sessionOrganizer: Pick<
    SessionOrganizerController,
    | "draggingSidebarSection"
    | "draggingSessionKey"
    | "sessionDropTarget"
    | "sidebarSectionDropTarget"
    | "sessionListRemovalDrop"
  >;
  readonly sidebarMenus: Pick<
    SidebarMenusController,
    | "catalogViewMenuPosition"
    | "openCatalogViewMenu"
    | "openSessionGroupMenu"
    | "openSessionMenu"
    | "sessionGroupMenu"
    | "sessionMenu"
    | "sessionSortMenuPosition"
    | "toggleCatalogViewMenu"
    | "toggleSessionSortMenu"
  >;
  readonly sessionsStatusFilter: SidebarSessionStatusFilter;
  readonly sessionCreatorFilterActive: boolean;
  readonly sessionOwnershipVisible: boolean;
  readonly onOpenNewSession?: (agentId: string, target?: NewSessionTarget) => void;
  readonly onNavigate?: (
    routeId: NavigationRouteId,
    options?: ApplicationNavigationOptions,
  ) => void;

  sessionPullRequestIndicatorState(
    sessionKey: string,
    worktreeId: string,
  ): SessionPullRequestIndicatorState;
  isSessionChildrenExpanded(session: SidebarRecentSession): boolean;
  startSessionDrag(session: SidebarRecentSession): void;
  finishSessionDrag(): void;
  handleSessionRowClick(event: MouseEvent, session: SidebarRecentSession): void;
  toggleSessionChildren(session: SidebarRecentSession): void;
  toggleSessionPin(session: SidebarRecentSession): void;
  toggleSessionMenu(session: SidebarRecentSession, trigger: HTMLElement): void;
  showMoreChildren(sessionKey: string): void;
  sectionDragOver(event: DragEvent, sectionId: string, group?: string): void;
  sectionDragLeave(event: DragEvent, sectionId: string, group?: string): void;
  sectionDrop(event: DragEvent, sectionId: string, group?: string): void;
  startSidebarSectionDrag(sectionId: string): void;
  finishSidebarSectionDrag(): void;
  toggleSection(sectionId: string): void;
  openNewSession(): void;
  readNewSessionAccess(): import("../lib/session-method-access.ts").SessionMethodAccess;
  readSessionMutationAccess(request: {
    method: string;
    params?: unknown;
    requiredScope?: "operator.write" | "operator.admin";
  }): import("../lib/session-method-access.ts").SessionMethodAccess;
  requestOpenNewSession(agentId: string, target?: NewSessionTarget): void;
  setVisibleSessionLimit(sectionId: string, limit: number): void;
  clearSessionSelection(): void;
  handleSessionListDragOver(event: DragEvent): void;
  handleSessionListDragLeave(event: DragEvent): void;
  handleSessionListDrop(event: DragEvent): void;
  dismissSessionMutationError(): void;
  openCatalogMenu(
    request: CatalogSessionMenuRequest,
    x: number,
    y: number,
    trigger?: HTMLElement,
  ): void;
}

export function visibleSessionChildren(params: {
  session: SidebarRecentSession;
  fullyShownChildSessionKeys: ReadonlySet<string>;
}): readonly SidebarRecentSession[] {
  const showAllChildren = params.fullyShownChildSessionKeys.has(params.session.key);
  // Active, running, and attention-bearing branches must bypass the quiet-child cap.
  return showAllChildren
    ? params.session.children
    : params.session.children.filter(
        (child, index) =>
          index < SIDEBAR_VISIBLE_CHILD_SESSION_LIMIT || rowDemandsVisibility(child),
      );
}

export function renderRecentSession(params: {
  host: SessionListHost;
  session: SidebarRecentSession;
  display?: CatalogBackingSessionDisplay;
  listItem?: boolean;
  projectChild?: boolean;
}) {
  const { host, session, display, listItem = true, projectChild = false } = params;
  const pinAccess = host.readSessionMutationAccess({
    method: "sessions.patch",
    params: { key: session.key, pinned: !session.pinned },
  });
  const label = display?.label ?? session.label;
  const { subtitle, narration } = resolveSidebarSessionSubtitle({
    session,
    hasDisplay: display !== undefined,
    displaySubtitle: display?.subtitle,
    sidebarLiveActivity: host.sidebarLiveActivity,
    narrationLine: host.sidebarNarrationLines.get(session.key),
    observerDigest: host.sidebarObserverDigests.get(session.key) ?? null,
  });
  const pullRequestState = session.worktreeId
    ? host.sessionPullRequestIndicatorState(session.key, session.worktreeId)
    : "none";
  const ownerAttribution = host.sessionsStatusFilter === "archived" ? "archived" : "created";
  const ownerActor = host.sessionOwnershipVisible
    ? host.sessionsStatusFilter === "archived"
      ? session.archivedBy
      : session.createdActor
    : undefined;
  const primaryState = getSessionPrimaryStateModel(session);
  const visibleSubtitle = session.isChild ? null : subtitle;
  const approvalIsExplicitInSubtitle = visibleSubtitle === t("sessionsView.waitingForApproval");
  const activeErrorIsExplicitInSubtitle = Boolean(
    session.visuallyActive && visibleSubtitle && primaryState.attention?.kind === "error",
  );
  const suppressPrimaryAttentionIcon =
    approvalIsExplicitInSubtitle || activeErrorIsExplicitInSubtitle;
  const running = session.hasActiveRun;
  const auxiliaryDescription =
    pullRequestState === "none" ? "" : pullRequestStateLabel(pullRequestState);
  const meta = display?.meta ?? formatSidebarTimestamp(session.updatedAt);
  const rowMeta = session.pinned ? "" : meta;
  const presenceViewers = sessionPresenceViewers(
    host.sessionData.presencePayload,
    host.sessionDataContext?.gateway.snapshot.selfUser?.id,
    host.sessionData.presenceInstanceId,
    session.key,
  );
  const primaryStateVisible = sessionPrimaryStateHasVisibleIndicator(
    primaryState,
    suppressPrimaryAttentionIcon,
  );
  const stateId = primaryStateVisible ? sidebarSessionStateId(session.key) : undefined;
  const hasPendingApprovalBadge =
    sessionHasPendingApproval(host.sessionData.approvalBadgeSnapshot(), session.key) &&
    primaryState.attention?.kind !== "approval";
  const hasBoard = sessionHasBoard(session.key);
  const hasRowBadges = Boolean(
    session.hasAutomation ||
    (session.outboxCount ?? 0) > 0 ||
    session.pullRequest ||
    display?.pullRequest ||
    hasPendingApprovalBadge,
  );
  const actionOnly =
    !session.isChild &&
    presenceViewers.length === 0 &&
    pullRequestState === "none" &&
    !hasBoard &&
    !hasRowBadges &&
    !primaryStateVisible;
  const openMenuFromEvent = session.isChild
    ? undefined
    : (event: MouseEvent | KeyboardEvent) =>
        handleContextMenuEvent(
          event,
          (event.currentTarget as HTMLElement).querySelector("[data-session-menu]"),
          (trigger, x, y) => host.sidebarMenus.openSessionMenu(session, x, y, trigger),
        );
  const title = [
    display?.title ?? [label, narration, rowMeta].filter(Boolean).join(" · "),
    session.incognito ? t("sessionsView.incognito") : "",
    ownerActor?.id
      ? t(ownerAttribution === "archived" ? "sessionsView.archivedBy" : "sessionsView.createdBy", {
          name: ownerActor.label || ownerActor.id,
        })
      : "",
    auxiliaryDescription,
    primaryState.accessibleLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const pinLabel = `${t(session.pinned ? "sessionsView.unpinSession" : "sessionsView.pinSession")}: ${label}`;
  const menuLabel = `${t("chat.sidebar.openSessionMenu")}: ${label}`;
  const rowClass = [
    "sidebar-recent-session",
    "session-row-host",
    projectChild ? "sidebar-recent-session--catalog-project-child" : "",
    session.isChild ? "sidebar-recent-session--child" : "",
    session.archived ? "sidebar-session--archived" : "",
    session.visuallyActive ? "sidebar-recent-session--active" : "",
    host.selectedSessionKeys.has(session.key) ? "sidebar-recent-session--selected" : "",
    session.pinned ? "session-row-host--pinned" : "",
    running ? "session-row-host--running" : "",
    session.visibility === "draft" ? "session-row-host--draft" : "",
    session.visibility === "draft"
      ? session.draftOwnedBySelf
        ? "session-row-host--draft-owner"
        : "session-row-host--draft-other"
      : "",
    session.attention.kind === "error"
      ? "sidebar-recent-session--attention-danger"
      : session.attention.kind !== "none"
        ? "sidebar-recent-session--attention-amber"
        : "",
    host.sessionOrganizer.draggingSessionKey === session.key
      ? "sidebar-recent-session--dragging"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const childrenExpanded = host.isSessionChildrenExpanded(session);
  const groupWriteAccess = host.readSessionMutationAccess({
    method: "sessions.groups.put",
    requiredScope: "operator.write",
  });
  const rowDraggable = !session.isChild && groupWriteAccess.allowed;
  const row = html`
    <openclaw-tooltip
      class="sidebar-hover-tooltip sidebar-session-hover-tooltip"
      delay="500"
      placement="right"
    >
      <div
        class=${rowClass}
        data-session-key=${session.key}
        data-session-depth=${session.isChild ? "1" : "0"}
        data-session-unread=${session.unread && !running ? "true" : "false"}
        data-session-manageable=${session.isChild ? "false" : "true"}
        data-session-action-only=${actionOnly ? "true" : "false"}
        role=${ifDefined(listItem ? "listitem" : undefined)}
        draggable=${rowDraggable ? "true" : "false"}
        title=${!session.isChild && !groupWriteAccess.allowed ? groupWriteAccess.reason : nothing}
        @dragstart=${!rowDraggable
          ? nothing
          : (event: DragEvent) => {
              if (event.dataTransfer) {
                writeSessionDragData(event.dataTransfer, session.key);
                host.startSessionDrag(session);
              }
            }}
        @dragend=${!rowDraggable
          ? nothing
          : () => {
              host.finishSessionDrag();
            }}
        @contextmenu=${openMenuFromEvent ?? nothing}
        @keydown=${openMenuFromEvent ?? nothing}
      >
        <span class="sidebar-recent-session__surface" aria-hidden="true"></span>
        <a
          href=${session.href}
          class="sidebar-recent-session__link"
          draggable="false"
          aria-label=${title}
          aria-current=${session.visuallyActive ? "page" : nothing}
          aria-describedby=${stateId ?? nothing}
          @click=${(event: MouseEvent) => host.handleSessionRowClick(event, session)}
        >
          <span class="sidebar-recent-session__text">
            <span class="sidebar-recent-session__title-line">
              ${renderSessionRowOrigin({
                actor: ownerActor,
                attribution: ownerAttribution,
                draft: session.visibility === "draft",
                incognito: session.incognito,
              })}
              <span
                class="sidebar-recent-session__name"
                ${ref(createOverflowFadeRef({ revealTrailingActions: !session.isChild }))}
                ><span class="sidebar-recent-session__name-content">${label}</span></span
              >
              ${session.archived
                ? html`<span
                    class="session-row-qualifier session-row-qualifier--icon"
                    role="img"
                    aria-label=${t("sessionsView.archived")}
                    title=${t("sessionsView.archived")}
                    >${icons.archive}</span
                  >`
                : nothing}
            </span>
            ${renderSidebarSessionSubtitle(
              { subtitle: visibleSubtitle, narration: session.isChild ? null : narration },
              {
                approval: approvalIsExplicitInSubtitle,
                leadingIcon:
                  session.worktree?.branch && visibleSubtitle === session.worktree.branch
                    ? icons.gitBranch
                    : undefined,
              },
            )}
          </span>
        </a>
        ${renderSessionRowEndcap({
          child: session.isChild,
          treeControl:
            session.childSessionKeys.length > 0
              ? html`<button
                  class="sidebar-child-session-toggle ${session.runningChildCount > 0
                    ? "sidebar-child-session-toggle--running"
                    : session.failedChildCount > 0
                      ? "sidebar-child-session-toggle--failed"
                      : ""}"
                  type="button"
                  data-child-session-toggle=${session.key}
                  aria-expanded=${String(childrenExpanded)}
                  aria-label=${t(
                    childrenExpanded
                      ? "sessionsView.hideChildSessions"
                      : "sessionsView.showChildSessions",
                    { count: String(session.childSessionKeys.length), session: label },
                  )}
                  @click=${() => host.toggleSessionChildren(session)}
                >
                  <span class="sidebar-child-session-toggle__icon" aria-hidden="true"
                    >${childrenExpanded ? icons.chevronDown : icons.chevronRight}</span
                  >
                  <span class="sidebar-child-session-toggle__count"
                    >${session.childSessionKeys.length}</span
                  >
                </button>`
              : nothing,
          duration: nothing,
          restSummary: session.isChild
            ? nothing
            : html`${presenceViewers.length > 0
                ? html`<openclaw-viewer-facepile
                    .presencePayload=${host.sessionData.presencePayload}
                    .selfUserId=${host.sessionDataContext?.gateway.snapshot.selfUser?.id}
                    .selfInstanceId=${host.sessionData.presenceInstanceId}
                    .sessionKey=${session.key}
                    .maxVisible=${2}
                    variant="session"
                  ></openclaw-viewer-facepile>`
                : nothing}
              ${renderOperationalPullRequest(pullRequestState)}
              ${hasBoard
                ? html`<span
                    class="sidebar-board-glyph"
                    role="img"
                    aria-label=${t("sessionsView.dashboardAvailable")}
                    title=${t("sessionsView.dashboardAvailable")}
                    >${icons.layoutDashboard}</span
                  >`
                : nothing}
              ${renderSessionRowBadges({
                hasAutomation: session.hasAutomation,
                incognito: false,
                isChild: session.isChild,
                outboxCount: session.outboxCount,
                pullRequest: session.pullRequest ?? display?.pullRequest,
                hasApproval: hasPendingApprovalBadge,
                maxVisible: 2,
              })}`,
          auxiliary: session.isChild ? renderOperationalPullRequest(pullRequestState) : nothing,
          management: session.isChild
            ? nothing
            : html`<span class="session-row-actions">
                <button
                  class="session-action session-action--pin"
                  data-sidebar-session-pin="true"
                  type="button"
                  title=${pinAccess.allowed ? pinLabel : pinAccess.reason}
                  aria-label=${pinLabel}
                  ?disabled=${!pinAccess.allowed}
                  @click=${() => host.toggleSessionPin(session)}
                >
                  ${session.pinned ? icons.sessionUnpin : icons.sessionPin}
                </button>
                <button
                  class="session-action"
                  data-session-menu="true"
                  type="button"
                  title=${menuLabel}
                  aria-label=${menuLabel}
                  aria-haspopup="menu"
                  aria-expanded=${String(
                    host.sidebarMenus.sessionMenu?.session.key === session.key,
                  )}
                  @click=${(event: MouseEvent) => {
                    event.stopPropagation();
                    const trigger = event.currentTarget as HTMLElement;
                    host.toggleSessionMenu(session, trigger);
                  }}
                >
                  ${icons.ellipsis}
                </button>
              </span>`,
          primary: renderSessionPrimaryStateIndicator(primaryState, stateId, {
            suppressAttentionIcon: suppressPrimaryAttentionIcon,
            compact: session.isChild,
          }),
        })}
      </div>
      ${renderSessionRowHoverCard({
        session,
        label,
        meta,
        owner: ownerActor?.id
          ? {
              actor: ownerActor,
              attribution: ownerAttribution,
              name: ownerActor.label || ownerActor.id,
              label: t(
                ownerAttribution === "archived"
                  ? "sessionsView.archivedBy"
                  : "sessionsView.createdBy",
                { name: ownerActor.label || ownerActor.id },
              ),
            }
          : undefined,
        participantLabels: presenceViewers.map(presenceViewerLabel),
        pullRequestState,
        primaryStateLabel: primaryState.accessibleLabel,
        primaryStateTone: primaryState.tone,
        hasBoard,
      })}
    </openclaw-tooltip>
  `;
  return keyed(session.key, row);
}

export function renderSessionTree(params: {
  host: SessionListHost;
  session: SidebarRecentSession;
  listItem?: boolean;
  projectChild?: boolean;
}): TemplateResult {
  const { host, session, listItem = true, projectChild = false } = params;
  const expanded = host.isSessionChildrenExpanded(session);
  const visibleChildren = visibleSessionChildren({
    session,
    fullyShownChildSessionKeys: host.fullyShownChildSessionKeys,
  });
  const hiddenChildCount = session.children.length - visibleChildren.length;
  return html`<div
    class="sidebar-session-tree"
    data-session-tree=${session.key}
    role=${ifDefined(listItem ? "listitem" : undefined)}
  >
    ${renderRecentSession({ host, session, listItem: false, projectChild })}
    ${expanded
      ? html`<div class="sidebar-session-tree__children">
          ${visibleChildren.length > 0
            ? html`<div
                class="sidebar-session-tree__list"
                role=${ifDefined(listItem ? "list" : undefined)}
                aria-label=${ifDefined(listItem ? t("sessionsView.childSessions") : undefined)}
              >
                ${visibleChildren.map((child) =>
                  renderSessionTree({ host, session: child, listItem }),
                )}
              </div>`
            : nothing}
          ${hiddenChildCount > 0
            ? html`<button
                class="sidebar-session-tree__show-more"
                type="button"
                data-show-more-children=${session.key}
                aria-label=${t("sessionsView.showMoreChildren", {
                  count: String(hiddenChildCount),
                })}
                @click=${() => host.showMoreChildren(session.key)}
              >
                ${t("sessionsView.showMoreChildren", { count: String(hiddenChildCount) })}
              </button>`
            : nothing}
          ${session.loadingChildren && session.children.length === 0
            ? html`<span class="sidebar-session-tree__loading">${t("common.loading")}</span>`
            : nothing}
        </div>`
      : nothing}
  </div>`;
}
