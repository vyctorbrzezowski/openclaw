import type { BadgeState, BenchState } from "./sidebar-bench-state.ts";

export type SessionFixtureSeed = {
  id: string;
  label: string;
  group: "Design work" | "Client projects" | "Automations" | "Other";
  state: Omit<Partial<BenchState>, "badges"> & { badges?: Partial<BadgeState> };
};

export const sidebarSessionSeeds: readonly SessionFixtureSeed[] = [
  {
    id: "bench-core",
    label: "Rebuild the interactive sidebar bench",
    group: "Design work",
    state: { active: true, run: "running", unread: true, identity: "icon", children: "mixed-3" },
  },
  {
    id: "tokens",
    label: "Tokens",
    group: "Design work",
    state: { run: "idle", subtitle: "none", identity: "emoji", pinned: true },
  },
  {
    id: "contrast-pass",
    label: "Light and dark contrast pass",
    group: "Design work",
    state: { run: "done", unread: true, identity: "owner", children: "two-done" },
  },
  {
    id: "motion-audit",
    label: "Motion audit",
    group: "Design work",
    state: { run: "queued", attention: "agent", children: "one-running", childrenExpanded: false },
  },
  {
    id: "long-title",
    label:
      "Investigate why the sidebar truncates exceptionally long session titles near status badges",
    group: "Design work",
    state: { run: "running", subtitle: "work", badges: { pullRequest: true } },
  },
  {
    id: "failed-layout",
    label: "Layout regression",
    group: "Design work",
    state: { run: "failed", attention: "error", unread: true, children: "three-failed" },
  },
  {
    id: "waiting-review",
    label: "Waiting for design review",
    group: "Design work",
    state: { run: "idle", attention: "question", identity: "owner", badges: { draft: true } },
  },
  {
    id: "component-inventory",
    label: "Component inventory",
    group: "Design work",
    state: { run: "killed", forked: true, subtitle: "preview", children: "none" },
  },
  {
    id: "responsive-sidebar",
    label: "Responsive sidebar density at 320 pixels",
    group: "Design work",
    state: { run: "timeout", attention: "error", badges: { outbox: true } },
  },
  {
    id: "focus-order",
    label: "Keyboard focus order",
    group: "Design work",
    state: { run: "idle", selected: true, forceFocus: true, identity: "icon" },
  },
  {
    id: "acme-onboarding",
    label: "ACME onboarding",
    group: "Client projects",
    state: { run: "running", unread: true, children: "two-running", badges: { cloud: true } },
  },
  {
    id: "migration-plan",
    label: "Migration plan and rollout checkpoints for the European workspace",
    group: "Client projects",
    state: { run: "done", identity: "owner", badges: { pullRequest: true, automation: true } },
  },
  {
    id: "invoice-sync",
    label: "Invoice sync",
    group: "Client projects",
    state: { run: "failed", unread: false, badges: { conflict: true, disk: true } },
  },
  {
    id: "support-handoff",
    label: "Support handoff",
    group: "Client projects",
    state: { run: "idle", attention: "approval", badges: { approval: true } },
  },
  {
    id: "mobile-qa",
    label: "Mobile QA",
    group: "Client projects",
    state: { run: "queued", unread: true, identity: "emoji", badges: { incognito: true } },
  },
  {
    id: "research-notes",
    label: "Research notes",
    group: "Client projects",
    state: { run: "idle", draftVisibility: true, subtitle: "preview", badges: { draft: true } },
  },
  {
    id: "production-hotfix",
    label: "Production hotfix",
    group: "Client projects",
    state: {
      run: "running",
      attention: "approval",
      pinned: true,
      badges: { approval: true, pullRequest: true },
    },
  },
  {
    id: "localization",
    label: "Localization review across all supported languages and compact viewport widths",
    group: "Client projects",
    state: { run: "done", unread: true, children: "mixed-6", childrenExpanded: false },
  },
  {
    id: "archived-launch",
    label: "Archived launch room",
    group: "Client projects",
    state: { run: "done", archived: true, identity: "owner" },
  },
  {
    id: "observer-stall",
    label: "Observer stalled",
    group: "Client projects",
    state: { run: "running", attention: "agent", subtitle: "narration", badges: { outbox: true } },
  },
  {
    id: "nightly",
    label: "Nightly",
    group: "Automations",
    state: { run: "running", badges: { automation: true } },
  },
  {
    id: "dependency-update",
    label: "Dependency update sweep",
    group: "Automations",
    state: {
      run: "queued",
      children: "two-running",
      childrenExpanded: false,
      badges: { automation: true, pullRequest: true },
    },
  },
  {
    id: "backup-verification",
    label: "Backup verification",
    group: "Automations",
    state: { run: "done", unread: true, badges: { automation: true, disk: true } },
  },
  {
    id: "release-publisher",
    label: "Release publisher",
    group: "Automations",
    state: { run: "failed", attention: "error", badges: { automation: true, outbox: true } },
  },
  {
    id: "cloud-cleanup",
    label: "Cloud worker cleanup",
    group: "Automations",
    state: { run: "idle", badges: { automation: true, cloud: true, conflict: true } },
  },
  {
    id: "approval-reminder",
    label: "Approval reminder",
    group: "Automations",
    state: {
      run: "idle",
      attention: "approval",
      unread: true,
      badges: { automation: true, approval: true },
    },
  },
  {
    id: "scratch",
    label: "Scratch",
    group: "Other",
    state: { run: "idle", subtitle: "none", identity: "none" },
  },
  {
    id: "private-experiment",
    label: "Private experiment",
    group: "Other",
    state: { run: "running", draftVisibility: true, badges: { incognito: true, draft: true } },
  },
  {
    id: "forked-analysis",
    label: "Forked analysis",
    group: "Other",
    state: { run: "done", forked: true, unread: true, children: "one-running" },
  },
  {
    id: "workspace-recovery",
    label: "Workspace recovery after interrupted placement and conflicting local changes",
    group: "Other",
    state: {
      run: "timeout",
      attention: "question",
      badges: { cloud: true, disk: true, conflict: true },
    },
  },
];
