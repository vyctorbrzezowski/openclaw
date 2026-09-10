/* @vitest-environment jsdom */

import { expectDefined } from "@openclaw/normalization-core";
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CostDailyEntry, UsageAggregates, UsageSessionEntry, UsageTotals } from "./types.ts";
import { renderUsageHeatmap } from "./view-heatmap.ts";
import { renderUsageHero } from "./view-hero.ts";
import {
  renderCostBreakdownCompact,
  renderCostWindowComparison,
  renderFilterChips,
  renderSessionsCard,
} from "./view-overview.ts";
import { renderUsageOperations } from "./view-summary.ts";

const totals: UsageTotals = {
  input: 100,
  output: 40,
  cacheRead: 300,
  cacheWrite: 600,
  totalTokens: 1040,
  totalCost: 0,
  inputCost: 0,
  outputCost: 0,
  cacheReadCost: 0,
  cacheWriteCost: 0,
  missingCostEntries: 0,
};

const aggregates = {
  messages: {
    total: 4,
    user: 2,
    assistant: 2,
    toolCalls: 0,
    toolResults: 0,
    errors: 0,
  },
  tools: {
    totalCalls: 0,
    uniqueTools: 0,
    tools: [],
  },
  byModel: [],
  byProvider: [],
  byAgent: [],
  byChannel: [],
  daily: [],
} as unknown as UsageAggregates;

function dailyEntry(date: string, totalTokens: number, totalCost = 0): CostDailyEntry {
  return {
    ...totals,
    date,
    input: totalTokens,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens,
    totalCost,
  };
}

function heroTemplate(overrides: Partial<Parameters<typeof renderUsageHero>[0]> = {}) {
  return renderUsageHero({
    totals,
    aggregates,
    daily: [],
    selectedDays: [],
    chartMode: "tokens",
    dailyChartMode: "total",
    sessions: [],
    timeZone: "utc",
    onDailyChartModeChange: () => {},
    onChartModeChange: () => {},
    onSelectDay: () => {},
    ...overrides,
  });
}

function renderDailyChart(
  daily: CostDailyEntry[],
  onSelectDay = vi.fn<(day: string, shiftKey: boolean) => void>(),
) {
  const container = document.createElement("div");
  document.body.append(container);
  render(heroTemplate({ daily, onSelectDay }), container);
  return {
    container,
    onSelectDay,
    days: Array.from(container.querySelectorAll<HTMLButtonElement>(".usage-hero-day")),
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function getOperationalRows(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".usage-operation-row")).map((row) => ({
    title: row.querySelector("dt")?.textContent?.trim(),
    value: row.querySelector("dd")?.textContent?.trim(),
    sub: row.querySelector("small")?.textContent?.trim(),
  }));
}

describe("usage overview", () => {
  it("makes metric definitions available on focusable metric rows", () => {
    const container = document.createElement("div");
    render(
      renderUsageOperations(
        totals,
        aggregates,
        {
          durationCount: 0,
          avgDurationMs: 0,
          errorRate: 0,
        },
        false,
        1,
      ),
      container,
    );
    const messages = expectDefined(
      [...container.querySelectorAll<HTMLElement>(".usage-operation-row")].find(
        (row) => row.querySelector("dt")?.textContent === "Messages",
      ),
      "messages metric",
    );
    expect(messages.tabIndex).toBe(0);
    expect(
      (messages.closest("openclaw-tooltip") as HTMLElement & { content: string }).content,
    ).toContain("Total user and assistant messages in range.");
  });

  it("includes cache writes in cache-hit-rate denominator", () => {
    const container = document.createElement("div");

    render(
      renderUsageOperations(
        totals,
        aggregates,
        {
          durationCount: 0,
          avgDurationMs: 0,
          errorRate: 0,
        },
        false,
        1,
      ),
      container,
    );

    expect(getOperationalRows(container).filter((card) => card.title === "Cache hit rate")).toEqual(
      [
        {
          title: "Cache hit rate",
          value: "30.0%",
          sub: "300 cached · 1.0K prompt",
        },
      ],
    );
  });

  it("shows provider cost share when cost data is available", () => {
    const container = document.createElement("div");
    const costTotals = { ...totals, totalCost: 10 };
    const costAggregates = {
      ...aggregates,
      byProvider: [
        {
          provider: "openai",
          count: 3,
          totals: { ...totals, totalCost: 7, totalTokens: 700 },
        },
      ],
    } as UsageAggregates;

    render(
      heroTemplate({ totals: costTotals, aggregates: costAggregates, chartMode: "cost" }),
      container,
    );

    const providerCard = container.querySelector(".usage-hero-provider");
    expect(providerCard?.querySelector(".usage-hero-provider-line")?.textContent).toContain(
      "70.0%",
    );
  });

  it("omits cost shares when category totals are not day-scoped", () => {
    const container = document.createElement("div");
    const costTotals = { ...totals, totalCost: 1 };
    const costAggregates = {
      ...aggregates,
      byProvider: [
        {
          provider: "openai",
          count: 3,
          totals: { ...totals, totalCost: 10, totalTokens: 700 },
        },
      ],
    } as UsageAggregates;

    render(
      heroTemplate({
        totals: costTotals,
        aggregates: costAggregates,
        daily: [dailyEntry("2026-05-04", 700, 1)],
        selectedDays: ["2026-05-04"],
      }),
      container,
    );

    expect(container.querySelector(".usage-hero-providers")?.textContent).not.toContain("OpenAI");
    expect(container.querySelector(".usage-hero-providers")?.textContent).toContain("Unattributed");
  });
});

describe("renderUsageHeatmap", () => {
  it("renders the selected activity range from usage cost data", () => {
    const container = document.createElement("div");
    render(
      renderUsageHeatmap(
        [dailyEntry("2026-07-08", 10), dailyEntry("2026-07-09", 20)],
        "2025-07-11",
        "2026-07-09",
      ),
      container,
    );

    expect(container.querySelector(".usage-pattern-header h3")?.textContent?.trim()).toBe(
      "Token activity",
    );
    expect(container.querySelectorAll(".usage-heatmap__cell")).toHaveLength(52 * 7);
    expect(
      container
        .querySelector(".usage-heatmap__svg .usage-heatmap__cell--l4")
        ?.getAttribute("data-tooltip"),
    ).toContain("20 tokens");
  });

  it("keeps short ranges at their natural cell width", () => {
    const container = document.createElement("div");
    render(
      renderUsageHeatmap([dailyEntry("2026-08-01", 20)], "2026-08-01", "2026-08-01"),
      container,
    );

    expect(
      container
        .querySelector<SVGElement>(".usage-heatmap__svg")
        ?.style.getPropertyValue("--usage-heatmap-width"),
    ).toBe("74px");
  });
});

describe("usage overview presentation owners", () => {
  it.each(["tokens", "cost"] as const)("preserves ordered %s breakdown categories", (mode) => {
    const container = document.createElement("div");
    render(
      renderCostBreakdownCompact({
        values: {
          ...totals,
          outputCost: 0.2,
          inputCost: 0.1,
          cacheWriteCost: 0.3,
          cacheReadCost: 0.4,
        },
        mode,
        total: mode === "tokens" ? totals.totalTokens : 1,
        variant: "overview",
      }),
      container,
    );

    const categories = [
      "usage-token-output",
      "usage-token-input",
      "usage-token-cache-write",
      "usage-token-cache-read",
    ];
    expect(
      [...container.querySelectorAll(".cost-breakdown-bar .cost-segment")].map((segment) =>
        categories.find((category) => segment.classList.contains(category)),
      ),
    ).toEqual(categories);
    expect(
      [...container.querySelectorAll(".cost-breakdown-legend .usage-composition-metric")].map(
        (entry) =>
          `${entry.querySelector(".usage-composition-label")?.textContent?.trim()} ${entry.querySelector(".usage-composition-value")?.textContent?.trim()}`,
      ),
    ).toEqual(
      mode === "tokens"
        ? ["Output 40", "Input 100", "Cache write 600", "Cache read 300"]
        : ["Output $0.20", "Input $0.10", "Cache write $0.30", "Cache read $0.40"],
    );
  });

  it("preserves filter-chip order, session-only title, labels, and clear callbacks", () => {
    const container = document.createElement("div");
    const onClearDays = vi.fn();
    const onClearHours = vi.fn();
    const onClearSessions = vi.fn();
    render(
      renderFilterChips({
        data: {
          sessions: [{ key: "agent:main:usage", label: "Usage thread" } as UsageSessionEntry],
        },
        filters: {
          selectedDays: ["2026-08-01"],
          selectedHours: [8],
          selectedSessions: ["agent:main:usage"],
          agentId: null,
        },
        callbacks: {
          filters: {
            onClearDays,
            onClearHours,
            onClearSessions,
            onClearFilters: vi.fn(),
            onAgentChange: vi.fn(),
          },
        },
      }),
      container,
    );

    const chips = [...container.querySelectorAll<HTMLElement>(".filter-chip")];
    expect(chips.map((chip) => chip.querySelector("button")?.getAttribute("aria-label"))).toEqual([
      "Remove days filter",
      "Remove hours filter",
      "Remove session filter",
    ]);
    expect(chips.map((chip) => chip.getAttribute("title"))).toEqual([null, null, "Usage thread"]);
    chips.forEach((chip) => chip.querySelector<HTMLButtonElement>("button")?.click());
    expect(onClearDays).toHaveBeenCalledOnce();
    expect(onClearHours).toHaveBeenCalledOnce();
    expect(onClearSessions).toHaveBeenCalledOnce();
  });
});

describe("renderUsageHero daily chart", () => {
  it("keeps day selection operable with mouse and keyboard", () => {
    const { days, onSelectDay } = renderDailyChart([dailyEntry("2026-05-04", 500, 0.2)]);
    const bar = expectDefined(days[0], "daily usage point");

    bar.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    expect(onSelectDay).toHaveBeenCalledWith("2026-05-04", true);

    bar.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect(onSelectDay).toHaveBeenCalledWith("2026-05-04", false);

    const space = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: " ",
      shiftKey: true,
    });
    bar.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true);
    expect(onSelectDay).toHaveBeenCalledWith("2026-05-04", true);
  });

  it("labels the chart scale with the selected metric", () => {
    const container = document.createElement("div");
    render(
      heroTemplate({
        daily: [dailyEntry("2026-05-03", 500, 1), dailyEntry("2026-05-04", 1_000, 2)],
        chartMode: "cost",
        dailyChartMode: "total",
      }),
      container,
    );

    expect(
      Array.from(container.querySelectorAll(".usage-hero-y-axis span")).map(
        (entry) => entry.textContent,
      ),
    ).toEqual(["$2", "$1", "$0"]);
    expect(container.textContent).not.toContain("Square-root scale keeps low-usage days visible.");
  });

  it("labels the true midpoint of a compressed chart scale", () => {
    const container = document.createElement("div");
    render(
      heroTemplate({
        daily: [dailyEntry("2026-05-03", 500, 1), dailyEntry("2026-05-04", 1_000, 100)],
        chartMode: "cost",
        dailyChartMode: "total",
      }),
      container,
    );

    expect(
      Array.from(container.querySelectorAll(".usage-hero-y-axis span")).map((entry) =>
        entry.textContent?.trim(),
      ),
    ).toEqual(["$100", "$25", "$0"]);
    expect(container.textContent).toContain("Square-root scale keeps low-usage days visible.");
  });

  it("preserves sub-cent values in chart scale labels", () => {
    const container = document.createElement("div");
    render(
      heroTemplate({
        daily: [dailyEntry("2026-05-03", 500, 0.004), dailyEntry("2026-05-04", 1_000, 0.008)],
        chartMode: "cost",
        dailyChartMode: "total",
      }),
      container,
    );

    expect(
      Array.from(container.querySelectorAll(".usage-hero-y-axis span")).map((entry) =>
        entry.textContent?.trim(),
      ),
    ).toEqual(["$0.01", "$0.005", "$0"]);
  });

  it("normalizes a nonzero micro-cost area to the labeled maximum", () => {
    const container = document.createElement("div");
    const microCostDay = {
      ...dailyEntry("2026-05-04", 1_000, 0.00001),
      inputCost: 0.000004,
      outputCost: 0.000006,
    };
    render(
      heroTemplate({
        daily: [microCostDay],
        chartMode: "cost",
        dailyChartMode: "by-type",
      }),
      container,
    );

    expect(
      Array.from(container.querySelectorAll(".usage-hero-y-axis span")).map((entry) =>
        entry.textContent?.trim(),
      ),
    ).toEqual(["$0.00001", "$0.000005", "$0"]);
    const plot = expectDefined(container.querySelector(".usage-hero-canvas svg"), "daily plot");
    expect(
      [...plot.querySelectorAll('path[fill="none"]')].map((path) => path.getAttribute("d")),
    ).toContain("M0,0H800");
    const day = expectDefined(container.querySelector(".usage-hero-day"), "daily point");
    expect(day.getAttribute("aria-label")).toContain("$0.000010");
    expect(day.getAttribute("aria-label")).toContain("Output: 0 Tokens · $0.000006");
    expect(day.getAttribute("aria-label")).toContain("Input: 1.0K Tokens · $0.000004");
    expect(container.textContent).not.toContain("Square-root scale keeps low-usage days visible.");
  });
});

describe("renderCostWindowComparison", () => {
  it("shows the selected range and shorter calendar periods", () => {
    const container = document.createElement("div");
    render(
      renderCostWindowComparison(
        [
          dailyEntry("2026-06-01", 100, 1),
          dailyEntry("2026-06-25", 400, 4),
          dailyEntry("2026-07-01", 500, 5),
        ],
        "2026-06-01",
        "2026-07-01",
      ),
      container,
    );

    const cards = Array.from(container.querySelectorAll(".usage-cost-windows > div")).map(
      (card) => ({
        label: card.querySelector("dt")?.textContent?.trim(),
        value: Array.from(card.querySelector("dd")?.childNodes ?? [])
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join("")
          .trim(),
      }),
    );
    expect(cards).toEqual([
      { label: "Selected range", value: "$10.00" },
      { label: "Jul 1", value: "$5.00" },
      { label: "Last 7 days", value: "$9.00" },
      { label: "Last 30 days", value: "$9.00" },
    ]);
  });

  it("preserves sub-cent totals and daily averages", () => {
    const container = document.createElement("div");
    render(
      renderCostWindowComparison(
        [dailyEntry("2026-07-01", 300, 0.003)],
        "2026-06-02",
        "2026-07-01",
      ),
      container,
    );

    const range = container.querySelector(".usage-cost-windows > div");
    expect(
      Array.from(range?.querySelector("dd")?.childNodes ?? [])
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("")
        .trim(),
    ).toBe("$0.0030");
    expect(range?.querySelector(".usage-cost-window-context")?.textContent).toContain(
      "$0.0001 / day",
    );
  });
});

describe("renderSessionsCard", () => {
  const noop = () => {};
  const renderCard = (
    sessions: UsageSessionEntry[],
    options: {
      selected?: string[];
      days?: string[];
      tokens?: boolean;
      sort?: Parameters<typeof renderSessionsCard>[4];
      direction?: Parameters<typeof renderSessionsCard>[5];
      recent?: string[];
      tab?: Parameters<typeof renderSessionsCard>[7];
      onSelect?: Parameters<typeof renderSessionsCard>[8];
      totalSessions?: number;
    } = {},
  ) => {
    const container = document.createElement("div");
    render(
      renderSessionsCard(
        sessions,
        options.selected ?? [],
        options.days ?? [],
        options.tokens ?? true,
        options.sort ?? "tokens",
        options.direction ?? "desc",
        options.recent ?? [],
        options.tab ?? "all",
        options.onSelect ?? noop,
        noop,
        noop,
        noop,
        [],
        options.totalSessions ?? sessions.length,
        noop,
      ),
      container,
    );
    return container;
  };

  const shownCountCases: Array<{
    name: string;
    sessionCount: number;
    options?: Parameters<typeof renderCard>[1];
    shown: number;
    header: string;
    empty?: string;
    primaryLabels?: string[];
    selectedLabel?: string;
  }> = [
    {
      name: "empty All list",
      sessionCount: 0,
      shown: 0,
      header: "0 shown",
      empty: "No sessions in range",
    },
    {
      name: "All list below the display cap",
      sessionCount: 3,
      shown: 3,
      header: "3 shown",
    },
    {
      name: "All list above the display cap",
      sessionCount: 51,
      shown: 50,
      header: "50 shown · 51 total",
    },
    {
      name: "empty Recently viewed list",
      sessionCount: 3,
      options: { tab: "recent" },
      shown: 0,
      header: "0 shown · 3 total",
      empty: "No recent sessions",
    },
    {
      name: "Recently viewed list with a separate selected comparison",
      sessionCount: 3,
      options: {
        tab: "recent",
        recent: ["session-2", "missing", "session-0"],
        selected: ["session-0", "session-1"],
      },
      shown: 2,
      header: "2 shown · 3 total",
      primaryLabels: ["Session 2", "Session 0"],
      selectedLabel: "Selected (2)",
    },
    {
      name: "Recently viewed list whose keys no longer match",
      sessionCount: 3,
      options: { tab: "recent", recent: ["missing"] },
      shown: 0,
      header: "0 shown · 3 total",
      empty: "No recent sessions",
    },
    {
      name: "filtered All list with its original total",
      sessionCount: 3,
      options: { totalSessions: 7 },
      shown: 3,
      header: "3 shown · 7 total",
    },
    {
      name: "filtered Recently viewed list with its original total",
      sessionCount: 3,
      options: { tab: "recent", recent: ["session-1", "missing"], totalSessions: 7 },
      shown: 1,
      header: "1 shown · 7 total",
      primaryLabels: ["Session 1"],
    },
  ];

  it.each(shownCountCases)("reports the rows shown in the $name", (scenario) => {
    const sessions: UsageSessionEntry[] = Array.from(
      { length: scenario.sessionCount },
      (_, index) => ({
        key: `session-${index}`,
        label: `Session ${index}`,
        usage: {
          ...totals,
          input: 100 - index,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 100 - index,
        },
      }),
    );
    const container = renderCard(sessions, scenario.options);
    const primaryList = container.querySelector(".usage-session-table");
    expect(primaryList?.querySelectorAll(".usage-session-row").length ?? 0).toBe(scenario.shown);
    expect(
      container.querySelector(".usage-sessions-summary")?.textContent?.replace(/\s+/g, " ").trim(),
    ).toContain(scenario.header);
    expect(container.querySelector(".usage-empty-block")?.textContent?.trim()).toBe(scenario.empty);
    expect(container.querySelector(".usage-session-selection > span")?.textContent?.trim()).toBe(
      scenario.selectedLabel,
    );
    if (scenario.primaryLabels) {
      expect(
        [...(primaryList?.querySelectorAll(".usage-session-open") ?? [])].map((label) =>
          label.textContent?.trim(),
        ),
      ).toEqual(scenario.primaryLabels);
    }
  });

  it.each([
    { copied: true, feedback: "Copied!" },
    { copied: false, feedback: "Copy failed" },
  ])("keeps session selection separate while showing $feedback", async ({ copied, feedback }) => {
    const writeText = vi.fn(async () => {
      if (!copied) {
        throw new Error("Clipboard access denied");
      }
    });
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const container = document.createElement("div");
    document.body.append(container);
    const onSelectSession = vi.fn<(key: string, shiftKey: boolean) => void>();
    const sessions = [
      {
        key: "agent:main:selected",
        label: "Selected thread",
        updatedAt: 2,
        usage: { ...totals, totalTokens: 200 },
      },
      {
        key: "agent:main:next",
        label: "Next thread",
        updatedAt: 1,
        usage: { ...totals, totalTokens: 100 },
      },
    ] as UsageSessionEntry[];

    render(
      renderSessionsCard(
        sessions,
        ["agent:main:selected"],
        [],
        true,
        "tokens",
        "desc",
        [],
        "all",
        onSelectSession,
        noop,
        noop,
        noop,
        [],
        sessions.length,
        noop,
      ),
      container,
    );

    const rows = [...container.querySelectorAll<HTMLElement>(".usage-session-row")];
    const selected = rows[0]?.querySelector<HTMLButtonElement>(".usage-session-open");
    const next = rows[1]?.querySelector<HTMLButtonElement>(".usage-session-open");
    expect(selected).toBeInstanceOf(HTMLButtonElement);
    expect(selected?.type).toBe("button");
    expect(selected?.textContent?.trim()).toBe("Selected thread");
    expect(rows[0]?.getAttribute("aria-selected")).toBe("true");
    expect(next?.textContent?.trim()).toBe("Next thread");
    expect(rows[1]?.getAttribute("aria-selected")).toBe("false");
    next?.focus();
    expect(document.activeElement).toBe(next);
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    expect(onSelectSession).toHaveBeenCalledOnce();
    expect(onSelectSession).toHaveBeenCalledWith(
      "agent:main:next",
      true,
      sessions.map((s) => s.key),
    );

    const copyButton = rows[0]?.querySelector<HTMLButtonElement>(".usage-session-copy button");
    copyButton?.click();
    await vi.waitFor(() => {
      expect(copyButton?.textContent?.trim()).toBe(feedback);
      expect(copyButton?.getAttribute("aria-label")).toBeNull();
    });
    expect(writeText).toHaveBeenCalledWith("Selected thread");
    expect(onSelectSession).toHaveBeenCalledOnce();
    rows[0]?.querySelector<HTMLElement>("td:last-child .usage-session-number")?.click();
    expect(onSelectSession).toHaveBeenCalledWith(
      "agent:main:selected",
      false,
      sessions.map((s) => s.key),
    );
  });

  it.each([
    {
      tokens: true,
      sort: "tokens",
      names: ["All time winner", "Day winner"],
      values: ["30", "10"],
      avg: "20",
    },
    {
      tokens: true,
      sort: "cost",
      names: ["Day winner", "All time winner"],
      values: ["10", "30"],
      avg: "20",
    },
    {
      tokens: false,
      sort: "tokens",
      names: ["All time winner", "Day winner"],
      values: ["$1.00", "$10.00"],
      avg: "$5.50",
    },
    {
      tokens: false,
      sort: "cost",
      names: ["Day winner", "All time winner"],
      values: ["$10.00", "$1.00"],
      avg: "$5.50",
    },
  ] as const)("uses selected-day display and sort metrics independently (%j)", (scenario) => {
    const sessions: UsageSessionEntry[] = [
      {
        key: "all-time-winner",
        label: "All time winner",
        updatedAt: 2,
        usage: {
          ...totals,
          totalCost: 100,
          totalTokens: 100,
          dailyBreakdown: [
            { ...totals, date: "2026-02-05", cost: 1, tokens: 30 },
            { ...totals, date: "2026-02-04", cost: 90, tokens: 900 },
          ],
        },
      } as UsageSessionEntry,
      {
        key: "day-winner",
        label: "Day winner",
        updatedAt: 1,
        usage: {
          ...totals,
          totalCost: 50,
          totalTokens: 50,
          dailyBreakdown: [{ ...totals, date: "2026-02-05", cost: 10, tokens: 10 }],
        },
      } as UsageSessionEntry,
    ];

    const container = renderCard(sessions, { ...scenario, days: ["2026-02-05"] });
    expect(
      [...container.querySelectorAll(".usage-session-open")].map((el) => el.textContent?.trim()),
    ).toEqual(scenario.names);
    expect(
      [...container.querySelectorAll("td:last-child .usage-session-number")].map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(scenario.values);
    expect(
      container.querySelector(".usage-sessions-summary")?.textContent?.replace(/\s+/g, " ").trim(),
    ).toContain(`${scenario.avg} avg`);
  });

  it("reads each daily bucket once across sorting, totals, recent and selected rows", () => {
    const reads = { dates: 0, tokens: 0, cost: 0 };
    const sessions = Array.from(
      { length: 3 },
      (_, index): UsageSessionEntry => ({
        key: `session-${index}`,
        label: `Session ${index}`,
        usage: {
          ...totals,
          totalTokens: (index + 1) * 100,
          dailyBreakdown: ["2026-02-04", "2026-02-05"].map((date) =>
            Object.assign(
              {
                get date() {
                  reads.dates += 1;
                  return date;
                },
                get tokens() {
                  reads.tokens += 1;
                  return (index + 1) * 10;
                },
                get cost() {
                  reads.cost += 1;
                  return 3 - index;
                },
              },
              totals,
            ),
          ),
        },
      }),
    );
    const container = renderCard(sessions, {
      days: ["2026-02-05"],
      sort: "cost",
      selected: ["session-0", "session-2"],
      recent: ["session-2", "session-0"],
      tab: "recent",
    });
    expect(
      [...container.querySelectorAll(".usage-session-open")].map((el) => el.textContent?.trim()),
    ).toEqual(["Session 2", "Session 0"]);
    expect(
      [...container.querySelectorAll("td:last-child .usage-session-number")].map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(["30", "10"]);
    expect(
      container.querySelector(".usage-sessions-summary")?.textContent?.replace(/\s+/g, " ").trim(),
    ).toContain("20 avg");
    expect(reads.dates).toBeLessThanOrEqual(6);
    expect(reads.tokens).toBeLessThanOrEqual(3);
    expect(reads.cost).toBeLessThanOrEqual(3);
  });

  it.each([true, false])(
    "preserves missing, empty, unmatched and zero daily values (tokens=%s)",
    (tokens) => {
      const sessions: UsageSessionEntry[] = [
        { key: "missing-usage", usage: null },
        { key: "missing-breakdown", usage: { ...totals, totalTokens: 10, totalCost: 1 } },
        {
          key: "empty-breakdown",
          usage: { ...totals, totalTokens: 20, totalCost: 2, dailyBreakdown: [] },
        },
        {
          key: "unmatched",
          usage: {
            ...totals,
            totalTokens: 900,
            totalCost: 90,
            dailyBreakdown: [{ ...totals, date: "2026-02-04", tokens: 300, cost: 30 }],
          },
        },
        {
          key: "zero",
          usage: {
            ...totals,
            totalTokens: 500,
            totalCost: 50,
            dailyBreakdown: [{ ...totals, date: "2026-02-05", tokens: 0, cost: 0 }],
          },
        },
        {
          key: "duplicate-days",
          usage: {
            ...totals,
            totalTokens: 60,
            totalCost: 6,
            dailyBreakdown: [
              { ...totals, date: "2026-02-05", tokens: 2, cost: 0.2 },
              { ...totals, date: "2026-02-05", tokens: 3, cost: 0.3 },
            ],
          },
        },
      ];
      const values = (container: HTMLElement) =>
        Object.fromEntries(
          [...container.querySelectorAll(".usage-session-row")].map((row) => [
            row.getAttribute("title"),
            row.querySelector("td:last-child .usage-session-number")?.textContent?.trim(),
          ]),
        );
      const formatted = (amounts: number[]) =>
        Object.fromEntries(
          sessions.map((session, index) => [
            session.key,
            index === 0 ? "—" : tokens ? String(amounts[index]) : `$${amounts[index]!.toFixed(2)}`,
          ]),
        );
      expect(values(renderCard(sessions, { tokens, days: ["2026-02-05", "2026-02-05"] }))).toEqual(
        formatted(tokens ? [0, 10, 20, 0, 0, 5] : [0, 1, 2, 0, 0, 0.5]),
      );
      expect(values(renderCard(sessions, { tokens }))).toEqual(
        formatted(tokens ? [0, 10, 20, 900, 500, 60] : [0, 1, 2, 90, 50, 6]),
      );
    },
  );

  it.each(["desc", "asc"] as const)(
    "preserves ties, duplicate keys and each selection group's %s order",
    (direction) => {
      const sessions: UsageSessionEntry[] = [
        { key: "shared", label: "Alpha", updatedAt: 1, usage: { ...totals, totalTokens: 10 } },
        { key: "shared", label: "Beta", updatedAt: 1, usage: { ...totals, totalTokens: 10 } },
        { key: "newest", label: "Newest", updatedAt: 2, usage: { ...totals, totalTokens: 10 } },
        { key: "other", label: "Other", updatedAt: 0, usage: { ...totals, totalTokens: 10 } },
      ];
      const titles = (container: Element) =>
        [...container.querySelectorAll(".usage-session-open")].map((entry) =>
          entry.textContent?.trim(),
        );
      expect(titles(renderCard(sessions, { direction }))).toEqual(
        direction === "desc"
          ? ["Newest", "Alpha", "Beta", "Other"]
          : ["Other", "Beta", "Alpha", "Newest"],
      );
      expect(sessions.map((session) => session.label)).toEqual([
        "Alpha",
        "Beta",
        "Newest",
        "Other",
      ]);
      const onSelect = vi.fn();
      const container = renderCard(sessions, {
        direction,
        tab: "recent",
        recent: ["shared", "newest", "shared"],
        selected: ["shared", "newest"],
        onSelect,
      });
      const recent = container.querySelector(".usage-session-table")!;
      const selected = container.querySelector(".usage-session-comparison-grid")!;
      expect(titles(recent)).toEqual(
        direction === "desc" ? ["Beta", "Newest", "Beta"] : ["Alpha", "Newest", "Alpha"],
      );
      expect(
        [...selected.querySelectorAll(".usage-session-comparison-item > h4")].map((el) =>
          el.textContent?.trim(),
        ),
      ).toEqual(direction === "desc" ? ["Newest", "Alpha", "Beta"] : ["Beta", "Alpha", "Newest"]);
      recent
        .querySelector(".usage-session-open")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
      expect(onSelect).toHaveBeenLastCalledWith("shared", true, ["shared", "newest", "shared"]);
      selected
        .querySelector("button")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
      expect(onSelect).toHaveBeenLastCalledWith(
        direction === "desc" ? "newest" : "shared",
        false,
        direction === "desc" ? ["newest", "shared", "shared"] : ["shared", "shared", "newest"],
      );
    },
  );
});
