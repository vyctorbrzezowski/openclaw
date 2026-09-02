import { html, nothing, render, type TemplateResult } from "lit";
import { SidebarCatalogMenuController } from "../components/app-sidebar-catalog-menu.ts";
import { renderSidebarNavRoute } from "../components/app-sidebar-nav-menus.ts";
import { renderSessionTree } from "../components/app-sidebar-session-row-render.ts";
import type { SessionListHost } from "../components/app-sidebar-session-row-render.ts";
import { renderSidebarSessionSectionHeader } from "../components/app-sidebar-session-section-header.ts";
import type {
  SidebarRecentSession,
  SidebarSessionAttention,
} from "../components/app-sidebar-session-types.ts";
import { icons } from "../components/icons.ts";
import { renderSessionHovercard } from "../components/session-hovercard.ts";
import { resolveSidebarSessionSubtitle } from "../components/session-row-subtitle.ts";
import { i18n, t } from "../i18n/index.ts";
import type { SessionMethodAccess } from "../lib/session-method-access.ts";
import { renderSidebarBenchControls } from "./sidebar-bench-controls.ts";
import { sidebarSessionSeeds, type SessionFixtureSeed } from "./sidebar-bench-fixtures.ts";
import {
  defaultBadges,
  sidebarBenchDefaults as defaults,
  type BenchState,
  type ChildState,
  type RunState,
} from "./sidebar-bench-state.ts";
import "../components/session-owner-chip.ts";
import "../components/tooltip.ts";
import "../components/viewer-facepile.ts";
import "../components/web-awesome.ts";
import "../styles.css";

const neutralRowState: BenchState = {
  ...defaults,
  active: false,
  selected: false,
  unread: false,
  run: "idle",
  attention: "none",
  subtitle: "preview",
  identity: "none",
  children: "none",
  childrenExpanded: false,
  pinned: false,
  archived: false,
  draftVisibility: false,
  forked: false,
  forceHover: false,
  forceFocus: false,
  hovercard: false,
  badges: { ...defaultBadges },
};

const root = document.querySelector<HTMLElement>("#sidebar-bench")!;

let state = readState(new URLSearchParams(location.search).get("state"));
let activePage: "chat" | "sessions" | "config" = "chat";

function readState(raw: string | null): BenchState {
  if (!raw || raw === "default") {
    return structuredClone(defaults);
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<BenchState>;
    return {
      ...defaults,
      ...parsed,
      badges: { ...defaultBadges, ...parsed.badges },
      sessionOverrides:
        parsed.sessionOverrides && typeof parsed.sessionOverrides === "object"
          ? parsed.sessionOverrides
          : {},
    };
  } catch {
    return structuredClone(defaults);
  }
}

function writeState(): void {
  const url = new URL(location.href);
  url.searchParams.set("state", encodeURIComponent(JSON.stringify(state)));
  history.replaceState(null, "", url);
}

function setTheme(): void {
  const documentRoot = document.documentElement;
  documentRoot.dataset.theme = state.theme;
  documentRoot.dataset.themeMode = state.theme;
  documentRoot.dataset.themeResolved = state.theme;
  documentRoot.classList.toggle("wa-light", state.theme === "light");
  documentRoot.classList.toggle("wa-dark", state.theme === "dark");
  documentRoot.style.colorScheme = state.theme;
}

function access(): SessionMethodAccess {
  return { allowed: true, requiredScope: "operator.write" };
}

function attention(sessionState: BenchState): SidebarSessionAttention {
  switch (sessionState.attention) {
    case "question":
      return { kind: "question" };
    case "approval":
      return { kind: "approval" };
    case "agent":
      return { kind: "agent", note: "Waiting for design review", icon: "flag" };
    case "error":
      return { kind: "error", reason: "The last tool call failed" };
    default:
      return { kind: "none" };
  }
}

function runFields(
  run: RunState,
): Pick<
  SidebarRecentSession,
  "hasActiveRun" | "status" | "startedAt" | "endedAt" | "runtimeMs" | "runtimeSampledAt"
> {
  const now = Date.now();
  if (run === "idle") {
    return {
      hasActiveRun: false,
      status: undefined,
      startedAt: undefined,
      endedAt: undefined,
      runtimeMs: undefined,
      runtimeSampledAt: undefined,
    };
  }
  const active = run === "queued" || run === "running";
  return {
    hasActiveRun: active,
    status: run,
    startedAt: now - 93_000,
    endedAt: active ? undefined : now - 12_000,
    runtimeMs: active ? 93_000 : 81_000,
    runtimeSampledAt: now,
  };
}

function childSession(
  parentId: string,
  status: "running" | "done" | "failed",
  index: number,
): SidebarRecentSession {
  const run = status === "running" ? "running" : status;
  return {
    ...baseSession(`agent:main:${parentId}-child-${index}`, `Subagent ${index}`),
    ...runFields(run),
    active: false,
    visuallyActive: false,
    unread: status === "failed",
    isChild: true,
    icon: index === 1 ? "bot" : undefined,
    children: [],
    childSessionKeys: [],
    containsActiveDescendant: false,
    runningChildCount: 0,
    failedChildCount: 0,
    lastMessagePreview:
      status === "running"
        ? "Auditing row geometry"
        : status === "done"
          ? "Review complete"
          : "Needs retry",
  };
}

function baseSession(key: string, label: string): SidebarRecentSession {
  return {
    key,
    sessionId: key.replaceAll(":", "-"),
    label,
    href: `/chat?session=${encodeURIComponent(key)}`,
    active: false,
    visuallyActive: false,
    hasActiveRun: false,
    modelSelectionLocked: false,
    pinned: false,
    cloudWorkerStopAction: null,
    hasAutomation: false,
    unread: false,
    attention: { kind: "none" },
    childSessionKeys: [],
    children: [],
    isChild: false,
    loadingChildren: false,
    containsActiveDescendant: false,
    runningChildCount: 0,
    failedChildCount: 0,
  };
}

function childStates(value: ChildState): readonly ("running" | "done" | "failed")[] {
  switch (value) {
    case "one-running":
      return ["running"];
    case "two-running":
      return ["running", "running"];
    case "two-done":
      return ["done", "done"];
    case "three-failed":
      return ["failed", "failed", "failed"];
    case "mixed-3":
      return ["running", "done", "failed"];
    case "mixed-6":
      return ["running", "running", "done", "done", "failed", "failed"];
    default:
      return [];
  }
}

function rowState(seed: SessionFixtureSeed): BenchState {
  const override = state.sessionOverrides[seed.id] ?? {};
  return {
    ...neutralRowState,
    ...seed.state,
    ...override,
    badges: { ...defaultBadges, ...seed.state.badges, ...override.badges },
    selectedSessionId: state.selectedSessionId,
    sessionOverrides: state.sessionOverrides,
    theme: state.theme,
    layout: state.layout,
    target: state.target,
    touch: state.touch,
    sectionCollapsed:
      seed.group === seedForId(state.selectedSessionId)?.group ? state.sectionCollapsed : false,
  };
}

function sessionFixture(seed: SessionFixtureSeed): SidebarRecentSession {
  const sessionState = rowState(seed);
  const children = childStates(sessionState.children).map((childState, index) =>
    childSession(seed.id, childState, index + 1),
  );
  const preview =
    sessionState.subtitle === "none"
      ? undefined
      : sessionState.subtitle === "work"
        ? "openclaw · sidebar-bench"
        : sessionState.subtitle === "narration"
          ? "Comparing sidebar states"
          : "Refine the session row state machine";
  const owner =
    sessionState.identity === "owner"
      ? { type: "human" as const, id: "profile-vyctor", label: "Vyctor" }
      : undefined;
  const icon =
    sessionState.identity === "icon" ? "bot" : sessionState.identity === "emoji" ? "🦞" : undefined;
  return {
    ...baseSession(`agent:main:${seed.id}`, seed.label),
    ...runFields(sessionState.run),
    active: sessionState.active,
    visuallyActive: sessionState.active,
    pinned: sessionState.pinned,
    archived: sessionState.archived,
    visibility: sessionState.draftVisibility ? "draft" : undefined,
    draftOwnedBySelf: sessionState.draftVisibility || undefined,
    forkSource: sessionState.forked
      ? { sessionKey: "agent:main:source", sessionId: "source-session" }
      : undefined,
    unread: sessionState.unread,
    attention: attention(sessionState),
    icon,
    owner: owner ? { actor: owner, assignedAt: Date.now() - 60_000 } : undefined,
    createdActor: owner,
    participants: owner ? [owner, { type: "human", id: "profile-mira", label: "Mira" }] : undefined,
    participantCount: owner ? 2 : undefined,
    lastMessagePreview: preview,
    subtitle: sessionState.subtitle === "work" ? preview : undefined,
    workSession: sessionState.subtitle === "work",
    activeRunIds: sessionState.run === "running" ? [`${seed.id}-run`] : [],
    hasAutomation: sessionState.badges.automation,
    incognito: sessionState.badges.incognito,
    pullRequest: sessionState.badges.pullRequest ? { numbers: [130421], state: "open" } : undefined,
    outboxAttentionCount: sessionState.badges.outbox ? 3 : undefined,
    hasComposerDraft: sessionState.badges.draft,
    placementState:
      sessionState.badges.cloud || sessionState.badges.conflict ? "active" : undefined,
    diskSpaceStatus: sessionState.badges.disk ? "warning" : undefined,
    workspaceConflictCount: sessionState.badges.conflict ? 2 : undefined,
    children,
    childSessionKeys: children.map((child) => child.key),
    containsActiveDescendant: children.some((child) => child.hasActiveRun),
    runningChildCount: children.filter((child) => child.hasActiveRun).length,
    failedChildCount: children.filter((child) => child.status === "failed").length,
  };
}

function sessionHost(session: SidebarRecentSession, sessionState: BenchState): SessionListHost {
  const catalogMenu = new SidebarCatalogMenuController({
    beforeOpen: () => {},
    requestUpdate: () => {},
    terminalAvailable: () => false,
    navigate: () => {},
  });
  return {
    sessionDataContext: undefined,
    sidebarLiveActivity: sessionState.subtitle === "narration",
    sessionsShowPreview: sessionState.subtitle !== "none",
    sidebarNarrationLines: new Map(
      sessionState.subtitle === "narration" ? [[session.key, "Comparing sidebar states"]] : [],
    ),
    sidebarObserverDigests: new Map(),
    sessionProjection: {
      resolveSubtitle: (params) => resolveSidebarSessionSubtitle(params),
    },
    selectedSessionKeys: sessionState.selected ? new Set([session.key]) : new Set(),
    connected: true,
    sessionData: {
      approvalBadgeSnapshot: () => ({
        agentCounts: new Map(),
        sessionKeys: sessionState.badges.approval ? new Set([session.key]) : new Set(),
      }),
      childSessionErrorsByParent: new Map(),
      loadMoreSessionCatalog: async () => {},
      presenceInstanceId: undefined,
      presencePayload: undefined,
      refreshSessionCatalogs: async () => {},
      retryChildSessions: () => {},
      sessionCatalogRefreshStatus: { error: null, hasLoaded: true, stale: false },
      sessionMutationError: null,
    },
    sessionsGrouping: "none",
    collapsedSessionSections: sessionState.sectionCollapsed
      ? new Set(["bench-section"])
      : new Set(),
    sessionOrganizer: {
      draggingSidebarSection: null,
      draggingSessionKey: null,
      sessionDropTarget: null,
      sidebarSectionDropTarget: null,
      sessionListRemovalDrop: false,
    },
    sidebarMenus: {
      catalogMenu,
      catalogViewMenuPosition: null,
      openCatalogViewMenu: () => {},
      openSessionGroupMenu: () => {},
      openSessionMenu: () => updateSession(session.key, { forceHover: true }),
      sessionGroupMenu: null,
      sessionMenu: null,
      sessionSortMenuPosition: null,
      toggleCatalogViewMenu: () => {},
      toggleSessionSortMenu: () => update({ target: "session" }),
    },
    sessionsStatusFilter: sessionState.archived ? "archived" : "active",
    sessionOwnerFilterActive: false,
    sessionOwnershipVisible: sessionState.identity === "owner",
    sessionPullRequestIndicatorState: () => "none",
    mainSessionRow: () => null,
    isSessionChildrenExpanded: () => sessionState.childrenExpanded,
    isSessionChildrenFullyShown: () => true,
    startSessionDrag: () => {},
    finishSessionDrag: () => {},
    handleSessionRowClick: (event) => {
      event.preventDefault();
      selectSession(session.key.slice("agent:main:".length));
    },
    toggleSessionChildren: () =>
      updateSession(session.key, { childrenExpanded: !sessionState.childrenExpanded }),
    toggleSessionPin: () => updateSession(session.key, { pinned: !sessionState.pinned }),
    toggleSessionMenu: () => updateSession(session.key, { forceHover: !sessionState.forceHover }),
    showMoreChildren: () => {},
    sectionDragOver: () => {},
    sectionDragLeave: () => {},
    sectionDrop: () => {},
    startSidebarSectionDrag: () => {},
    finishSidebarSectionDrag: () => {},
    toggleSection: () =>
      updateSession(session.key, { sectionCollapsed: !sessionState.sectionCollapsed }),
    openNewSession: () => {},
    readNewSessionAccess: access,
    readSessionMutationAccess: access,
    requestOpenNewSession: () => {},
    setVisibleSessionLimit: () => {},
    clearSessionSelection: () => updateSession(session.key, { selected: false }),
    handleSessionListDragOver: () => {},
    handleSessionListDragLeave: () => {},
    handleSessionListDrop: () => {},
    dismissSessionMutationError: () => {},
    openCatalogMenu: () => {},
    retargetCatalogMenuTrigger: () => {},
  };
}

function update(next: Partial<BenchState>): void {
  const globalKeys = new Set<keyof BenchState>([
    "target",
    "theme",
    "layout",
    "touch",
    "selectedSessionId",
    "sessionOverrides",
  ]);
  const rowPatch = Object.fromEntries(
    Object.entries(next).filter(([key]) => !globalKeys.has(key as keyof BenchState)),
  ) as Partial<BenchState>;
  const sessionOverrides =
    Object.keys(rowPatch).length === 0
      ? state.sessionOverrides
      : {
          ...state.sessionOverrides,
          [state.selectedSessionId]: {
            ...state.sessionOverrides[state.selectedSessionId],
            ...rowPatch,
          },
        };
  state = { ...state, ...next, sessionOverrides };
  writeState();
  renderBench();
}

function seedForId(id: string): SessionFixtureSeed | undefined {
  return sidebarSessionSeeds.find((seed) => seed.id === id);
}

function selectSession(id: string): void {
  const seed = seedForId(id);
  if (!seed) {
    return;
  }
  const selected = rowState(seed);
  const sessionOverrides = { ...state.sessionOverrides };
  const previousSelected = seedForId(state.selectedSessionId);
  if (previousSelected && previousSelected.id !== id) {
    sessionOverrides[previousSelected.id] = {
      ...sessionOverrides[previousSelected.id],
      active: false,
    };
  }
  sessionOverrides[id] = { ...sessionOverrides[id], active: true };
  state = {
    ...state,
    ...selected,
    active: true,
    selectedSessionId: id,
    sessionOverrides,
    target: "session",
  };
  writeState();
  renderBench();
}

function updateSession(key: string, next: Partial<BenchState>): void {
  const id = key.startsWith("agent:main:") ? key.slice("agent:main:".length) : key;
  const seed = seedForId(id);
  if (!seed) {
    return;
  }
  const previous = state.sessionOverrides[id] ?? {};
  const sessionOverrides = {
    ...state.sessionOverrides,
    [id]: {
      ...previous,
      ...next,
      ...(next.badges
        ? { badges: { ...seed.state.badges, ...previous.badges, ...next.badges } }
        : {}),
    },
  };
  state = {
    ...state,
    ...(id === state.selectedSessionId ? next : {}),
    sessionOverrides,
  };
  writeState();
  renderBench();
}

function navRow(routeId: "chat" | "sessions" | "config") {
  return renderSidebarNavRoute({
    routeId,
    href: `/${routeId}`,
    active: state.target === "page" && state.active && activePage === routeId,
    onNavigate: () => {
      activePage = routeId;
      update({ target: "page", active: true });
    },
    onPreload: () => {},
    onCancelPreload: () => {},
  });
}

function sessionSection(
  group: SessionFixtureSeed["group"],
  rows: readonly SidebarRecentSession[],
  hosts: ReadonlyMap<string, SessionListHost>,
) {
  const selectedSeed = seedForId(state.selectedSessionId);
  const collapsed = selectedSeed?.group === group && state.sectionCollapsed;
  const activeCount = rows.filter((row) => row.hasActiveRun).length;
  return html`<section class="sidebar-sessions">
    <div class="sidebar-recent-sessions">
      <div
        class="sidebar-recent-sessions__group ${collapsed
          ? "sidebar-recent-sessions__group--collapsed"
          : ""}"
      >
        ${renderSidebarSessionSectionHeader({
          sectionId: `bench-${group}`,
          draggable: true,
          onStartDrag: () => {},
          onFinishDrag: () => {},
          content: html`<button
            class="sidebar-session-group-toggle"
            type="button"
            aria-expanded=${String(!collapsed)}
            @click=${() => update({ sectionCollapsed: !collapsed })}
          >
            <span class="sidebar-session-group-toggle__lead"
              ><span class="sidebar-session-group-toggle__icon"
                >${collapsed ? icons.chevronRight : icons.chevronDown}</span
              ></span
            >
            <span class="sidebar-recent-sessions__label-text">${group}</span>
            ${collapsed
              ? html`<span class="sidebar-session-group-count">${rows.length}</span>${activeCount >
                  0
                    ? html`<span class="session-run-spinner sidebar-session-group-running"></span>`
                    : nothing}`
              : nothing}
          </button>`,
        })}
        ${collapsed
          ? nothing
          : html`<div class="sidebar-recent-sessions__list" role="list">
              ${rows.map((session) =>
                renderSessionTree({ host: hosts.get(session.key)!, session }),
              )}
            </div>`}
      </div>
    </div>
  </section>`;
}

function sidebarPreview(): TemplateResult {
  const sessions = sidebarSessionSeeds.map((seed) => sessionFixture(seed));
  const hosts = new Map(
    sessions.map((session, index) => [
      session.key,
      sessionHost(session, rowState(sidebarSessionSeeds[index]!)),
    ]),
  );
  const selectedSession = sessions.find(
    (session) => session.key === `agent:main:${state.selectedSessionId}`,
  )!;
  const selectedState = rowState(seedForId(state.selectedSessionId)!);
  const pinned = sessions.filter((session) => session.pinned);
  const unpinned = sessions.filter((session) => !session.pinned);
  const groups = ["Design work", "Client projects", "Automations", "Other"] as const;
  const sidebarClass = [
    "sidebar-bench__sidebar",
    state.target === "session" && selectedState.forceHover ? "is-session-hovered" : "",
    state.target === "page" && state.forceHover ? "is-page-hovered" : "",
    state.touch ? "is-touch" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (state.layout === "collapsed") {
    return html`<div class="sidebar-bench__collapsed-preview">
      <button type="button" @click=${() => update({ layout: "desktop" })} aria-label="Open sidebar">
        ${icons.panelLeft}</button
      ><span>Sidebar is collapsed</span>
    </div>`;
  }
  return html`<div class=${sidebarClass}>
    <div class="sidebar sidebar-shell">
      <div class="sidebar-brand">
        <strong>OpenClaw</strong><span></span
        ><button class="sidebar-brand__icon sidebar-brand__new-thread" type="button">
          ${icons.plus}
        </button>
      </div>
      <div class="sidebar-shell__content">
        <div class="sidebar-shell__body">
          <nav class="sidebar-nav" aria-label="Pages">
            <div class="sidebar-nav__head"><span>Pages</span></div>
            ${navRow("chat")}${navRow("sessions")}${navRow("config")}
            ${pinned.map(
              (session) => html`<div class="sidebar-zone-entry" data-sidebar-entry=${session.key}>
                ${renderSessionTree({ host: hosts.get(session.key)!, session, listItem: false })}
              </div>`,
            )}
          </nav>
          <div class="sidebar-session-toolbar sidebar-bench__sessions-toolbar">
            <span class="sidebar-recent-sessions__label-text">${t("chat.sidebar.threads")}</span>
            <button
              class="sidebar-session-toolbar__button"
              type="button"
              title=${t("chat.sidebar.sortSessions")}
            >
              ${icons.listFilter}
            </button>
            <button
              class="sidebar-session-toolbar__button sidebar-new-session"
              type="button"
              title=${t("chat.runControls.newSession")}
            >
              ${icons.plus}
            </button>
          </div>
          ${groups.map((group) =>
            sessionSection(
              group,
              unpinned.filter(
                (session) => seedForId(session.key.slice("agent:main:".length))?.group === group,
              ),
              hosts,
            ),
          )}
        </div>
        <footer class="sidebar-shell__footer">
          <span class="sidebar-bench__footer-dot"></span><span>Gateway connected</span>
        </footer>
      </div>
    </div>
    ${selectedState.hovercard
      ? html`<div class="sidebar-bench__hovercard" role="dialog" aria-label="Session preview">
          ${renderSessionHovercard({
            row: selectedSession,
            selfUserId: "profile-vyctor",
            progressCard: null,
          })}
        </div>`
      : nothing}
  </div>`;
}

function renderBench(): void {
  setTheme();
  const selectedSeed = seedForId(state.selectedSessionId) ?? sidebarSessionSeeds[0]!;
  const selectedState = rowState(selectedSeed);
  render(
    html`<main class="sidebar-bench ${state.layout === "narrow" ? "sidebar-bench--narrow" : ""}">
      ${renderSidebarBenchControls({
        state: selectedState,
        sessions: sidebarSessionSeeds,
        onSelectSession: selectSession,
        onChange: update,
        onBadgeChange: (name, checked) => update({ badges: { ...state.badges, [name]: checked } }),
        onReset: () => {
          state = structuredClone(defaults);
          selectSession(defaults.selectedSessionId);
        },
      })}
      <section class="sidebar-bench__stage">
        <header>
          <div>
            <span>Live production surface</span>
            <h2>
              ${state.layout === "collapsed" ? "Collapsed desktop state" : "Complete sidebar"}
            </h2>
          </div>
          <output
            >${state.layout === "narrow"
              ? "320 px"
              : state.layout === "collapsed"
                ? "0 px"
                : "296 px"}</output
          >
        </header>
        <div class="sidebar-bench__canvas">${sidebarPreview()}</div>
      </section>
    </main>`,
    root,
  );
  requestAnimationFrame(() => {
    if (!state.forceFocus) {
      return;
    }
    const selector = state.target === "page" ? ".nav-item" : ".sidebar-recent-session__link";
    root.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  });
}

await i18n.setLocale("en");
writeState();
renderBench();
