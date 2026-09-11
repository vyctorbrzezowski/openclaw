import type { SessionSystemPromptReport } from "../src/config/sessions/types.js";
import type {
  CostUsageTotals,
  SessionCostSummary,
  SessionDailyModelUsage,
  SessionMessageCounts,
  SessionLatencyStats,
  SessionModelUsage,
} from "../src/infra/session-cost-usage.types.js";
import type { SessionUsageEntry, SessionsUsageAggregates } from "../src/shared/usage-types.js";
import type { ControlUiMockGateway } from "../ui/src/test-helpers/control-ui-e2e.ts";

// This factory is also serialized into the browser mock. Keep runtime dependencies local.
export function createUsageMock(baseTime: number) {
  const models = [
    { provider: "openai", model: "gpt-4.1", weight: 1.1, price: 1.4 },
    { provider: "openai", model: "gpt-4.1-mini", weight: 1.6, price: 0.55 },
    { provider: "openai", model: "gpt-4.1-nano", weight: 0.7, price: 0.2 },
    { provider: "anthropic", model: "claude-sonnet-4-20250514", weight: 1.25, price: 1.7 },
    { provider: "anthropic", model: "claude-opus-4-20250514", weight: 0.45, price: 3.8 },
    { provider: "anthropic", model: "claude-3-5-haiku-20241022", weight: 0.85, price: 0.65 },
    { provider: "google", model: "gemini-2.5-pro", weight: 1.05, price: 1.15 },
    { provider: "xai", model: "grok-3", weight: 0.75, price: 1.35 },
    { provider: "groq", model: "llama-3.3-70b-versatile", weight: 1.35, price: 0.3 },
    { provider: "deepseek", model: "deepseek-chat", weight: 0.95, price: 0.4 },
    { provider: "amazon-bedrock", model: "amazon.nova-pro-v1:0", weight: 0.6, price: 0.8 },
    {
      provider: "vercel-ai-gateway",
      model: "anthropic/claude-opus-4.6",
      weight: 0.4,
      price: 2.4,
    },
  ];
  const workloads = ["Workspace review", "Research synthesis", "Release planning", "Documentation"];
  const channels = ["terminal", "webchat", "discord"];
  const toolNames = ["read", "exec", "browser", "write", "sessions_list", "message"];
  const midnight = new Date(baseTime);
  midnight.setHours(0, 0, 0, 0);
  const dateFormats = new Map<string, Intl.DateTimeFormat>();
  const dateKey = (timestamp: number, timeZone?: string) => {
    const zone = timeZone ?? "local";
    let format = dateFormats.get(zone);
    if (!format) {
      format = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        ...(timeZone ? { timeZone } : {}),
      });
      dateFormats.set(zone, format);
    }
    const parts = format.formatToParts(timestamp);
    return ["year", "month", "day"]
      .map((type) => parts.find((part) => part.type === type)!.value)
      .join("-");
  };
  const empty = (): CostUsageTotals => ({
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    cacheReadCost: 0,
    cacheWriteCost: 0,
    missingCostEntries: 0,
  });
  const sum = (rows: CostUsageTotals[]) => {
    const value = empty();
    for (const row of rows)
      for (const key of Object.keys(value) as Array<
        keyof Omit<CostUsageTotals, "missingCostByModel">
      >)
        value[key] += row[key];
    return value;
  };
  const sumMessages = (rows: SessionMessageCounts[]): SessionMessageCounts => {
    const value = { total: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, errors: 0 };
    for (const row of rows)
      for (const key of Object.keys(value) as Array<keyof SessionMessageCounts>)
        value[key] += row[key];
    return value;
  };
  const sessions = Array.from({ length: 24 }, (_, index) => {
    const model = models[index % models.length]!;
    // Rotate ownership between model cycles so the default agent sees every provider.
    const agentId =
      (index + Math.floor(index / models.length)) % 3 === 0 ? "alpha" : "openclaw-mock";
    const key = `agent:${agentId}:usage-workload-${index}`;
    const sessionId = `synthetic-usage-instance-${index}`;
    const days = Array.from({ length: 365 }, (_, dayIndex) => {
      const daysAgo = 364 - dayIndex;
      const date = new Date(midnight);
      date.setDate(date.getDate() - daysAgo);
      const weekend = [0, 6].includes(date.getDay()) ? 0.48 : 1;
      const wave =
        0.9 +
        0.38 * Math.sin(dayIndex / 4.8 + index * 0.65) +
        0.2 * Math.cos(dayIndex / 13 + index);
      const spike = (dayIndex + index * 3) % 37 < 2 ? 2.9 : 1;
      const quiet = (dayIndex + index) % 23 === 7 ? 0.12 : 1;
      const totalTokens = Math.round(72_000_000 * model.weight * wave * spike * quiet * weekend);
      const input = Math.floor(totalTokens * 0.21),
        output = Math.floor(totalTokens * 0.13),
        cacheWrite = Math.floor(totalTokens * 0.08);
      const cacheRead = totalTokens - input - output - cacheWrite;
      // Synthetic per-million token rates for the demo, not a provider price catalogue.
      const inputCost = (input * model.price * 1.8) / 1e6,
        outputCost = (output * model.price * 6) / 1e6;
      const cacheReadCost = (cacheRead * model.price * 0.18) / 1e6,
        cacheWriteCost = (cacheWrite * model.price * 2.2) / 1e6;
      const totals = {
        input,
        output,
        cacheRead,
        cacheWrite,
        totalTokens,
        totalCost: inputCost + outputCost + cacheReadCost + cacheWriteCost,
        inputCost,
        outputCost,
        cacheReadCost,
        cacheWriteCost,
        missingCostEntries: 0,
      };
      const assistant = Math.max(1, Math.round(totalTokens / 35_000)),
        user = Math.round(assistant * 0.62),
        toolCalls = Math.round(assistant * 0.34);
      const messages = {
        total: user + assistant,
        user,
        assistant,
        toolCalls,
        toolResults: toolCalls,
        errors: (dayIndex + index) % 11 === 0 ? Math.ceil(assistant * 0.015) : 0,
      };
      const timestamp = Math.min(
        baseTime - 60_000,
        date.getTime() + (7 + (index % 14)) * 3_600_000 + (index % 4) * 900_000,
      );
      return {
        timestamp,
        totals,
        messages,
        latency: {
          count: assistant,
          avgMs: 620 + index * 37 + (dayIndex % 180),
          minMs: 180 + index * 7,
          maxMs: 4_800 + index * 140,
          p95Ms: 2_100 + index * 90,
        },
      };
    });
    const skills = ["planning", "research", "review", "writing", "analysis", "summarization"].map(
      (name, i) => ({ name, blockChars: 2_800 - i * 280 }),
    );
    const contextWeight: SessionSystemPromptReport = {
      source: "estimate",
      generatedAt: baseTime,
      sessionId,
      sessionKey: key,
      provider: model.provider,
      model: model.model,
      systemPrompt: { chars: 18_400, projectContextChars: 8_200, nonProjectContextChars: 10_200 },
      skills: {
        promptChars: skills.reduce((total, skill) => total + skill.blockChars, 0),
        entries: skills,
      },
      tools: {
        listChars: 1_800,
        schemaChars: 6_000,
        entries: toolNames.map((name) => ({
          name,
          summaryChars: 300,
          schemaChars: 1_000,
          propertiesCount: 5,
        })),
      },
      injectedWorkspaceFiles: [
        "AGENTS.md",
        "VISION.md",
        "README.md",
        "docs/overview.md",
        "notes/research.md",
      ].map((name, i) => ({
        name,
        path: `/mock/workspace/${name}`,
        missing: false,
        rawChars: 3_000 - i * 300,
        injectedChars: 3_000 - i * 300,
        truncated: false,
      })),
    };
    return {
      key,
      sessionId,
      label: `${workloads[Math.floor(index / 6)]} · ${model.model}`,
      agentId,
      channel: channels[index % channels.length]!,
      model,
      contextWeight,
      days,
    };
  });

  function snapshot(params: Record<string, unknown> = {}) {
    const timeZone =
      params.mode === "utc"
        ? "UTC"
        : typeof params.timeZone === "string"
          ? params.timeZone
          : undefined;
    const startDate =
      typeof params.startDate === "string"
        ? params.startDate
        : dateKey(sessions[0]!.days[0]!.timestamp, timeZone);
    const endDate =
      typeof params.endDate === "string" ? params.endDate : dateKey(baseTime, timeZone);
    const dateBuckets = new Map<string, CostUsageTotals[]>();
    const entries: SessionUsageEntry[] = [];
    for (const session of sessions) {
      if (typeof params.key === "string" && params.key !== session.key) continue;
      if (typeof params.agentId === "string" && params.agentId !== session.agentId) continue;
      const days = session.days
        .map((day) => ({ ...day, date: dateKey(day.timestamp, timeZone) }))
        .filter((day) => day.date >= startDate && day.date <= endDate);
      if (!days.length) continue;
      const totals = sum(days.map((day) => day.totals));
      const messageCounts = sumMessages(days.map((day) => day.messages));
      const tools = toolNames.map((name, i) => ({
        name,
        count:
          i === 5
            ? messageCounts.toolCalls - 5 * Math.floor(messageCounts.toolCalls / 6)
            : Math.floor(messageCounts.toolCalls / 6),
      }));
      const usage: SessionCostSummary = {
        ...totals,
        sessionId: session.sessionId,
        firstActivity: days[0]!.timestamp,
        lastActivity: days.at(-1)!.timestamp,
        durationMs: Math.max(0, days.at(-1)!.timestamp - days[0]!.timestamp),
        activityDates: days.map((day) => day.date),
        messageCounts,
        toolUsage: { totalCalls: messageCounts.toolCalls, uniqueTools: tools.length, tools },
        modelUsage: [
          {
            provider: session.model.provider,
            model: session.model.model,
            count: messageCounts.assistant,
            totals,
          },
        ],
        dailyBreakdown: days.map((day) => ({
          date: day.date,
          ...day.totals,
          tokens: day.totals.totalTokens,
          cost: day.totals.totalCost,
        })),
        dailyMessageCounts: days.map((day) => ({ date: day.date, ...day.messages })),
        dailyModelUsage: days.map((day) => ({
          date: day.date,
          provider: session.model.provider,
          model: session.model.model,
          tokens: day.totals.totalTokens,
          cost: day.totals.totalCost,
          count: day.messages.assistant,
        })),
        dailyLatency: days.map((day) => ({ date: day.date, ...day.latency })),
        latency: {
          count: messageCounts.assistant,
          avgMs:
            days.reduce((total, day) => total + day.latency.avgMs * day.latency.count, 0) /
            messageCounts.assistant,
          minMs: Math.min(...days.map((day) => day.latency.minMs)),
          maxMs: Math.max(...days.map((day) => day.latency.maxMs)),
          p95Ms: Math.max(...days.map((day) => day.latency.p95Ms)),
        },
        utcQuarterHourTokenUsage: days.map((day) => ({
          date: dateKey(day.timestamp, "UTC"),
          quarterIndex:
            new Date(day.timestamp).getUTCHours() * 4 +
            Math.floor(new Date(day.timestamp).getUTCMinutes() / 15),
          ...day.totals,
        })),
        utcQuarterHourMessageCounts: days.map((day) => ({
          date: dateKey(day.timestamp, "UTC"),
          quarterIndex:
            new Date(day.timestamp).getUTCHours() * 4 +
            Math.floor(new Date(day.timestamp).getUTCMinutes() / 15),
          ...day.messages,
        })),
      };
      for (const day of days)
        dateBuckets.set(day.date, [...(dateBuckets.get(day.date) ?? []), day.totals]);
      entries.push({
        key: session.key,
        label: session.label,
        sessionId: session.sessionId,
        currentSessionId: session.sessionId,
        scope: params.groupBy === "instance" ? "instance" : "family",
        sessionFamilyKey: session.key,
        includedSessionIds: [session.sessionId],
        historicalInstanceCount: 0,
        updatedAt: days.at(-1)!.timestamp,
        agentId: session.agentId,
        channel: session.channel,
        chatType: "direct",
        modelProvider: session.model.provider,
        model: session.model.model,
        hasContextWeight: true,
        ...(params.includeContextWeight === true ? { contextWeight: session.contextWeight } : {}),
        usage,
      });
    }
    const totals = sum(entries.map((entry) => entry.usage!));
    const modelGroups = new Map<string, SessionModelUsage>();
    const providerGroups = new Map<string, SessionModelUsage>();
    const agents = new Map<string, CostUsageTotals[]>(),
      channelGroups = new Map<string, CostUsageTotals[]>();
    const dailyModels = new Map<string, SessionDailyModelUsage>();
    const tools = new Map<string, number>();
    const messages = sumMessages(entries.map((entry) => entry.usage!.messageCounts!));
    const daily = Array.from(dateBuckets, ([date, values]) => ({ date, ...sum(values) })).sort(
      (a, b) => a.date.localeCompare(b.date),
    );
    for (const entry of entries) {
      const usage = entry.usage!;
      for (const [key, map, model] of [
        [`${entry.modelProvider}/${entry.model}`, modelGroups, entry.model],
        [entry.modelProvider!, providerGroups, undefined],
      ] as const) {
        const prior = map.get(key);
        map.set(key, {
          provider: entry.modelProvider,
          ...(model ? { model } : {}),
          count: (prior?.count ?? 0) + usage.messageCounts!.assistant,
          totals: sum([...(prior ? [prior.totals] : []), usage]),
        });
      }
      agents.set(entry.agentId!, [...(agents.get(entry.agentId!) ?? []), usage]);
      channelGroups.set(entry.channel!, [...(channelGroups.get(entry.channel!) ?? []), usage]);
      for (const tool of usage.toolUsage!.tools)
        tools.set(tool.name, (tools.get(tool.name) ?? 0) + tool.count);
      for (const day of usage.dailyModelUsage!) {
        const key = `${day.date}/${day.provider}/${day.model}`,
          prior = dailyModels.get(key);
        dailyModels.set(key, {
          ...day,
          tokens: day.tokens + (prior?.tokens ?? 0),
          cost: day.cost + (prior?.cost ?? 0),
          count: day.count + (prior?.count ?? 0),
        });
      }
    }
    // Match the accounting owner's summary merge: count-weighted mean, extrema,
    // and the largest supplied p95 because session summaries carry no raw samples.
    const mergeLatency = (values: SessionLatencyStats[]): SessionLatencyStats => {
      const count = values.reduce((total, value) => total + value.count, 0);
      return {
        count,
        avgMs: count
          ? values.reduce((total, value) => total + value.avgMs * value.count, 0) / count
          : 0,
        minMs: values.length ? Math.min(...values.map((value) => value.minMs)) : 0,
        maxMs: Math.max(0, ...values.map((value) => value.maxMs)),
        p95Ms: Math.max(0, ...values.map((value) => value.p95Ms)),
      };
    };
    const latencies = entries.flatMap((entry) =>
      entry.usage?.latency?.count ? [entry.usage.latency] : [],
    );
    const aggregates: SessionsUsageAggregates = {
      sessionCount: entries.length,
      latency: latencies.length ? mergeLatency(latencies) : undefined,
      dailyLatency: daily.map((day) => ({
        date: day.date,
        ...mergeLatency(
          entries.flatMap((entry) =>
            (entry.usage?.dailyLatency ?? []).filter((value) => value.date === day.date),
          ),
        ),
      })),
      longestSessionDurationMs: Math.max(0, ...entries.map((entry) => entry.usage!.durationMs!)),
      messages,
      tools: {
        totalCalls: messages.toolCalls,
        uniqueTools: tools.size,
        tools: Array.from(tools, ([name, count]) => ({ name, count })).sort(
          (a, b) => b.count - a.count,
        ),
      },
      byModel: [...modelGroups.values()].sort((a, b) => b.totals.totalCost - a.totals.totalCost),
      byProvider: [...providerGroups.values()].sort(
        (a, b) => b.totals.totalCost - a.totals.totalCost,
      ),
      byAgent: Array.from(agents, ([agentId, values]) => ({ agentId, totals: sum(values) })),
      byChannel: Array.from(channelGroups, ([channel, values]) => ({
        channel,
        totals: sum(values),
      })),
      modelDaily: [...dailyModels.values()].sort(
        (a, b) => a.date.localeCompare(b.date) || b.cost - a.cost,
      ),
      daily: daily.map((day) => {
        const counts = sumMessages(
          entries.flatMap((entry) =>
            entry.usage!.dailyMessageCounts!.filter((value) => value.date === day.date),
          ),
        );
        return {
          date: day.date,
          tokens: day.totalTokens,
          cost: day.totalCost,
          messages: counts.total,
          toolCalls: counts.toolCalls,
          errors: counts.errors,
        };
      }),
    };
    return {
      result: {
        updatedAt: baseTime,
        startDate,
        endDate,
        sessions: entries.slice(0, typeof params.limit === "number" ? params.limit : 1000),
        totals,
        aggregates,
      },
      cost: { updatedAt: baseTime, days: daily.length, daily, totals },
    };
  }
  function timeline(key: unknown) {
    const session = sessions.find((entry) => entry.key === key);
    let cumulativeTokens = 0,
      cumulativeCost = 0;
    return {
      sessionId: session?.sessionId,
      points:
        session?.days.map((day) => {
          cumulativeTokens += day.totals.totalTokens;
          cumulativeCost += day.totals.totalCost;
          return {
            timestamp: day.timestamp,
            ...day.totals,
            cost: day.totals.totalCost,
            cumulativeTokens,
            cumulativeCost,
          };
        }) ?? [],
    };
  }
  function logs(key: unknown, limit = 1000) {
    const session = sessions.find((entry) => entry.key === key);
    const rows =
      session?.days.flatMap((day) => [
        {
          timestamp: day.timestamp - 1000,
          role: "user",
          content: "Review the synthetic workspace notes and summarize the next steps.",
        },
        {
          timestamp: day.timestamp,
          role: "assistant",
          content:
            "Reviewed the synthetic workspace and prepared the next steps.\n[Tool: read]\n[Tool: exec]",
          tokens: day.totals.totalTokens,
          cost: day.totals.totalCost,
        },
        {
          timestamp: day.timestamp + 1000,
          role: "toolResult",
          content: "[Tool Result]\nSynthetic workspace analysis complete.",
        },
      ]) ?? [];
    return { logs: limit > 0 ? rows.slice(-limit) : [] };
  }
  return { snapshot, timeline, logs };
}

function installUsageMock(create: typeof createUsageMock, baseTime: number) {
  const gateway = (window as Window & { openclawControlUiE2eGateway?: ControlUiMockGateway })
    .openclawControlUiE2eGateway;
  if (!gateway) throw new Error("Usage mock requires the mock Gateway");
  const mock = create(baseTime);
  gateway.setRequestHandler("sessions.usage", ({ params, respond }) =>
    respond(mock.snapshot((params ?? {}) as Record<string, unknown>).result),
  );
  gateway.setRequestHandler("usage.cost", ({ params, respond }) =>
    respond(mock.snapshot((params ?? {}) as Record<string, unknown>).cost),
  );
  gateway.setRequestHandler("sessions.usage.timeseries", ({ params, respond }) =>
    respond(mock.timeline((params as { key?: unknown })?.key)),
  );
  gateway.setRequestHandler("sessions.usage.logs", ({ params, respond }) => {
    const input = params as { key?: unknown; limit?: number };
    respond(mock.logs(input?.key, input?.limit));
  });
}

export function usageMockInitScript(baseTime: number): string {
  return `(() => { const __name = (target) => target; (${installUsageMock.toString()})(${createUsageMock.toString()}, ${baseTime}); })();`;
}
