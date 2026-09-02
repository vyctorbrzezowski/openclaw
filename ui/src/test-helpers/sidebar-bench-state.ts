export type RunState = "idle" | "queued" | "running" | "done" | "failed" | "killed" | "timeout";
export type ChildState =
  | "none"
  | "one-running"
  | "two-running"
  | "two-done"
  | "three-failed"
  | "mixed-3"
  | "mixed-6";
export type BadgeState = {
  incognito: boolean;
  automation: boolean;
  pullRequest: boolean;
  approval: boolean;
  outbox: boolean;
  draft: boolean;
  cloud: boolean;
  disk: boolean;
  conflict: boolean;
};
export type BenchState = {
  target: "session" | "page";
  theme: "dark" | "light";
  layout: "desktop" | "narrow" | "collapsed";
  active: boolean;
  selected: boolean;
  unread: boolean;
  run: RunState;
  attention: "none" | "question" | "approval" | "agent" | "error";
  subtitle: "none" | "preview" | "work" | "narration";
  identity: "none" | "icon" | "emoji" | "owner";
  children: ChildState;
  childrenExpanded: boolean;
  sectionCollapsed: boolean;
  pinned: boolean;
  archived: boolean;
  draftVisibility: boolean;
  forked: boolean;
  forceHover: boolean;
  forceFocus: boolean;
  touch: boolean;
  hovercard: boolean;
  badges: BadgeState;
  selectedSessionId: string;
  sessionOverrides: Record<string, Partial<BenchState>>;
};

export const defaultBadges: BadgeState = {
  incognito: false,
  automation: false,
  pullRequest: false,
  approval: false,
  outbox: false,
  draft: false,
  cloud: false,
  disk: false,
  conflict: false,
};

export const sidebarBenchDefaults: BenchState = {
  target: "session",
  theme: "dark",
  layout: "desktop",
  active: true,
  selected: false,
  unread: true,
  run: "running",
  attention: "none",
  subtitle: "preview",
  identity: "icon",
  children: "mixed-3",
  childrenExpanded: true,
  sectionCollapsed: false,
  pinned: false,
  archived: false,
  draftVisibility: false,
  forked: false,
  forceHover: false,
  forceFocus: false,
  touch: false,
  hovercard: false,
  badges: { ...defaultBadges },
  selectedSessionId: "bench-core",
  sessionOverrides: {},
};
