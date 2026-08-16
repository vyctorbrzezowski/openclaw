// Transcript artifacts whose payload is media, background work, or a surface
// the chat view renders around the transcript. Split from the session cases so
// neither module crosses the file-size split.
import { html } from "lit";
import { renderBackgroundTasksRail } from "../pages/chat/components/chat-background-tasks-render.ts";
import { renderChatPullRequests } from "../pages/chat/components/chat-pull-requests.ts";
import { renderChatSessionSuggestions } from "../pages/chat/components/chat-session-suggestions.ts";
import {
  deriveSubagentActivity,
  renderSubagentActivity,
} from "../pages/chat/components/chat-subagent-activity.ts";
import { renderChatSwarmProgress } from "../pages/chat/components/chat-swarm-progress.ts";
import { renderChatTaskSuggestionTray } from "../pages/chat/components/chat-task-suggestions.ts";
import { renderWorkspaceConflictNotice } from "../pages/chat/components/chat-workspace-conflict.ts";
import {
  at,
  type GallerySection,
  type TranscriptCase,
  user,
} from "./transcript-gallery-content.ts";

/** Wraps a chat-view surface in the transcript's own column so widths match. */
function stageRow(body: unknown) {
  return html`<div class="chat-thread"><div class="chat-thread-inner">${body}</div></div>`;
}

const MEDIA_CASES: readonly TranscriptCase[] = [
  {
    id: "media-images",
    title: "Images",
    note: "An inline data-URI image, a remote URL, and a deliberately unreachable one so the broken state is visible.",
    props: {
      messages: [
        user("Send the screenshots.", 0),
        {
          role: "assistant",
          timestamp: at(1),
          content: [
            { type: "text", text: "Three captures from the pairing flow:" },
            {
              type: "image",
              url: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjIwIiB5PSI5NiIgZmlsbD0iI2U1ZTdlYiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiPnBhaXJpbmcgc2NyZWVuPC90ZXh0Pjwvc3ZnPg==",
              alt: "Pairing screen",
            },
            {
              type: "image",
              url: "https://openclaw.ai/assets/pairing-expiry.png",
              alt: "Expiry log",
            },
            { type: "image", url: "https://127.0.0.1:9/missing.png", alt: "Unreachable capture" },
          ],
        },
      ],
    },
  },
  {
    id: "media-attachments",
    title: "Audio, video, and documents",
    note: "The attachment card family: a voice note with waveform, a video player, a text document with preview, a PDF without one, and an attachment whose source cannot be resolved.",
    stage: "tall",
    props: {
      messages: [
        user("Attach the recording and the report.", 0),
        {
          role: "assistant",
          timestamp: at(1),
          content: [
            { type: "text", text: "Everything from the incident window:" },
            {
              type: "attachment",
              attachment: {
                url: "https://openclaw.ai/assets/voice-note.ogg",
                kind: "audio",
                label: "voice-note-2026-08-15.ogg",
                mimeType: "audio/ogg",
                isVoiceNote: true,
                durationMs: 42_000,
                sizeBytes: 184_320,
              },
            },
            {
              type: "attachment",
              attachment: {
                url: "https://openclaw.ai/assets/pairing-retry.mp4",
                kind: "video",
                label: "pairing-retry.mp4",
                mimeType: "video/mp4",
                durationMs: 18_000,
                width: 1280,
                height: 720,
              },
            },
            {
              type: "attachment",
              attachment: {
                url: "https://openclaw.ai/assets/incident.md",
                kind: "document",
                label: "incident-2026-08-15.md",
                mimeType: "text/markdown",
                sizeBytes: 4_820,
              },
            },
            {
              type: "attachment",
              attachment: {
                url: "https://openclaw.ai/assets/audit.pdf",
                kind: "document",
                label: "release-audit.pdf",
                mimeType: "application/pdf",
                sizeBytes: 1_204_000,
              },
            },
            {
              type: "attachment",
              attachment: {
                url: "file:///Users/operator/private/not-shared.png",
                kind: "image",
                label: "not-shared.png",
                mimeType: "image/png",
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: "media-pairing-qr",
    title: "Pairing QR and its expiry notice",
    note: "A QR block that is still valid, and one whose expiry has passed and collapses into a blocked card.",
    props: {
      messages: [
        user("/pair qr", 0),
        {
          role: "assistant",
          timestamp: at(1),
          content: [
            { type: "text", text: "Scan this within 15 minutes:" },
            {
              type: "openclaw_pairing_qr",
              image_url:
                "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIi8+PHJlY3QgeD0iMTAwIiB5PSIyMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIi8+PHJlY3QgeD0iMjAiIHk9IjEwMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIi8+PC9zdmc+",
              alt: "Pairing QR",
              expiresAtMs: Date.now() + 15 * 60_000,
            },
          ],
        },
        {
          role: "assistant",
          timestamp: at(2),
          content: [
            { type: "text", text: "The earlier code from this morning:" },
            {
              type: "openclaw_pairing_qr",
              image_url:
                "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
              alt: "Expired pairing QR",
              expiresAtMs: Date.now() - 60_000,
            },
          ],
        },
      ],
    },
  },
];

const SUBAGENT_TASKS = [
  {
    id: "task-map",
    taskId: "task-map",
    status: "running",
    runtime: "subagent",
    agentId: "main",
    title: "Map the pairing call sites",
    sessionKey: "agent:main:identity-subagents",
    createdAt: at(0),
    updatedAt: at(2),
    startedAt: at(0),
    lastToolName: "grep",
    lastActivity: "grep expiresAt in src/channels",
    diffStat: { files: 0, added: 0, removed: 0 },
  },
  {
    id: "task-tests",
    taskId: "task-tests",
    status: "running",
    runtime: "subagent",
    agentId: "main",
    title: "Write the regression test",
    sessionKey: "agent:main:identity-subagents",
    createdAt: at(1),
    updatedAt: at(3),
    startedAt: at(1),
    lastToolName: "write",
    lastActivity: "write src/gateway/pairing-store.test.ts",
    diffStat: { files: 1, added: 34, removed: 0 },
  },
  {
    id: "task-docs",
    taskId: "task-docs",
    status: "failed",
    runtime: "subagent",
    agentId: "main",
    title: "Correct the docs page",
    sessionKey: "agent:main:identity-subagents",
    createdAt: at(1),
    updatedAt: at(4),
    startedAt: at(1),
    endedAt: at(4),
    error: "docs/gateway/device-pairing.md is owned by another lane",
    terminalSummary: "Refused: the page is locked by another lane",
    diffStat: { files: 0, added: 0, removed: 0 },
  },
  {
    id: "task-discord",
    taskId: "task-discord",
    status: "completed",
    runtime: "subagent",
    agentId: "main",
    title: "Audit the Discord adapter",
    sessionKey: "agent:main:identity-subagents",
    createdAt: at(0),
    updatedAt: at(5),
    startedAt: at(0),
    endedAt: at(5),
    terminalSummary: "No consumer-side expiry check remains",
    diffStat: { files: 2, added: 3, removed: 11 },
  },
] as never[];

const ACTIVITY_CASES: readonly TranscriptCase[] = [
  {
    id: "activity-subagents",
    title: "Sub-agent activity rows",
    note: "Live sub-agent progress: running rows with their last tool, a failed row, and a finished one carrying its diff stat.",
    stage: "short",
    render: () =>
      stageRow(
        renderSubagentActivity(
          deriveSubagentActivity({
            tasks: SUBAGENT_TASKS,
            sessionKey: "agent:main:identity-subagents",
            terminalObservedAtByTask: new Map([
              ["task-docs", Date.now()],
              ["task-discord", Date.now()],
            ]),
            canonicalizeSessionKey: (sessionKey) => sessionKey ?? "",
            now: Date.now(),
          }),
          () => undefined,
        ),
      ),
  },
  {
    id: "activity-background-rail",
    title: "Background task rail",
    note: "The rail the chat pane pins beside the transcript, with queued, running, failed, and finished tasks.",
    stage: "tall",
    render: () =>
      stageRow(
        renderBackgroundTasksRail({
          sessionKey: "agent:main:identity-subagents",
          statusRowId: "gallery-tasks-status",
          collapsed: false,
          narrowLayout: false,
          connected: true,
          canCancel: true,
          loading: false,
          error: null,
          tasks: SUBAGENT_TASKS,
          subagentActivity: {
            rows: [],
            overflowWorking: 0,
            taskIds: new Set(),
            nextExpiryAt: null,
          },
          taskDetails: new Map(),
          taskDetailErrors: new Map(),
          taskDetailLoadingIds: new Set(),
          cancellingTaskIds: new Set(),
          finishedCollapsed: false,
          onToggleCollapsed: () => undefined,
          onToggleFinished: () => undefined,
          onRefresh: () => undefined,
          onCancel: () => undefined,
        } as never),
      ),
  },
  {
    id: "activity-swarm",
    title: "Swarm progress",
    note: "Per-group dots for a swarm run: queued, running, done, and failed workers.",
    stage: "short",
    render: () =>
      stageRow(
        renderChatSwarmProgress({
          sessionKey: "agent:main:identity-subagents",
          sessions: [
            {
              key: "agent:main:identity-subagents",
              swarmGroupId: "swarm-pairing",
              status: "active",
              hasActiveRun: true,
            },
            ...["done", "done", "running", "queued", "failed", "queued"].map((state, index) => ({
              key: `agent:swarm:worker-${index}`,
              parentSessionKey: "agent:main:identity-subagents",
              swarmGroupId: "swarm-pairing",
              status: state === "failed" ? "error" : state === "done" ? "idle" : "active",
              hasActiveRun: state === "running",
              subagentRunState: state,
              swarmPhase: state,
              swarmPhaseRank: index,
            })),
          ],
        } as never),
      ),
  },
  {
    id: "activity-canvas",
    title: "Canvas and widget surfaces",
    note: "An assistant message carrying a canvas preview. The frame is hosted by the mock server, so an unreachable document is expected here — the chrome around it is the artifact.",
    props: {
      canvasPluginSurfaceUrl: null,
      allowExternalEmbedUrls: false,
      messages: [
        user("Build me a counter widget.", 0),
        {
          role: "assistant",
          timestamp: at(1),
          content: [
            { type: "text", text: "Here it is — press the button to increment." },
            {
              type: "canvas",
              preview: {
                kind: "canvas",
                surface: "assistant_message",
                render: "url",
                viewId: "cv_counter",
                title: "Counter demo",
                url: "/__openclaw__/canvas/documents/cv_counter/index.html",
                preferredHeight: 320,
                sandbox: "scripts",
              },
              rawText: '{"viewId":"cv_counter","title":"Counter demo"}',
            },
          ],
        },
      ],
    },
  },
];

const AROUND_TRANSCRIPT_CASES: readonly TranscriptCase[] = [
  {
    id: "around-pull-requests",
    title: "Pull request cards",
    note: "Rendered between the transcript and the composer. Open, draft, and merged states plus a branch row with no PR yet.",
    stage: "short",
    render: () =>
      stageRow(
        renderChatPullRequests({
          pullRequests: [
            {
              number: 124_328,
              owner: "openclaw",
              repo: "openclaw",
              branch: "brzezowski/pairing-expiry-owner",
              title: "fix(gateway): own pairing expiry at the store",
              url: "https://github.com/openclaw/openclaw/pull/124328",
              state: "open",
              additions: 4,
              deletions: 16,
              checks: { state: "passing", passed: 21, failed: 0, skipped: 3, running: 0 },
              checksUrl: "https://github.com/openclaw/openclaw/pull/124328/checks",
            },
            {
              number: 124_274,
              owner: "openclaw",
              repo: "openclaw",
              branch: "brzezowski/hovercard-pointer-bridge",
              title: "fix(ui): GitHub link hovercard closes before the pointer can reach it",
              url: "https://github.com/openclaw/openclaw/pull/124274",
              state: "draft",
              additions: 61,
              deletions: 9,
              checks: { state: "pending", passed: 4, failed: 0, skipped: 0, running: 12 },
            },
            {
              number: 124_312,
              owner: "openclaw",
              repo: "openclaw",
              branch: "brzezowski/publication-fixtures",
              title: "test(plugins): deduplicate publication fixtures",
              url: "https://github.com/openclaw/openclaw/pull/124312",
              state: "merged",
              additions: 12,
              deletions: 288,
              checks: { state: "failing", passed: 18, failed: 2, skipped: 1, running: 0 },
            },
          ],
          branch: {
            owner: "openclaw",
            repo: "openclaw",
            branch: "brzezowski/transcript-artifact-gallery",
            additions: 2_819,
            deletions: 205,
            createUrl:
              "https://github.com/openclaw/openclaw/pull/new/brzezowski/transcript-artifact-gallery",
          },
          rateLimited: true,
          expanded: true,
          onExpand: () => undefined,
          onDismiss: () => undefined,
        }),
      ),
  },
  {
    id: "around-task-suggestions",
    title: "Task suggestions",
    note: "Follow-up work the agent proposes after a turn, with the start split-button and the collapsed prompt.",
    stage: "short",
    render: () =>
      stageRow(
        renderChatTaskSuggestionTray({
          taskSuggestions: [
            {
              id: "suggestion-worktree",
              title: "Audit the Discord pairing path",
              prompt:
                "Check whether src/channels/discord/pairing.ts re-derives token expiry the way the Telegram adapter did before the store took ownership. If it does, move the check to readPairingToken and delete the local guard.",
              tldr: "The Discord adapter may still carry the consumer-side expiry check that was just removed elsewhere.",
              cwd: "/Users/operator/Code/openclaw",
              sessionKey: "agent:main:pairing-audit",
              agentId: "main",
              createdAt: at(1),
            },
            {
              id: "suggestion-docs",
              title: "Correct the pairing window in the docs",
              prompt:
                "docs/gateway/device-pairing.md says pairing tokens last one hour; the shipped default is 15 minutes. Fix the page and check for the same claim in the onboarding copy.",
              tldr: "The docs page contradicts the shipped default.",
              cwd: "/Users/operator/Code/openclaw",
              sessionKey: "agent:main:pairing-audit",
              createdAt: at(2),
            },
          ],
          taskSuggestionBusyIds: new Set<string>(),
          taskSuggestionCopiedIds: new Set<string>(),
          canAcceptTaskSuggestions: true,
          canAcceptTaskSuggestionModes: true,
          canDismissTaskSuggestions: true,
          onAcceptTaskSuggestion: () => undefined,
          onDismissTaskSuggestion: () => undefined,
          onCopyTaskSuggestionPrompt: () => undefined,
        }),
      ),
  },
  {
    id: "around-session-suggestions",
    title: "Session suggestions",
    note: "Messages a collaborator proposes into the session; the owner can send, queue, edit, or dismiss.",
    stage: "short",
    render: () =>
      stageRow(
        renderChatSessionSuggestions({
          suggestions: [
            {
              id: "suggestion-1",
              sessionKey: "agent:main:pairing-audit",
              agentId: "main",
              author: { type: "human", id: "alice", label: "Alice Moreau" },
              text: "Ask it to check the CLI pairing flow too — openclaw devices reads the same rows.",
              createdAt: at(1),
              state: "pending",
            },
            {
              id: "suggestion-2",
              sessionKey: "agent:main:pairing-audit",
              agentId: "main",
              author: { type: "human", id: "joaquin", label: "Joaquin De Rojas" },
              text: "Already covered upstream.",
              createdAt: at(2),
              state: "dismissed",
            },
          ],
          role: "owner",
          busyIds: new Set<string>(),
          archived: false,
          canResolve: true,
          onResolve: () => undefined,
        }),
      ),
  },
  {
    id: "around-workspace-conflict-banner",
    title: "Workspace conflict banner",
    note: "The dismissible banner above the transcript, distinct from the in-transcript conflict event above.",
    stage: "short",
    render: () =>
      stageRow(
        renderWorkspaceConflictNotice({
          conflict: {
            paths: [
              "src/gateway/pairing-store.ts",
              "src/gateway/pairing-route.ts",
              "docs/gateway/device-pairing.md",
            ],
            stagedResultRef: "refs/openclaw/worker-results/claim-456",
            totalCount: 3,
          },
          onDismiss: () => undefined,
        }),
      ),
  },
];

export const SURFACE_SECTIONS: readonly GallerySection[] = [
  {
    id: "media",
    title: "Media and attachments",
    short: "Media",
    note: "Images, players, document cards, and the blocked states an unresolvable source produces.",
    cases: MEDIA_CASES,
  },
  {
    id: "activity",
    title: "Sub-agents, swarm, and canvas",
    short: "Activity",
    note: "Progress surfaces the transcript carries for work happening outside the main turn, plus canvas-backed assistant output.",
    cases: ACTIVITY_CASES,
  },
  {
    id: "around",
    title: "Surfaces around the transcript",
    short: "Around",
    note: "Rendered by the chat view between the transcript and the composer. Included because the operator reads them as part of the transcript.",
    cases: AROUND_TRANSCRIPT_CASES,
  },
];
