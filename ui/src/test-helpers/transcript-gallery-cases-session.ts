// Session-shaped transcript artifacts: notices, dividers, live run states,
// identity variants, and the empty and loading states of the thread itself.
import {
  assistant,
  at,
  type GallerySection,
  type TranscriptCase,
  user,
} from "./transcript-gallery-content.ts";

const NOTICE_CASES: readonly TranscriptCase[] = [
  {
    id: "notice-system",
    title: "System notices",
    note: "All three shapes: a plain system message with no icon, the two registered kinds (restart recovery and gateway restarted), and the generic fallback an unregistered sourceTool produces.",
    stage: "tall",
    props: {
      messages: [
        user("Did the update interrupt my run?", 0),
        {
          role: "system",
          content: "Command output\n  indented continuation line",
          timestamp: at(1),
        },
        {
          role: "user",
          content: "[System] Gateway restarted during update 2026.8.2 -> 2026.8.3.",
          timestamp: at(2),
          provenance: { kind: "internal_system", sourceTool: "restart-sentinel" },
        },
        {
          role: "user",
          content: "[System] Continue the interrupted turn.",
          timestamp: at(3),
          provenance: { kind: "internal_system", sourceTool: "main_session_restart_recovery" },
        },
        {
          role: "user",
          content: "[System] Keep the raw fallback copy.",
          timestamp: at(4),
          provenance: { kind: "internal_system", sourceTool: "session-companion" },
        },
        assistant("Picking the turn back up — the pairing audit was mid-grep.", 5),
      ],
    },
  },
  {
    id: "notice-dividers",
    title: "Compaction and reset dividers",
    note: "The two lifecycle dividers. Compaction carries a saved-token metric and a checkpoints action; reset carries neither.",
    props: {
      messages: [
        assistant("That is the whole pairing audit.", 0),
        {
          role: "system",
          timestamp: at(1),
          __openclaw: {
            kind: "compaction",
            id: "checkpoint-1",
            tokensBefore: 900_000,
            tokensAfter: 24_700,
          },
        },
        user("Continue from the compacted history.", 2),
        assistant("Context is compacted; the earlier transcript is a checkpoint.", 3),
        { role: "system", timestamp: at(4), __openclaw: { kind: "reset", id: "reset-1" } },
        user("Fresh start.", 5),
      ],
    },
  },
  {
    id: "notice-duplicates",
    title: "Collapsed duplicates",
    note: "Consecutive identical messages fold into one bubble with a multiplier chip.",
    stage: "short",
    props: {
      messages: [
        user("Any update from the gateway?", 0),
        assistant("Still waiting for the gateway.", 1, { __openclaw: { id: "relay-update" } }),
        assistant("Still waiting for the gateway.", 2, { __openclaw: { id: "relay-update" } }),
        assistant("Still waiting for the gateway.", 3, { __openclaw: { id: "relay-update" } }),
        assistant("Still waiting for the gateway.", 4, { __openclaw: { id: "relay-update" } }),
      ],
    },
  },
];

const RUN_STATE_CASES: readonly TranscriptCase[] = [
  {
    id: "run-streaming",
    title: "Streaming assistant text",
    note: "A live stream run: settled segments plus the still-streaming tail, grouped under one identity.",
    props: {
      runActive: true,
      runWorking: true,
      runId: "run-gallery",
      messages: [user("Walk me through the repair.", 0)],
      streamSegments: [
        {
          text: "Expiry belongs to the store, because the store owns the row lifecycle.",
          ts: at(1),
        },
        { text: "\n\nThat removes three consumer-side checks", ts: at(1) + 900 },
      ],
      stream:
        "Expiry belongs to the store, because the store owns the row lifecycle.\n\nThat removes three consumer-side checks and the dead helper the middle caller",
      streamStartedAt: at(1),
    },
  },
  {
    id: "run-working",
    title: "Working indicator",
    note: "The reading indicator with no text yet. The claw has a small chance of a surprise animation, which is intentional.",
    stage: "short",
    props: {
      runActive: true,
      runWorking: true,
      runId: "run-gallery",
      runOutputTokens: 1240,
      messages: [user("Audit the pairing path.", 0)],
    },
  },
  {
    id: "run-startup",
    title: "Run startup phases",
    note: "The startup status line that precedes the first token on a cold session.",
    stage: "short",
    props: {
      runActive: true,
      runWorking: true,
      runId: "run-gallery",
      startupStatus: { phase: "provisioning_environment", startedAt: at(1) },
      messages: [user("Start a worktree session.", 0)],
    },
  },
  {
    id: "run-waiting-approval",
    title: "Waiting for approval",
    note: "The run is parked on an approval decision; the indicator says so instead of counting tokens.",
    stage: "short",
    props: {
      runActive: true,
      runWorking: true,
      waitingApproval: true,
      runId: "run-gallery",
      messages: [user("Delete the stale worktrees.", 0)],
    },
  },
  {
    id: "run-plan",
    title: "Plan checklist",
    note: "The todo/plan surface as it appears inside the transcript (card variant).",
    props: {
      runActive: true,
      runWorking: true,
      runId: "run-gallery",
      planStatus: {
        explanation: "Keep the change inside the store's owner boundary",
        steps: [
          { step: "Reproduce the expiry drift against the mock gateway", status: "completed" },
          { step: "Move the expiry check into readPairingToken", status: "completed" },
          { step: "Delete the three consumer-side checks", status: "in_progress" },
          { step: "Add the regression test and rerun the focused suite", status: "pending" },
          { step: "Check the Discord adapter for the same call", status: "pending" },
        ],
      },
      messages: [user("Plan the repair before you touch anything.", 0)],
    },
  },
  {
    id: "run-queue",
    title: "Queued and failed sends",
    note: "Optimistic user bubbles for messages the composer has accepted but the gateway has not confirmed, including a failed send.",
    props: {
      runActive: true,
      runWorking: true,
      runId: "run-gallery",
      messages: [user("First message, already delivered.", 0)],
      queue: [
        {
          id: "queued-1",
          text: "Also check the Discord adapter while you are in there.",
          createdAt: at(1),
          sendState: "waiting-idle",
        },
        {
          id: "queued-2",
          text: "And re-run the focused suite afterwards.",
          createdAt: at(2),
          sendState: "failed",
          sendError: "Gateway closed the connection before the send was acknowledged.",
        },
      ],
    },
  },
];

const IDENTITY_CASES: readonly TranscriptCase[] = [
  {
    id: "identity-peers",
    title: "Multi-participant thread",
    note: "Two human participants plus the agent. Peer turns flip alignment, pick up a sender tint, and keep their name permanently visible.",
    stage: "tall",
    props: {
      userId: "profile-operator",
      userName: "Operator",
      messages: [
        {
          role: "user",
          content: "Can someone look at the pairing failures in #ops?",
          timestamp: at(0),
          senderLabel: "alice",
          sender: { id: "profile-alice", name: "Alice Moreau" },
        },
        {
          role: "user",
          content: "I can reproduce it, but only on the second retry.",
          timestamp: at(1),
          senderLabel: "joaquin",
          sender: { id: "profile-joaquin", name: "Joaquin De Rojas" },
        },
        {
          role: "assistant",
          content: "The second retry crosses the 15 minute expiry window — that is the trigger.",
          timestamp: at(2),
          replyToSender: { id: "profile-joaquin", name: "Joaquin De Rojas" },
        },
        {
          role: "user",
          content: "Confirmed on my side too.",
          timestamp: at(3),
          senderLabel: "Operator",
          sender: { id: "profile-operator", name: "Operator" },
        },
      ],
    },
  },
  {
    id: "identity-direct",
    title: "Direct (1:1) thread",
    note: "A direct session drops the avatar gutter entirely and widens the column. Same messages, different chrome.",
    props: {
      sessionKey: "direct:telegram:1188432",
      // A channel DM has no signed-in Control UI identity, which is exactly
      // what makes the projection drop the avatar gutter here.
      userId: null,
      messages: [
        user("Is the gateway up?", 0),
        assistant("Yes — uptime 4h 12m, all channels connected.", 1),
        user("Thanks.", 2),
      ],
    },
  },
  {
    id: "identity-meta",
    title: "Usage and model footer",
    note: "Hover the assistant turn: the timestamp opens a meta popover with tokens, cache, cost, context share, and the model that answered.",
    stage: "short",
    props: {
      messages: [
        user("How expensive was that turn?", 0),
        {
          role: "assistant",
          content: [
            { type: "text", text: "Roughly four cents — the cache carried most of the context." },
          ],
          timestamp: at(1),
          model: "anthropic/claude-opus-5",
          usage: {
            input: 182_400,
            output: 3_100,
            cacheRead: 168_000,
            cacheWrite: 5_120,
            cost: { total: 0.0412 },
          },
        },
      ],
    },
  },
  {
    id: "identity-workspace-conflict",
    title: "Cloud workspace conflict",
    note: "A transcript event rather than a message: the cloud result landed with conflicts and lists the paths plus the staged ref.",
    props: {
      messages: [
        assistant("Applying the cloud worker result.", 0),
        {
          role: "custom",
          customType: "cloud-workspace-conflict",
          content: "fallback summary that should not render as plain text",
          details: {
            paths: [
              "src/gateway/pairing-store.ts",
              "src/gateway/pairing-route.ts",
              "src/channels/telegram/pairing.ts",
              "ui/src/pages/chat/chat-thread.ts",
              "docs/gateway/device-pairing.md",
              "package.json",
            ],
            stagedResultRef: "refs/openclaw/worker-results/claim-456",
            totalCount: 7,
          },
          timestamp: at(1),
        },
      ],
    },
  },
];

const THREAD_STATE_CASES: readonly TranscriptCase[] = [
  {
    id: "thread-empty",
    title: "Empty thread (welcome)",
    note: "What a new session shows before the first turn.",
    stage: "tall",
    props: { messages: [] },
  },
  {
    id: "thread-loading",
    title: "Loading skeleton",
    note: "The placeholder rows shown while history is still being fetched.",
    props: { loading: true, messages: [] },
  },
  {
    id: "thread-paginating",
    title: "History pagination sentinel",
    note: "The spinner row pinned above the oldest loaded message while older history streams in.",
    stage: "short",
    props: {
      historyPagination: { loading: true },
      messages: [
        user("Older messages are still loading above this one.", 0),
        assistant("Correct.", 1),
      ],
    },
  },
];

export const SESSION_SECTIONS: readonly GallerySection[] = [
  {
    id: "notices",
    title: "Notices and dividers",
    short: "Notices",
    note: "Rows the transcript owns that are not messages: system notices, lifecycle dividers, and duplicate collapse.",
    cases: NOTICE_CASES,
  },
  {
    id: "run-states",
    title: "Live run states",
    short: "Run states",
    note: "Everything the transcript shows while a run is in flight, plus the queue rows a pending send produces.",
    cases: RUN_STATE_CASES,
  },
  {
    id: "identity",
    title: "Identity and thread shape",
    short: "Identity",
    note: "How the same conversation changes with multiple participants, a direct thread, usage metadata, or a workspace conflict.",
    cases: IDENTITY_CASES,
  },
  {
    id: "thread-states",
    title: "Thread states",
    short: "Thread states",
    note: "Empty, loading, and paginating — the states an operator meets before any content exists.",
    cases: THREAD_STATE_CASES,
  },
];
