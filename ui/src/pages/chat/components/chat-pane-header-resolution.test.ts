/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import type { GatewaySessionRow } from "../../../api/types.ts";
import { chatPaneHeaderSessionRow as row } from "./chat-pane-header.test-support.ts";
import {
  canRevealSessionWorkspace,
  resolveChatPaneParentSession,
  resolveChatPaneWorkspace,
} from "./chat-pane-header.ts";

describe("chat pane parent resolution", () => {
  it("uses the navigation parent and its canonical display name", () => {
    const parent = row({
      key: "agent:main:parent",
      label: "Release prep",
    });
    const controlOwner = row({
      key: "agent:main:control-owner",
      label: "Coordinator",
    });

    expect(
      resolveChatPaneParentSession(
        row({
          key: "agent:main:child",
          parentSessionKey: parent.key,
          spawnedBy: controlOwner.key,
        }),
        [controlOwner, parent],
      ),
    ).toEqual({ key: parent.key, title: "Release prep" });
  });

  it("omits unresolved and self-referential parents", () => {
    const child = row({ key: "agent:main:child", parentSessionKey: "agent:main:missing" });
    expect(resolveChatPaneParentSession(child, [child])).toBeNull();
    expect(
      resolveChatPaneParentSession({ ...child, parentSessionKey: child.key }, [child]),
    ).toBeNull();
  });
});

describe("chat pane workspace resolution", () => {
  it("uses worktree repo vocabulary with spawned cwd", () => {
    expect(
      resolveChatPaneWorkspace({
        session: row({
          spawnedCwd: "/tmp/worktrees/title-bar",
          worktree: { id: "wt-1", branch: "title-bar", repoRoot: "/src/openclaw" },
        }),
      }),
    ).toEqual({ root: "/tmp/worktrees/title-bar", label: "openclaw" });
  });

  it("does not substitute the agent workspace for a missing worktree checkout", () => {
    expect(
      resolveChatPaneWorkspace({
        session: row({
          worktree: { id: "wt-missing", branch: "feature", repoRoot: "/src/openclaw" },
        }),
        agentWorkspace: "/src/default-agent-workspace",
        worktreePath: null,
      }),
    ).toEqual({ root: null, label: "openclaw" });
  });

  it("matches the gateway root order: spawned workspace before spawned cwd", () => {
    expect(
      resolveChatPaneWorkspace({
        session: row({
          spawnedWorkspaceDir: "/src/openclaw",
          spawnedCwd: "/src/openclaw/packages/nested",
        }),
      }),
    ).toEqual({ root: "/src/openclaw", label: "openclaw" });
    // execCwd is exec-node routing state; it never overrides local facts.
    expect(
      resolveChatPaneWorkspace({
        session: row({ execCwd: "/remote/stale", spawnedCwd: "/src/openclaw" }),
      }),
    ).toEqual({ root: "/src/openclaw", label: "openclaw" });
  });

  it("prefers exec cwd and falls back to the agent workspace", () => {
    expect(
      resolveChatPaneWorkspace({
        session: row({ execNode: "build-mac", execCwd: "/remote/build" }),
        agentWorkspace: "/local/default",
      }),
    ).toEqual({ root: "/remote/build", label: "build" });
    // Without execCwd, gateway-local facts must not stand in for a path that
    // lives on another machine.
    expect(
      resolveChatPaneWorkspace({
        session: row({ execNode: "build-mac", spawnedCwd: "/local/spawned" }),
        agentWorkspace: "/local/default",
        worktreePath: "/local/worktree",
      }),
    ).toEqual({ root: null, label: null });
    expect(resolveChatPaneWorkspace({ session: row(), agentWorkspace: "/src/openclaw" })).toEqual({
      root: "/src/openclaw",
      label: "openclaw",
    });
  });

  it("disables reveal for exec nodes, remote placement, and missing advertisement", () => {
    expect(
      canRevealSessionWorkspace({
        session: row({ execNode: "build-mac", execCwd: "/remote/build" }),
        workspaceRoot: "/remote/build",
        methodAdvertised: true,
        hasAdminAccess: true,
      }),
    ).toBe(false);
    expect(
      canRevealSessionWorkspace({
        session: row({ placement: { state: "requested" } as GatewaySessionRow["placement"] }),
        workspaceRoot: "/cloud/work",
        methodAdvertised: true,
        hasAdminAccess: true,
      }),
    ).toBe(false);
    expect(
      canRevealSessionWorkspace({
        session: row(),
        workspaceRoot: "/src/openclaw",
        methodAdvertised: false,
        hasAdminAccess: true,
      }),
    ).toBe(false);
    expect(
      canRevealSessionWorkspace({
        session: row(),
        workspaceRoot: "/src/openclaw",
        methodAdvertised: true,
        hasAdminAccess: false,
      }),
    ).toBe(false);
  });
});
