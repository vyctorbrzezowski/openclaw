// Control UI tests cover usage detail behavior through the rendered panel.
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PanelRefreshStatus } from "../../components/panel-refresh-status.ts";
import type { SessionLogEntry, TimeSeriesPoint, UsageSessionEntry } from "./types.ts";
import { renderSessionDetailPanel } from "./view-details.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

function point(overrides: Partial<TimeSeriesPoint> = {}): TimeSeriesPoint {
  return {
    timestamp: 1000,
    totalTokens: 100,
    cost: 0.1,
    input: 30,
    output: 40,
    cacheRead: 20,
    cacheWrite: 10,
    cumulativeTokens: 100,
    cumulativeCost: 0.1,
    ...overrides,
  };
}

function session(): UsageSessionEntry & { usage: NonNullable<UsageSessionEntry["usage"]> } {
  return {
    key: "agent:main:detail",
    label: "Detail session",
    usage: {
      totalTokens: 1000,
      totalCost: 1,
      input: 300,
      output: 400,
      cacheRead: 200,
      cacheWrite: 100,
      inputCost: 0.3,
      outputCost: 0.4,
      cacheReadCost: 0.2,
      cacheWriteCost: 0.1,
      durationMs: 60_000,
      firstActivity: 0,
      lastActivity: 60_000,
      missingCostEntries: 0,
      messageCounts: {
        total: 10,
        user: 5,
        assistant: 5,
        toolCalls: 0,
        toolResults: 0,
        errors: 0,
      },
    },
  };
}

function mount(
  points: TimeSeriesPoint[],
  start: number | null,
  end: number | null,
  breakdownMode: "total" | "by-type" = "total",
  filters: {
    startDate?: string;
    endDate?: string;
    selectedDays?: string[];
    timeZone?: "local" | "utc";
  } = {},
  errors: {
    timeSeries?: string;
    sessionLogs?: string;
    sessionLogsData?: SessionLogEntry[] | null;
    session?: UsageSessionEntry;
    stale?: boolean;
    contextWeight?: UsageSessionEntry["contextWeight"];
    contextExpanded?: boolean;
    onToggleContextExpanded?: () => void;
  } = {},
) {
  const status = (error?: string): PanelRefreshStatus => ({
    error: error ?? null,
    hasLoaded: errors.stale ?? false,
    stale: errors.stale ?? false,
    awaitingGateway: false,
  });
  const container = document.createElement("div");
  render(
    renderSessionDetailPanel(
      { ...(errors.session ?? session()), contextWeight: errors.contextWeight },
      {
        detail: {
          open: true,
          tab: "tools-models",
          timeSeries: { points },
          timeSeriesLoading: false,
          timeSeriesStatus: status(errors.timeSeries),
          timeSeriesMode: "per-turn",
          timeSeriesBreakdownMode: breakdownMode,
          timeSeriesCursorStart: start,
          timeSeriesCursorEnd: end,
          sessionLogs: errors.sessionLogsData === undefined ? [] : errors.sessionLogsData,
          sessionLogsLoading: false,
          sessionLogsStatus: status(errors.sessionLogs),
          sessionLogsExpanded: false,
          logFilters: { roles: [], tools: [], hasTools: false, query: "" },
          context: { weight: errors.contextWeight, loading: false, status: status() },
        },
        filters: {
          startDate: filters.startDate ?? "",
          endDate: filters.endDate ?? "",
          selectedDays: filters.selectedDays ?? [],
          timeZone: filters.timeZone ?? "local",
        },
        display: { contextExpanded: errors.contextExpanded ?? false },
        callbacks: {
          details: {
            onTabChange: vi.fn(),
            onToggleSession: vi.fn(),
            onTimeSeriesModeChange: vi.fn(),
            onTimeSeriesBreakdownChange: vi.fn(),
            onTimeSeriesCursorRangeChange: vi.fn(),
            onToggleSessionLogsExpanded: vi.fn(),
            onLogFilterRolesChange: vi.fn(),
            onLogFilterToolsChange: vi.fn(),
            onLogFilterHasToolsChange: vi.fn(),
            onLogFilterQueryChange: vi.fn(),
            onLogFilterClear: vi.fn(),
            onToggleContextExpanded: errors.onToggleContextExpanded ?? vi.fn(),
          },
          filters: { onClearSessions: vi.fn() },
        },
      },
    ),
    container,
  );
  return container;
}

describe("renderSessionDetailPanel filtered usage", () => {
  it("formats timeline labels in the selected UTC time zone", () => {
    vi.spyOn(Date.prototype, "toLocaleTimeString").mockImplementation((_locales, options) =>
      options?.timeZone === "UTC" ? "utc-time" : "local-time",
    );
    vi.spyOn(Date.prototype, "toLocaleString").mockImplementation((_locales, options) =>
      options?.timeZone === "UTC" ? "utc-date-time" : "local-date-time",
    );

    const container = mount(
      [
        point({ timestamp: Date.parse("2026-05-13T18:00:00.000Z") }),
        point({ timestamp: Date.parse("2026-05-13T23:59:59.999Z") }),
      ],
      null,
      null,
      "total",
      { timeZone: "utc" },
    );

    expect(
      [...container.querySelectorAll(".ts-axis-label")].map((label) => label.textContent),
    ).toEqual(expect.arrayContaining(["utc-time", "utc-time"]));
    expect(container.querySelector(".ts-bar")?.getAttribute("data-tooltip")).toContain(
      "utc-date-time",
    );
  });

  it("filters detail points by the selected UTC day and keeps the final millisecond", () => {
    const localOffsetMs = 8 * 60 * 60 * 1000;
    const localYear = vi
      .spyOn(Date.prototype, "getFullYear")
      .mockImplementation(function (this: Date) {
        return new Date(this.getTime() + localOffsetMs).getUTCFullYear();
      });
    const localMonth = vi
      .spyOn(Date.prototype, "getMonth")
      .mockImplementation(function (this: Date) {
        return new Date(this.getTime() + localOffsetMs).getUTCMonth();
      });
    const localDay = vi.spyOn(Date.prototype, "getDate").mockImplementation(function (this: Date) {
      return new Date(this.getTime() + localOffsetMs).getUTCDate();
    });
    try {
      const points = [
        point({ timestamp: Date.parse("2026-05-13T18:00:00.000Z") }),
        point({ timestamp: Date.parse("2026-05-13T23:59:59.999Z") }),
      ];
      const filters = {
        startDate: "2026-05-13",
        endDate: "2026-05-13",
        selectedDays: ["2026-05-13"],
      };

      const utc = mount(points, null, null, "total", { ...filters, timeZone: "utc" });
      const local = mount(points, null, null, "total", { ...filters, timeZone: "local" });

      expect(utc.querySelectorAll(".ts-bar")).toHaveLength(2);
      expect(local.querySelectorAll(".ts-bar")).toHaveLength(0);
      expect(local.querySelector(".usage-empty-block")).not.toBeNull();
    } finally {
      localYear.mockRestore();
      localMonth.mockRestore();
      localDay.mockRestore();
    }
  });

  it.each<{ logs: SessionLogEntry[] | null; messages: string; messageMeta: string }>([
    {
      logs: [
        { timestamp: 1000, role: "user", content: "Question" },
        { timestamp: 1200, role: "assistant", content: "[Tool: read]" },
        { timestamp: 1400, role: "toolResult", content: "Result" },
        { timestamp: 2000, role: "assistant", content: "Answer" },
        { timestamp: 3000, role: "user", content: "Outside selection" },
      ],
      messages: "3",
      messageMeta: "1 user · 2 assistant",
    },
    { logs: [], messages: "0", messageMeta: "0 user · 0 assistant" },
    { logs: null, messages: "—", messageMeta: "" },
  ])(
    "aggregates range usage with $messages visible messages",
    ({ logs, messages, messageMeta }) => {
      const start = Date.parse("2026-08-20T12:00:00Z");
      const entry = session();
      entry.usage.messageCounts = { ...entry.usage.messageCounts!, errors: 4 };
      const container = mount(
        [
          point({
            timestamp: start + 1000,
            totalTokens: 100,
            cost: 0.1,
            input: 10,
            output: 0,
            cacheRead: 5,
            cacheWrite: 2,
          }),
          point({
            timestamp: start + 2000,
            totalTokens: 200,
            cost: 0.2,
            input: 0,
            output: 20,
            cacheRead: 7,
            cacheWrite: 3,
          }),
          point({ timestamp: start + 3000, totalTokens: 300, cost: 0.3 }),
        ],
        start + 1000,
        start + 2000,
        "by-type",
        {},
        {
          session: entry,
          sessionLogsData:
            logs?.map((log) => ({ ...log, timestamp: start + log.timestamp })) ?? null,
        },
      );

      expect(container.querySelector(".session-detail-stats")?.textContent).toContain("300");
      expect(container.querySelector(".session-detail-stats")?.textContent).toContain("$0.30");
      expect(container.querySelector(".session-detail-indicator")).not.toBeNull();
      const summary = [...container.querySelectorAll(".session-summary-card")];
      expect(summary[0]?.querySelector(".session-summary-title")?.textContent).toBe(
        "Visible messages",
      );
      expect(summary[0]?.querySelector(".session-summary-value")?.textContent?.trim()).toBe(
        messages,
      );
      expect(
        summary[0]
          ?.querySelector(".session-summary-meta")
          ?.textContent?.replaceAll(/\s+/g, " ")
          .trim(),
      ).toBe(messageMeta);
      expect(summary[2]?.querySelector(".session-summary-title")?.textContent).toBe(
        "Errors · Full session",
      );
      expect(summary[2]?.querySelector(".session-summary-value")?.textContent?.trim()).toBe("4");
      expect(container.textContent).toContain("Model mix · Full session");
      expect(container.textContent).toContain("Samples 1–2 of 3");
      expect(summary[1]?.querySelector(".session-summary-title")?.textContent).toBe(
        logs === null ? "Tool calls · Full session" : "Tool calls",
      );
      expect(summary[3]?.textContent).toContain("1s");
      expect(
        [...container.querySelectorAll(".timeseries-breakdown .legend-item")].map((item) =>
          item.textContent?.replaceAll(/\s+/g, " ").trim(),
        ),
      ).toEqual(["Output 20", "Input 10", "Cache write 5", "Cache read 12"]);
      expect(
        container.querySelector(".timeseries-breakdown .cost-breakdown-total")?.textContent,
      ).toContain("47");
    },
  );

  it.each(["tool", "toolResult"] as const)(
    "counts repeated assistant calls without counting %s results in the selected range",
    (resultRole) => {
      const start = Date.parse("2026-08-20T12:00:00Z");
      const end = start + 2000;
      const entry = session();
      entry.usage = {
        ...entry.usage,
        toolUsage: {
          totalCalls: 2,
          uniqueTools: 2,
          tools: [
            { name: "read", count: 1 },
            { name: "exec", count: 1 },
          ],
        },
      };
      const logs: SessionLogEntry[] = [
        { timestamp: start, role: "assistant", content: "[Tool: read]\n[Tool: read]" },
        {
          timestamp: start + 500,
          role: resultRole,
          content: "[Tool: read]\n[Tool Result]\nFirst file",
        },
        {
          timestamp: start + 1000,
          role: resultRole,
          content: "[Tool: read]\n[Tool Result]\nSecond file",
        },
        { timestamp: end, role: "assistant", content: "Both files reviewed." },
        { timestamp: end + 1000, role: "assistant", content: "[Tool: exec]" },
      ];
      const points = [start, end, end + 1000].map((timestamp) => point({ timestamp }));
      const data = { session: entry, sessionLogsData: logs };
      const selected = mount(points, start, end, "total", {}, data);
      expect(selected.querySelectorAll(".session-summary-value")[1]?.textContent).toBe("2");
      expect(
        selected
          .querySelectorAll(".session-summary-meta")[1]
          ?.textContent?.replaceAll(/\s+/g, " ")
          .trim(),
      ).toBe("1 tools used · 0 tool results · Full session");
      expect(selected.querySelectorAll(".session-summary-meta")[2]?.textContent?.trim()).toBe("");
      expect(
        [...selected.querySelectorAll(".usage-list-item")].map((item) => [
          item.querySelector(".usage-insight-label")?.textContent,
          item.querySelector(".usage-list-value")?.textContent?.trim(),
        ]),
      ).toEqual([
        ["read", "2 calls"],
        ["exec", "0 calls"],
      ]);
      expect(selected.querySelector(".session-log-tools-pill")?.textContent?.trim()).toBe(
        "read × 2",
      );
    },
  );

  it("accepts a reversed range and falls back to full totals when no points match", () => {
    const reversed = mount(
      [point({ timestamp: 1000, totalTokens: 50 }), point({ timestamp: 2000, totalTokens: 75 })],
      2000,
      1000,
    );
    expect(reversed.querySelector(".session-detail-stats")?.textContent).toContain("125");

    const empty = mount([point({ timestamp: 1000 })], 3000, 4000);
    expect(empty.querySelector(".session-detail-stats")?.textContent).toContain("1.0K");
    expect(empty.querySelector(".session-detail-indicator")).toBeNull();
  });

  it("never renders Invalid Date for out-of-range point timestamps", () => {
    const container = mount(
      [point({ timestamp: 8_640_000_000_000_001 }), point({ timestamp: 8_640_000_000_000_002 })],
      null,
      null,
    );
    expect(container.textContent).not.toContain("Invalid Date");
  });

  it("renders detail request failure messages without retry buttons", () => {
    const container = mount(
      [],
      null,
      null,
      "total",
      {},
      {
        timeSeries: "timeline unavailable",
        sessionLogs: "logs unavailable",
      },
    );

    const timelineError = container.querySelector<HTMLElement>(".usage-detail-error--timeline");
    const conversationError = container.querySelector<HTMLElement>(
      ".usage-detail-error--conversation",
    );
    expect(timelineError?.textContent).toContain(
      "Could not load usage over time: timeline unavailable",
    );
    expect(conversationError?.textContent).toContain(
      "Could not load conversation: logs unavailable",
    );

    expect(timelineError?.querySelector("button")).toBeNull();
    expect(conversationError?.querySelector("button")).toBeNull();
  });

  it("keeps loaded details visible and marks them stale after refresh failures", () => {
    const container = mount(
      [point({ timestamp: 1000 }), point({ timestamp: 2000 })],
      null,
      null,
      "total",
      {},
      {
        timeSeries: "timeline unavailable",
        sessionLogs: "logs unavailable",
        sessionLogsData: [{ timestamp: 1000, role: "user", content: "retained message" }],
        stale: true,
      },
    );

    expect(container.querySelectorAll(".usage-detail-error--timeline strong")).toHaveLength(1);
    expect(container.querySelectorAll(".usage-detail-error--conversation strong")).toHaveLength(1);
    expect(container.querySelector(".timeseries-svg")).not.toBeNull();
    expect(container.textContent).toContain("retained message");
    expect(container.textContent).toContain("Showing stale data");
  });

  it("preserves context-category order, sorted cards, expansion, and callbacks", () => {
    const contextWeight: NonNullable<UsageSessionEntry["contextWeight"]> = {
      source: "run",
      generatedAt: 0,
      systemPrompt: { chars: 80, projectContextChars: 20, nonProjectContextChars: 60 },
      skills: {
        promptChars: 100,
        entries: Array.from({ length: 5 }, (_, index) => ({
          name: `skill-${index}`,
          blockChars: (index + 1) * 10,
        })),
      },
      tools: {
        listChars: 20,
        schemaChars: 30,
        entries: [
          { name: "smaller-tool", summaryChars: 4, schemaChars: 6 },
          { name: "larger-tool", summaryChars: 8, schemaChars: 12 },
        ],
      },
      injectedWorkspaceFiles: [
        {
          name: "small.md",
          path: "/small.md",
          missing: false,
          rawChars: 10,
          injectedChars: 10,
          truncated: false,
        },
        {
          name: "large.md",
          path: "/large.md",
          missing: false,
          rawChars: 30,
          injectedChars: 30,
          truncated: false,
        },
        {
          name: "AGENTS.md",
          path: "/AGENTS.md",
          missing: false,
          rawChars: 100,
          injectionStatus: "native_unverified",
          injectedChars: null,
          truncated: null,
        },
      ],
    };
    const onToggleContextExpanded = vi.fn();
    const container = mount(
      [],
      null,
      null,
      "total",
      {},
      { contextWeight, onToggleContextExpanded },
    );
    const categories = ["system", "skills", "tools", "files"];

    expect(
      [...container.querySelectorAll(".context-stacked-bar .context-segment")].map((segment) =>
        categories.find((category) => segment.classList.contains(category)),
      ),
    ).toEqual(categories);
    const cards = [...container.querySelectorAll(".context-breakdown-card")];
    expect(
      cards.map((card) => card.querySelector(".context-breakdown-title")?.textContent?.trim()),
    ).toEqual(["Skills (5)", "Tools (2)", "Files (3)"]);
    expect(
      [...(cards[0]?.querySelectorAll(".context-breakdown-item .mono") ?? [])].map(
        (entry) => entry.textContent,
      ),
    ).toEqual(["skill-4", "skill-3", "skill-2", "skill-1"]);
    expect(cards[1]?.querySelector(".context-breakdown-item .mono")?.textContent).toBe(
      "larger-tool",
    );
    const fileEntries = [...(cards[2]?.querySelectorAll(".context-breakdown-item") ?? [])];
    expect(fileEntries.map((entry) => entry.querySelector(".mono")?.textContent)).toEqual([
      "large.md",
      "small.md",
      "AGENTS.md",
    ]);
    expect(fileEntries[2]?.querySelector(".muted")?.textContent).toBe("unknown");
    expect(cards[0]?.querySelector(".context-breakdown-more")?.textContent).toContain("1 more");
    container.querySelector<HTMLButtonElement>(".context-breakdown-header button")?.click();
    expect(onToggleContextExpanded).toHaveBeenCalledOnce();

    const expanded = mount([], null, null, "total", {}, { contextWeight, contextExpanded: true });
    expect(
      expanded
        .querySelectorAll(".context-breakdown-card")[0]
        ?.querySelectorAll(".context-breakdown-item"),
    ).toHaveLength(5);
    expect(expanded.querySelector(".context-breakdown-more")).toBeNull();
  });
});
