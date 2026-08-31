// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDeferred } from "../../../../test/helpers/promise.js";
import type { GatewayBrowserClient } from "../../api/gateway.ts";
import type { SessionsListResult } from "../../api/types.ts";
import { createSessionCapability } from "./index.ts";
import { createGatewayHarness, sessionsResult } from "./session-capability.test-support.ts";
import type { SessionListSnapshot } from "./session-capability.ts";

function rowLabel(result: SessionsListResult | null, key: string): string | undefined {
  return result?.sessions.find((row) => row.key === key)?.label;
}

function rowDisplayName(result: SessionsListResult | null, key: string): string | undefined {
  return result?.sessions.find((row) => row.key === key)?.displayName;
}

function labelHarness(options: {
  patchResponse: (call: number) => Promise<unknown>;
  serverLabel: () => string;
}) {
  const key = "agent:main:alpha";
  const sessionId = "alpha-session";
  let patchCalls = 0;
  let listTs = 0;
  const request = vi.fn(async (method: string) => {
    if (method === "sessions.patch") {
      patchCalls += 1;
      return await options.patchResponse(patchCalls);
    }
    if (method === "sessions.list") {
      listTs += 1;
      const label = options.serverLabel();
      return sessionsResult(
        [{ key, sessionId, kind: "direct", updatedAt: listTs, label, displayName: label }],
        listTs,
      );
    }
    if (method === "sessions.subscribe") {
      return { subscribed: true };
    }
    throw new Error(`Unexpected request: ${method}`);
  });
  const harness = createGatewayHarness({ request } as unknown as GatewayBrowserClient);
  return { ...harness, key, sessionId };
}

describe("session label mutations", () => {
  it("keeps a pending rename through a stale Gateway event and canonical refresh", async () => {
    const committed = createDeferred<unknown>();
    let serverLabel = "Original";
    const { gateway, key, sessionId } = labelHarness({
      patchResponse: () => committed.promise,
      serverLabel: () => serverLabel,
    });
    const sessions = createSessionCapability(gateway);

    await sessions.refresh({ force: true });
    const operation = sessions.patch(
      key,
      { label: "Renamed" },
      { agentId: "main", expectedSessionId: sessionId },
    );
    expect(rowLabel(sessions.state.result, key)).toBe("Renamed");

    sessions.reconcileChanged({
      sessionKey: key,
      sessionId,
      reason: "send",
      key,
      kind: "direct",
      updatedAt: 2,
      label: "Original",
      displayName: "Original",
    });
    expect(rowLabel(sessions.state.result, key)).toBe("Renamed");
    await sessions.refresh({ force: true });
    expect(rowLabel(sessions.state.result, key)).toBe("Renamed");

    serverLabel = "Renamed";
    committed.resolve({ ok: true, key, path: "", entry: {} });
    await expect(operation).resolves.toBeTruthy();
    expect(rowLabel(sessions.state.result, key)).toBe("Renamed");
    sessions.dispose();
  });

  it("rolls a rejected rename back across primary and filtered lists", async () => {
    const rejected = createDeferred<unknown>();
    const { gateway, key, sessionId } = labelHarness({
      patchResponse: () => rejected.promise,
      serverLabel: () => "Original",
    });
    const sessions = createSessionCapability(gateway);
    const filtered: SessionListSnapshot[] = [];
    const stopFiltered = sessions.subscribeList({ archivedFilter: "all" }, (snapshot) => {
      filtered.push(snapshot);
    });
    const filteredLabel = () => rowLabel(filtered.at(-1)?.result ?? null, key);

    await sessions.refresh({ force: true });
    await sessions.refreshList({ archivedFilter: "all", force: true });
    const operation = sessions.patch(
      key,
      { label: "Renamed" },
      { agentId: "main", expectedSessionId: sessionId },
    );
    expect(rowLabel(sessions.state.result, key)).toBe("Renamed");
    expect(filteredLabel()).toBe("Renamed");

    rejected.reject(new Error("rename rejected"));
    await expect(operation).rejects.toThrow("rename rejected");
    expect(rowLabel(sessions.state.result, key)).toBe("Original");
    expect(filteredLabel()).toBe("Original");
    expect(sessions.state.error).toContain("rename rejected");
    stopFiltered();
    sessions.dispose();
  });

  it("clears the explicit display name optimistically and restores it on rejection", async () => {
    const rejected = createDeferred<unknown>();
    const { gateway, key, sessionId } = labelHarness({
      patchResponse: () => rejected.promise,
      serverLabel: () => "Custom name",
    });
    const sessions = createSessionCapability(gateway);

    await sessions.refresh({ force: true });
    const operation = sessions.patch(
      key,
      { label: null },
      { agentId: "main", expectedSessionId: sessionId },
    );
    expect(rowLabel(sessions.state.result, key)).toBeUndefined();
    expect(rowDisplayName(sessions.state.result, key)).toBeUndefined();

    rejected.reject(new Error("clear rejected"));
    await expect(operation).rejects.toThrow("clear rejected");
    expect(rowLabel(sessions.state.result, key)).toBe("Custom name");
    expect(rowDisplayName(sessions.state.result, key)).toBe("Custom name");
    sessions.dispose();
  });

  it("rolls a rejected rename back to a newer canonical label", async () => {
    const rejected = createDeferred<unknown>();
    const { gateway, key, sessionId } = labelHarness({
      patchResponse: () => rejected.promise,
      serverLabel: () => "Original",
    });
    const sessions = createSessionCapability(gateway);

    await sessions.refresh({ force: true });
    const operation = sessions.patch(
      key,
      { label: "Local rename" },
      { agentId: "main", expectedSessionId: sessionId },
    );
    sessions.reconcileChanged({
      sessionKey: key,
      sessionId,
      reason: "metadata",
      key,
      kind: "direct",
      updatedAt: 2,
      label: "External rename",
      displayName: "External rename",
    });
    expect(rowLabel(sessions.state.result, key)).toBe("Local rename");

    rejected.reject(new Error("local rename rejected"));
    await expect(operation).rejects.toThrow("local rename rejected");
    expect(rowLabel(sessions.state.result, key)).toBe("External rename");
    sessions.dispose();
  });

  it("rolls a newer failed rename back to an overlapping confirmed rename", async () => {
    const firstCommitted = createDeferred<unknown>();
    const secondRejected = createDeferred<unknown>();
    let serverLabel = "Original";
    const { gateway, key, sessionId } = labelHarness({
      patchResponse: (call) => (call === 1 ? firstCommitted.promise : secondRejected.promise),
      serverLabel: () => serverLabel,
    });
    const sessions = createSessionCapability(gateway);

    await sessions.refresh({ force: true });
    const first = sessions.patch(
      key,
      { label: "First" },
      { agentId: "main", expectedSessionId: sessionId },
    );
    const second = sessions.patch(
      key,
      { label: "Second" },
      { agentId: "main", expectedSessionId: sessionId },
    );
    expect(rowLabel(sessions.state.result, key)).toBe("Second");

    serverLabel = "First";
    firstCommitted.resolve({ ok: true, key, path: "", entry: {} });
    await expect(first).resolves.toBeTruthy();
    expect(rowLabel(sessions.state.result, key)).toBe("Second");

    secondRejected.reject(new Error("second rename rejected"));
    await expect(second).rejects.toThrow("second rename rejected");
    expect(rowLabel(sessions.state.result, key)).toBe("First");
    sessions.dispose();
  });
});
