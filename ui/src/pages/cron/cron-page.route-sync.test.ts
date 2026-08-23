import { nothing } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GatewayBrowserClient, GatewayEventListener } from "../../api/gateway.ts";
import type { CronJob, CronJobsListResult } from "../../api/types.ts";
import type { ApplicationContext, ApplicationGatewaySnapshot } from "../../app/context.ts";
import type { CronState } from "../../lib/cron/index.ts";
import type { CronRouteData } from "./route.ts";
import "./cron-page.ts";

type CronTestPage = HTMLElement & {
  context: ApplicationContext;
  updateComplete: Promise<boolean>;
  requestUpdate: () => void;
  render: () => typeof nothing;
  cron: CronState;
  cronModelSuggestions: string[];
  routeData?: CronRouteData;
};

function waitForCronPage(assertion: () => void) {
  return vi.waitFor(assertion, { interval: 1 });
}

type TestGateway = ApplicationContext["gateway"] & {
  emitSnapshot: (patch: Partial<ApplicationGatewaySnapshot>) => void;
  emitRetiredEvent: (event: Parameters<GatewayEventListener>[0]) => void;
};

function createGateway(client: GatewayBrowserClient, connected: boolean): TestGateway {
  const snapshot: ApplicationGatewaySnapshot = {
    client,
    phase: connected ? "connected" : "stopped",
    offlineStable: false,
    canvasPluginSurfaceUrl: null,
    hello: null,
    assistantAgentId: null,
    sessionKey: "main",
    lastError: null,
    lastErrorCode: null,
  };
  const snapshotListeners = new Set<(next: ApplicationGatewaySnapshot) => void>();
  const eventListeners = new Set<GatewayEventListener>();
  const allEventListeners: GatewayEventListener[] = [];
  return {
    snapshot,
    connection: { gatewayUrl: "", token: "", password: "" },
    subscribe(listener: (next: ApplicationGatewaySnapshot) => void) {
      snapshotListeners.add(listener);
      return () => snapshotListeners.delete(listener);
    },
    subscribeEvents(listener: GatewayEventListener) {
      eventListeners.add(listener);
      allEventListeners.push(listener);
      return () => eventListeners.delete(listener);
    },
    emitSnapshot(patch: Partial<ApplicationGatewaySnapshot>) {
      Object.assign(snapshot, patch);
      for (const listener of snapshotListeners) {
        listener(snapshot);
      }
    },
    emitRetiredEvent(event: Parameters<GatewayEventListener>[0]) {
      for (const listener of allEventListeners) {
        listener(event);
      }
    },
  } as unknown as TestGateway;
}

function createContext(
  gateway: TestGateway,
  scopeId: string | null = "main",
  selectedId: string | null = scopeId,
): ApplicationContext {
  const subscribe = () => () => undefined;
  let selectionState = { selectedId, scopeId };
  const selectionListeners = new Set<(state: typeof selectionState) => void>();
  return {
    basePath: "",
    gateway,
    agents: {
      state: {
        agentsList: { defaultId: "main", agents: [{ id: "main" }] },
        agentsLoading: false,
        agentsError: null,
      },
      ensureList: vi.fn(async () => undefined),
      subscribe,
    },
    channels: {
      state: {
        channelsSnapshot: null,
      },
      refresh: vi.fn(async () => undefined),
      subscribe,
    },
    runtimeConfig: {
      state: { configSnapshot: null },
      subscribe,
    },
    agentSelection: {
      get state() {
        return selectionState;
      },
      set(agentId: string | null) {
        selectionState = { selectedId: agentId, scopeId: agentId };
        for (const listener of selectionListeners) {
          listener(selectionState);
        }
      },
      setScope(agentId: string | null) {
        selectionState = { ...selectionState, scopeId: agentId };
        for (const listener of selectionListeners) {
          listener(selectionState);
        }
      },
      subscribe(listener: (state: typeof selectionState) => void) {
        selectionListeners.add(listener);
        return () => selectionListeners.delete(listener);
      },
    },
    navigate: vi.fn(),
    replace: vi.fn(),
    preload: vi.fn(async () => undefined),
  } as unknown as ApplicationContext;
}

function createPage(
  context: ApplicationContext,
  options: { render?: boolean; routeData?: CronRouteData } = {},
): CronTestPage {
  const page = document.createElement("openclaw-cron-page") as CronTestPage;
  page.context = context;
  page.routeData = options.routeData;
  if (!options.render) {
    page.render = () => nothing;
  }
  document.body.append(page);
  return page;
}

function cronListResponse(jobs: CronJob[]): CronJobsListResult {
  return {
    jobs: jobs.map((job) => ({
      configRevision: job.configRevision ?? `config-revision-${job.id}`,
      ...job,
    })),
    snapshotRevision: "cron-page-fixture",
    total: jobs.length,
    offset: 0,
    limit: 50,
    hasMore: false,
    nextOffset: null,
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("CronPage route synchronization", () => {
  it("loads the exact routed job outside the current list and preserves the runs tab", async () => {
    const job: CronJob = {
      id: "routed.job",
      name: "Routed nightly digest",
      enabled: true,
      createdAtMs: 0,
      updatedAtMs: 0,
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "digest" },
      state: {},
    };
    const request = vi.fn(async (method: string) => {
      if (method === "cron.get") {
        return job;
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: 1, triggersEnabled: true };
      }
      if (method === "cron.list") {
        return cronListResponse([]);
      }
      if (method === "cron.runs") {
        return { entries: [], total: 0, offset: 0, hasMore: false };
      }
      if (method === "models.list") {
        return { models: [] };
      }
      return {};
    });
    const context = createContext(
      createGateway({ request } as unknown as GatewayBrowserClient, true),
    );
    const page = createPage(context, {
      render: true,
      routeData: { kind: "job", jobId: job.id, detailTab: "history" },
    });

    await waitForCronPage(() => expect(page.cron.cronEditingJobId).toBe(job.id));
    expect(request).toHaveBeenCalledWith("cron.get", { id: job.id });
    expect(request).toHaveBeenCalledWith("cron.runs", expect.objectContaining({ id: job.id }));
    expect(
      page.querySelector('[data-test-id="cron-detail-tab-history"]')?.getAttribute("active"),
    ).not.toBeNull();
    expect(page.textContent).toContain(job.name);
  });

  it("retries routed run history after a gateway cron event", async () => {
    const job: CronJob = {
      id: "routed.retry",
      name: "Routed retry",
      enabled: true,
      createdAtMs: 0,
      updatedAtMs: 0,
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "retry" },
      state: {},
    };
    let runsAttempts = 0;
    const request = vi.fn(async (method: string) => {
      if (method === "cron.get") {
        return job;
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: 1, triggersEnabled: true };
      }
      if (method === "cron.list") {
        return cronListResponse([]);
      }
      if (method === "cron.runs") {
        runsAttempts += 1;
        if (runsAttempts === 1) {
          throw new Error("run history temporarily unavailable");
        }
        return { entries: [], total: 0, offset: 0, hasMore: false };
      }
      if (method === "models.list") {
        return { models: [] };
      }
      return {};
    });
    const gateway = createGateway({ request } as unknown as GatewayBrowserClient, true);
    const page = createPage(createContext(gateway), {
      routeData: { kind: "job", jobId: job.id, detailTab: "history" },
    });

    await waitForCronPage(() =>
      expect(page.cron.cronError).toBe("run history temporarily unavailable"),
    );
    gateway.emitRetiredEvent({ event: "cron" } as never);

    await waitForCronPage(() => expect(runsAttempts).toBe(2));
  });

  it("shows not found when a routed job is removed before a gateway cron event", async () => {
    const job: CronJob = {
      id: "routed.removed",
      name: "Removed elsewhere",
      enabled: true,
      createdAtMs: 0,
      updatedAtMs: 0,
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "removed" },
      state: {},
    };
    let removed = false;
    let getAttempts = 0;
    const request = vi.fn(async (method: string) => {
      if (method === "cron.get") {
        getAttempts += 1;
        if (removed) {
          throw Object.assign(new Error("cron job not found"), {
            details: { code: "CRON_JOB_NOT_FOUND", jobId: job.id },
          });
        }
        return job;
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: removed ? 0 : 1, triggersEnabled: true };
      }
      if (method === "cron.list") {
        return cronListResponse([]);
      }
      if (method === "cron.runs") {
        return { entries: [], total: 0, offset: 0, hasMore: false };
      }
      if (method === "models.list") {
        return { models: [] };
      }
      return {};
    });
    const gateway = createGateway({ request } as unknown as GatewayBrowserClient, true);
    const page = createPage(createContext(gateway), {
      render: true,
      routeData: { kind: "job", jobId: job.id, detailTab: "settings" },
    });

    await waitForCronPage(() => expect(page.cron.cronEditingJobId).toBe(job.id));
    removed = true;
    gateway.emitRetiredEvent({ event: "cron" } as never);

    await waitForCronPage(() => expect(page.textContent).toContain("Automation not found"));
    expect(getAttempts).toBe(2);
  });

  it("preserves unsaved routed-job edits across gateway cron events", async () => {
    const job: CronJob = {
      id: "routed.dirty",
      name: "Gateway name",
      enabled: true,
      createdAtMs: 0,
      updatedAtMs: 0,
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "dirty" },
      state: {},
    };
    let getAttempts = 0;
    const request = vi.fn(async (method: string) => {
      if (method === "cron.get") {
        getAttempts += 1;
        if (getAttempts === 3) {
          throw new Error("temporary refresh failure");
        }
        return getAttempts === 1 ? job : { ...job, name: "New Gateway name", updatedAtMs: 1 };
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: 1, triggersEnabled: true };
      }
      if (method === "cron.list") {
        return cronListResponse([]);
      }
      if (method === "cron.runs") {
        return { entries: [], total: 0, offset: 0, hasMore: false };
      }
      if (method === "models.list") {
        return { models: [] };
      }
      return {};
    });
    const gateway = createGateway({ request } as unknown as GatewayBrowserClient, true);
    const page = createPage(createContext(gateway), {
      render: true,
      routeData: { kind: "job", jobId: job.id, detailTab: "settings" },
    });

    await waitForCronPage(() => expect(page.cron.cronEditingJobId).toBe(job.id));
    const name = page.querySelector("#cron-name") as HTMLInputElement;
    name.value = "My unsaved name";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    await waitForCronPage(() => expect(page.cron.cronForm.name).toBe("My unsaved name"));
    gateway.emitRetiredEvent({ event: "cron" } as never);

    await waitForCronPage(() => expect(getAttempts).toBe(2));
    expect(page.cron.cronForm.name).toBe("My unsaved name");
    gateway.emitRetiredEvent({ event: "cron" } as never);
    await waitForCronPage(() => expect(getAttempts).toBe(3));
    expect(page.cron.cronForm.name).toBe("My unsaved name");
  });

  it("pushes a canonical job URL on selection and returns to the list on Back", async () => {
    const job: CronJob = {
      id: "selected.job",
      name: "Selected digest",
      enabled: true,
      createdAtMs: 0,
      updatedAtMs: 0,
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "digest" },
      state: {},
    };
    const request = vi.fn(async (method: string) => {
      if (method === "cron.list") {
        return cronListResponse([job]);
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: 1, triggersEnabled: true };
      }
      if (method === "cron.runs") {
        return { entries: [], total: 0, offset: 0, hasMore: false };
      }
      if (method === "models.list") {
        return { models: [] };
      }
      return {};
    });
    const context = createContext(
      createGateway({ request } as unknown as GatewayBrowserClient, true),
    );
    const page = createPage(context, { render: true });

    await waitForCronPage(() =>
      expect(page.querySelector('[data-test-id="cron-row-selected.job"]')).not.toBeNull(),
    );
    (page.querySelector('[data-test-id="cron-row-selected.job"]') as HTMLElement).click();
    await waitForCronPage(() => expect(page.cron.cronEditingJobId).toBe(job.id));
    expect(context.navigate).toHaveBeenLastCalledWith("cron", {
      pathname: "/automations/selected%2Ejob",
    });

    (page.querySelector('[data-test-id="cron-back"]') as HTMLButtonElement).click();
    expect(context.navigate).toHaveBeenLastCalledWith("cron", { pathname: "/automations" });
  });

  it("renders a visible recovery link when the routed job no longer exists", async () => {
    const request = vi.fn(async (method: string) => {
      if (method === "cron.get") {
        throw Object.assign(new Error("cron job not found"), {
          details: { code: "CRON_JOB_NOT_FOUND", jobId: "missing.job" },
        });
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: 0, triggersEnabled: true };
      }
      if (method === "cron.list") {
        return cronListResponse([]);
      }
      if (method === "cron.runs") {
        return { entries: [], total: 0, offset: 0, hasMore: false };
      }
      if (method === "models.list") {
        return { models: [] };
      }
      return {};
    });
    const context = createContext(
      createGateway({ request } as unknown as GatewayBrowserClient, true),
    );
    const page = createPage(context, {
      render: true,
      routeData: { kind: "job", jobId: "missing.job", detailTab: "settings" },
    });

    await waitForCronPage(() => expect(page.textContent).toContain("Automation not found"));
    const link = page.querySelector<HTMLAnchorElement>('[data-test-id="cron-not-found-back"]');
    expect(link?.getAttribute("href")).toBe("/automations");
    expect(link?.textContent).toContain("All automations");
  });
});
