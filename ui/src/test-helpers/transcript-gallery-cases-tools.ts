// Tool-call artifacts: every tool family, every card state, grouped activity,
// reasoning blocks, and the diff surfaces a tool result can carry.
import {
  at,
  type GallerySection,
  liveToolMessage,
  pendingToolMessage,
  assistant,
  user,
  toolMessage,
  type TranscriptCase,
} from "./transcript-gallery-content.ts";

const TOOL_CASES: readonly TranscriptCase[] = [
  {
    id: "tool-command",
    title: "Command tool — succeeded",
    note: "The bash/exec family. Collapsed row shows the tokenized command; expand for the terminal body and the remaining arguments.",
    props: {
      messages: [
        user("Run the focused transcript test.", 0),
        toolMessage({
          name: "bash",
          callId: "call-bash-1",
          args: {
            command:
              "node scripts/run-vitest.mjs ui/src/pages/chat/components/chat-transcript-render.test.ts",
            workdir: "/Users/operator/Code/openclaw",
            timeout: 120_000,
          },
          output:
            " ✓ ui/src/pages/chat/components/chat-transcript-render.test.ts (7 tests) 812ms\n\n Test Files  1 passed (1)\n      Tests  7 passed (7)\n   Start at  09:01:44\n   Duration  2.31s",
          minutes: 1,
        }),
        assistant("All seven cases pass.", 2),
      ],
    },
  },
  {
    id: "tool-command-error",
    title: "Command tool — failed",
    note: "isError on the result drives the failed badge and the error output block.",
    props: {
      messages: [
        user("Build it.", 0),
        toolMessage({
          name: "bash",
          callId: "call-bash-2",
          args: { command: "pnpm build" },
          isError: true,
          output:
            "src/gateway/pairing-store.ts(48,7): error TS2532: Object is possibly 'undefined'.\nsrc/gateway/pairing-store.ts(52,3): error TS7030: Not all code paths return a value.\n\nBuild failed with 2 errors.",
          minutes: 1,
        }),
      ],
    },
  },
  {
    id: "tool-read-search-fetch",
    title: "Read, search, fetch rows",
    note: "The three summarizing families. Their row-level arguments are stripped from the expanded key-value list.",
    stage: "tall",
    props: {
      messages: [
        user("Find where expiry is checked.", 0),
        toolMessage({
          name: "grep",
          callId: "call-grep",
          args: { pattern: "expiresAt", path: "src/gateway", glob: "*.ts" },
          output:
            "src/gateway/pairing-store.ts:41\nsrc/gateway/pairing-route.ts:88\nsrc/gateway/device-pairing.ts:212",
          minutes: 1,
        }),
        toolMessage({
          name: "read",
          callId: "call-read",
          args: { file_path: "/Users/operator/Code/openclaw/src/gateway/pairing-store.ts" },
          output:
            'export function readPairingToken(db: Kysely<Schema>, deviceId: string) {\n  const row = db.selectFrom("pairing_tokens")…',
          minutes: 2,
        }),
        toolMessage({
          name: "web_fetch",
          callId: "call-fetch",
          args: { url: "https://docs.openclaw.ai/gateway/device-pairing" },
          output: "# Device pairing\n\nPairing tokens are valid for one hour…",
          minutes: 3,
        }),
      ],
    },
  },
  {
    id: "tool-edit-diff",
    title: "Edit tool with inline diff",
    note: "An edit whose result carries the authoritative numbered diff, plus the added/removed stat chips.",
    props: {
      messages: [
        user("Move the expiry check into the store.", 0),
        toolMessage({
          name: "edit",
          callId: "call-edit",
          args: { path: "/Users/operator/Code/openclaw/src/gateway/pairing-store.ts" },
          details: {
            diff: ' 41   const row = await db.selectFrom("pairing_tokens").where("deviceId", "=", deviceId).executeTakeFirst();\n-42   return row ?? null;\n+42   if (!row) {\n+43     return null;\n+44   }\n+45   // Expiry is authoritative at the store, not at each caller.\n+46   return row.expiresAt > Date.now() ? row : null;\n 47 }',
          },
          output: "Applied 1 edit to src/gateway/pairing-store.ts",
          minutes: 1,
        }),
      ],
    },
  },
  {
    id: "tool-write-multifile",
    title: "Write and multi-file patch",
    note: "A write card built from its content, and an apply_patch card summarizing several files at once.",
    stage: "tall",
    props: {
      messages: [
        user("Add the regression test and update the callers.", 0),
        toolMessage({
          name: "write",
          callId: "call-write",
          args: {
            path: "/Users/operator/Code/openclaw/src/gateway/pairing-store.test.ts",
            content:
              'import { describe, expect, it } from "vitest";\nimport { readPairingToken } from "./pairing-store.ts";\n\ndescribe("readPairingToken", () => {\n  it("refuses an expired row at the store", async () => {\n    expect(await readPairingToken(db, "device-1")).toBeNull();\n  });\n});\n',
          },
          output: "Wrote 9 lines",
          minutes: 1,
        }),
        toolMessage({
          name: "apply_patch",
          callId: "call-patch",
          args: {
            changes: [
              {
                path: "src/gateway/pairing-route.ts",
                kind: { type: "update" },
                diff: '--- a/src/gateway/pairing-route.ts\n+++ b/src/gateway/pairing-route.ts\n@@ -86,4 +86,2 @@\n-  if (isPairingTokenExpired(row)) {\n-    return refuse("expired");\n-  }\n',
              },
              {
                path: "src/gateway/device-pairing.ts",
                kind: { type: "update" },
                diff: "--- a/src/gateway/device-pairing.ts\n+++ b/src/gateway/device-pairing.ts\n@@ -210,3 +210,1 @@\n-  const expired = row.expiresAt <= receivedAt;\n",
              },
              {
                path: "src/gateway/pairing-expiry.ts",
                kind: { type: "delete" },
                diff: "",
              },
            ],
          },
          output: "Applied patch to 3 files",
          minutes: 2,
        }),
      ],
    },
  },
  {
    id: "tool-running",
    title: "Running tool — live",
    note: "A live tool-stream card with the run still active: spinner on the row and live diff counters. This is the only state that needs runActive.",
    props: {
      runActive: true,
      runWorking: true,
      runId: "run-gallery",
      toolMessages: [
        liveToolMessage({
          name: "edit",
          callId: "call-live",
          args: { path: "/Users/operator/Code/openclaw/src/gateway/pairing-store.ts" },
          diffStat: { added: 12, removed: 3 },
          minutes: 1,
        }),
      ],
      messages: [user("Apply the refactor.", 0)],
    },
  },
  {
    id: "tool-no-result",
    title: "Tool call with no result",
    note: "What an aborted run leaves behind: a call recorded with no result. Verbs go neutral and no stat is claimed.",
    stage: "short",
    props: {
      messages: [
        user("Start the long grep.", 0),
        pendingToolMessage({
          name: "grep",
          callId: "call-orphan",
          args: { pattern: "resolveProviderRuntime", path: "src" },
          minutes: 1,
        }),
      ],
    },
  },
  {
    id: "tool-truncated",
    title: "Oversized tool output",
    note: "Output long enough to exercise the block's own scrolling and the truncation notice shape.",
    props: {
      messages: [
        user("Show the whole install log.", 0),
        toolMessage({
          name: "bash",
          callId: "call-long",
          args: { command: "pnpm install" },
          output: `${Array.from(
            { length: 120 },
            (_value, index) =>
              `Progress: resolved ${index * 37}, reused ${index * 31}, downloaded ${index}, added ${index * 2}`,
          ).join("\n")}\n\n… truncated (241093 chars, showing first 120000).`,
          minutes: 1,
        }),
      ],
    },
  },
  {
    id: "tool-generic-mcp",
    title: "Generic and MCP tools",
    note: "Tools with no dedicated family fall back to the display table; unknown MCP names get a title-cased label and the fallback icon.",
    stage: "tall",
    props: {
      messages: [
        user("Search the web and post the summary.", 0),
        toolMessage({
          name: "web_search",
          callId: "call-search",
          args: { query: "markdown-it details plugin nested depth limit" },
          output:
            "3 results\n1. markdown-it container plugin\n2. remend streaming repair\n3. CommonMark spec §6.6",
          minutes: 1,
        }),
        toolMessage({
          name: "linear__create_issue",
          callId: "call-mcp",
          args: { team: "Gateway", title: "Move pairing expiry into the store", priority: 2 },
          output: '{"id":"GTW-812","url":"https://linear.app/openclaw/issue/GTW-812"}',
          minutes: 2,
        }),
      ],
    },
  },
  {
    id: "tool-activity-group",
    title: "Grouped activity run",
    note: "Consecutive tool calls collapse into one activity row summarizing the run. Expand it to reach the individual cards.",
    props: {
      messages: [
        user("Audit the pairing path end to end.", 0),
        toolMessage({
          name: "grep",
          callId: "g1",
          args: { pattern: "pairing", path: "src" },
          output: "18 matches across 6 files",
          minutes: 1,
        }),
        toolMessage({
          name: "read",
          callId: "g2",
          args: { file_path: "src/gateway/pairing-store.ts" },
          output: "…",
          minutes: 2,
        }),
        toolMessage({
          name: "read",
          callId: "g3",
          args: { file_path: "src/gateway/pairing-route.ts" },
          output: "…",
          minutes: 3,
        }),
        toolMessage({
          name: "bash",
          callId: "g4",
          args: { command: "git log -p -S isPairingTokenExpired --oneline | head -40" },
          output: "9f2a1cc fix(gateway): add pairing expiry guard",
          minutes: 4,
        }),
        toolMessage({
          name: "edit",
          callId: "g5",
          args: { path: "src/gateway/pairing-store.ts" },
          details: {
            diff: "-42   return row ?? null;\n+42   return row.expiresAt > Date.now() ? row : null;",
          },
          output: "Applied 1 edit",
          minutes: 5,
        }),
        assistant("Expiry now lives at the store; three consumer checks are gone.", 6),
      ],
    },
  },
  {
    id: "tool-thinking",
    title: "Reasoning block",
    note: "Assistant reasoning renders inline above the visible text as an italic block. Requires the thinking toggle on.",
    props: {
      messages: [
        user("Is the fix net negative?", 0),
        {
          role: "assistant",
          content: [
            {
              type: "thinking",
              thinking:
                "Count production lines only. Added: one guard in the store, four lines. Removed: three consumer checks (nine lines) plus the isPairingTokenExpired helper (seven lines). Net −12.",
            },
            {
              type: "text",
              text: "Yes — net −12 production lines: four added at the store, sixteen removed across the three consumers and the dead helper.",
            },
          ],
          timestamp: at(1),
        },
      ],
    },
  },
];
export const TOOL_SECTIONS: readonly GallerySection[] = [
  {
    id: "tools",
    title: "Tool calls and results",
    short: "Tools",
    note: "Every tool family and every state a card can reach. Rows start collapsed — click one to expand it.",
    cases: TOOL_CASES,
  },
];
