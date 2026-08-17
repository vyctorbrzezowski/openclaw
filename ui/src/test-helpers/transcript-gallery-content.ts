// Message payloads for the transcript artifact gallery. Kept apart from the
// page shell so the fixture content can grow per artifact family without the
// gallery module crossing the file-size split.
//
// Content is deliberately dirty: real repo paths, long output, wide tables,
// broken image URLs. Polishing a transcript against lorem ipsum hides exactly
// the overflow and wrapping defects this page exists to surface.

export type TranscriptCase = {
  readonly id: string;
  readonly title: string;
  /** What the operator is looking at, and where it appears in the product. */
  readonly note: string;
  /** Extra stage height for cases whose content is taller than the default. */
  readonly stage?: "short" | "tall";
  /** ChatProps overrides applied before the case enters the production chat view. */
  readonly props?: Record<string, unknown>;
};

export type GallerySection = {
  readonly id: string;
  readonly title: string;
  /** Label for the sticky jump bar, where the full title does not fit. */
  readonly short: string;
  readonly note: string;
  readonly cases: readonly TranscriptCase[];
};

const AT = Date.parse("2026-08-15T09:00:00.000Z");

/** Minutes after the fixture epoch, so rows keep a stable readable order. */
export function at(minutes: number): number {
  return AT + minutes * 60_000;
}

export function textMessage(
  role: string,
  body: string,
  minutes: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    role,
    content: [{ type: "text", text: body }],
    timestamp: at(minutes),
    // Persisted rows carry an entry id, and the transcript gates rewind, fork,
    // and reply targeting on it. Fixture rows without one render a quieter
    // footer than any gateway-backed session does.
    __openclaw: { id: `${role}-${minutes}` },
    ...extra,
  };
}

export function assistant(
  body: string,
  minutes = 1,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return textMessage("assistant", body, minutes, extra);
}

export function user(
  body: string,
  minutes = 0,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return textMessage("user", body, minutes, extra);
}

/** Historical tool call plus its result, the shape persisted transcripts use. */
export function toolMessage(params: {
  name: string;
  callId: string;
  args?: unknown;
  output?: string;
  isError?: boolean;
  details?: unknown;
  minutes: number;
}): Record<string, unknown> {
  return {
    role: "assistant",
    toolCallId: params.callId,
    content: [
      { type: "toolcall", id: params.callId, name: params.name, arguments: params.args ?? {} },
      ...(params.output === undefined && params.details === undefined && !params.isError
        ? []
        : [
            {
              type: "toolresult",
              id: params.callId,
              name: params.name,
              text: params.output ?? "",
              ...(params.details === undefined ? {} : { details: params.details }),
              ...(params.isError ? { isError: true } : {}),
            },
          ]),
    ],
    timestamp: at(params.minutes),
  };
}

/** A tool call with no result: the shape an aborted run leaves behind. */
export function pendingToolMessage(params: {
  name: string;
  callId: string;
  args?: unknown;
  minutes: number;
}): Record<string, unknown> {
  return {
    role: "assistant",
    toolCallId: params.callId,
    content: [
      { type: "toolcall", id: params.callId, name: params.name, arguments: params.args ?? {} },
    ],
    timestamp: at(params.minutes),
  };
}

/** Live tool-stream projection: the envelope tool-stream.ts hands the thread. */
export function liveToolMessage(params: {
  name: string;
  callId: string;
  args?: unknown;
  partial?: string;
  diffStat?: { added: number; removed: number };
  minutes: number;
}): Record<string, unknown> {
  return {
    role: "assistant",
    toolCallId: params.callId,
    runId: "run-gallery",
    content: [
      { type: "toolcall", id: params.callId, name: params.name, arguments: params.args ?? {} },
      ...(params.partial === undefined
        ? []
        : [{ type: "toolresult", id: params.callId, name: params.name, text: params.partial }]),
    ],
    timestamp: at(params.minutes),
    __openclawToolStreamLive: true,
    __openclawToolStreamResultReceived: false,
    __openclawToolStreamReceivedAt: at(params.minutes),
    ...(params.diffStat ? { __openclawToolStreamDiffStat: params.diffStat } : {}),
  };
}

// ---------------------------------------------------------------------------
// Markdown corpus
// ---------------------------------------------------------------------------

export const MARKDOWN_HEADINGS = `# Heading one — release audit
Body copy directly under an h1, which is how a model usually opens a report.

## Heading two
### Heading three
#### Heading four
##### Heading five (parser drops h5; the text survives)
###### Heading six (same — documented as unsupported)

Paragraph after the heading ladder so the trailing rhythm is visible.`;

export const MARKDOWN_INLINE = `Plain paragraph with **bold**, *italic*, ***bold italic***, ~~struck through~~, \`inline_code()\`, and a very long unbroken token that must not blow the bubble open: \`agents.defaults.model.provider.anthropic.claude-sonnet-4-6-20260514-thinking\`.

A second paragraph with a soft
line break inside it, because the parser runs with \`breaks: true\`.

Emphasis inside a word like intra**word**bold, plus a literal asterisk \\* and a literal underscore \\_.`;

export const MARKDOWN_LISTS = `Unordered, three levels deep:

- Gateway refuses startup only when ingress protection cannot be established
  - config is structurally invalid
  - the owning surface is unknown
    - a SecretRef that resolves to no known capability
    - a channel account with no route
- Otherwise it starts and marks the capability configured-unavailable

Ordered with an explicit start:

7. Freeze the Code SHA
8. Run full release validation
9. Generate the changelog once
   1. review it
   2. dispatch the Release SHA run

Task list:

- [x] Reproduce the failure with the mock gateway
- [x] Land the owner-boundary fix
- [ ] Backport to \`release/2026.8.4\`
- [ ] Close the duplicate issues

Tight list immediately followed by a paragraph with no blank line separation.`;

export const MARKDOWN_QUOTES = `> A single-level quote carrying the reporter's words verbatim.

> Outer quote.
>
> > Nested quote with \`inline code\` and a [link](https://docs.openclaw.ai/gateway).
> >
> > > Third level, which is where the left rail spacing usually breaks.

> Quote containing a list:
>
> - first
> - second`;

export const MARKDOWN_TABLE = `| Surface | Owner | Maturity | Last audit | Notes |
| --- | --- | --- | --- | --- |
| \`src/gateway/**\` | core | M5 | 2026-08-11 | Ingress protection is fail-closed |
| \`src/channels/telegram\` | plugin | M4 | 2026-08-09 | Transport-only after the command-tree move |
| \`extensions/codex\` | plugin | M3 | 2026-07-28 | Harness pinned to the vendored protocol build |
| \`ui/src/pages/chat\` | core | M4 | 2026-08-14 | Transcript virtualization landed this train |
| \`packages/gateway-protocol\` | core | M5 | 2026-08-02 | Additive-only until the next version bump |

A deliberately wide table follows, so horizontal overflow inside a bubble is visible:

| id | session key | provider | model | tokens in | tokens out | started | finished | outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run-8842 | agent:main:release-audit | anthropic | claude-sonnet-4-6 | 184203 | 9122 | 2026-08-15T08:41:02Z | 2026-08-15T08:44:19Z | completed |
| run-8843 | agent:main:telegram-repair | openai | gpt-5.6-luna | 76410 | 15330 | 2026-08-15T08:45:00Z | 2026-08-15T08:52:31Z | timeout |
| run-8844 | agent:swarm:worker-3 | anthropic | claude-opus-5 | 402118 | 33027 | 2026-08-15T08:52:40Z | — | cancelled |`;

export const MARKDOWN_LINKS = `External link: [OpenClaw docs](https://docs.openclaw.ai/gateway/ingress).

Bare autolink: https://github.com/openclaw/openclaw/pull/124328

A \`www.\` autolink with trailing punctuation: www.example.com/path?q=1.

GitHub item link that gets compacted: https://github.com/openclaw/openclaw/issues/124274

Mail link: <maintainers@openclaw.ai>

Workspace file references the transcript turns into openable chips: \`ui/src/pages/chat/components/chat-thread.ts\`, \`src/gateway/ingress.ts:184\`, and README.md.

A refused scheme keeps its label but loses the anchor: [click me](javascript:alert(1)).

Docs shortlink: [/telegram](/telegram).`;

export const MARKDOWN_MEDIA = `A remote image, which a chat message renders as a placeholder rather than loading:

![Release validation matrix](https://openclaw.ai/assets/release-matrix.png)

A deliberately broken remote image:

![Missing screenshot](https://127.0.0.1:9/does-not-exist.png)

An inline data-URI image, which does render:

![Green swatch](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iODAiPjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iODAiIGZpbGw9IiMyZWE0M2YiLz48dGV4dCB4PSIxNiIgeT0iNDgiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMiI+aW5saW5lIGRhdGEgVVJJPC90ZXh0Pjwvc3ZnPg==)

---

Horizontal rule above this line.`;

export const MARKDOWN_UNSUPPORTED = `Footnote reference[^1] — the parser has no footnote plugin, so the marker stays literal.

[^1]: This definition renders as a paragraph rather than a footnote.

Inline math $E = mc^2$ and a display block:

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

A mermaid fence, which renders as a plain code block:

\`\`\`mermaid
graph TD
  A[Gateway] --> B{SecretRef resolves?}
  B -->|yes| C[Capability available]
  B -->|no| D[configured-unavailable]
\`\`\`

Raw HTML is escaped rather than executed:

<div style="color:red">raw html block</div>
<script>alert("xss")</script>`;

export const MARKDOWN_DETAILS = `Model-authored disclosure, which is a real \`<details>\` element rather than escaped HTML:

<details>
<summary>Why the pairing token expired</summary>

The pairing store writes \`expiresAt\` at issue time and the Gateway refuses
anything past it. The device retried after the window closed.

- issued: 2026-08-15T08:26:11Z
- expires: 2026-08-15T08:41:11Z
- retried: 2026-08-15T08:44:02Z

</details>

<details open>
<summary>Already expanded on arrival</summary>

A disclosure that ships open, nested inside it another one:

<details>
<summary>Nested level two</summary>

Innermost body.

</details>

</details>`;

export const CODE_TYPESCRIPT = `Here is the owner boundary as it stands on \`main\`:

\`\`\`typescript
/** Resolves the transcript row that owns a persisted reply target. */
export function resolveReplyTarget(
  messages: readonly NormalizedMessage[],
  replyToId: string | null,
): NormalizedMessage | null {
  if (!replyToId) {
    return null;
  }
  // Reply previews resolve against loaded history only; an unloaded source is
  // hydrated by the caller so the transcript never inserts a phantom row.
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (candidate?.id === replyToId) {
      return candidate;
    }
  }
  return null;
}
\`\`\``;

export const CODE_BASH = `\`\`\`bash
# Reproduce against the mock gateway rather than the operator's instance
OPENCLAW_STATE_DIR="$(mktemp -d)" \\
  node --import tsx scripts/control-ui-mock-dev.ts -- --host 127.0.0.1 --port 5197

node scripts/run-vitest.mjs ui/src/pages/chat/components/chat-transcript-render.test.ts
\`\`\``;

export const CODE_NO_LANGUAGE = `A fence with no language, which falls back to auto-detection:

\`\`\`
Error: ENOENT: no such file or directory, open '/Users/operator/.openclaw/credentials/telegram.json'
    at Object.openSync (node:fs:596:3)
    at readFileSync (node:fs:464:35)
    at loadChannelCredentials (src/channels/credentials.ts:88:22)
    at async startTelegramChannel (src/channels/telegram/start.ts:41:20)
\`\`\``;

export const CODE_UNKNOWN_LANGUAGE = `A language the bundled highlighter does not register, so it renders unhighlighted:

\`\`\`ruby
class PairingToken
  def initialize(device_id, expires_at)
    @device_id = device_id
    @expires_at = expires_at
  end

  def expired?(now = Time.now)
    now > @expires_at
  end
end
\`\`\``;

export const CODE_DIFF = `\`\`\`diff
--- a/src/gateway/pairing-store.ts
+++ b/src/gateway/pairing-store.ts
@@ -41,9 +41,12 @@ export function readPairingToken(db: Kysely<Schema>, deviceId: string) {
-  return row ?? null;
+  if (!row) {
+    return null;
+  }
+  // Expiry is authoritative at the store, not at each caller: three call
+  // sites previously re-derived it and two of them drifted.
+  return row.expiresAt > Date.now() ? row : null;
 }
\`\`\``;

function jsonLine(index: number): string {
  return `    { "id": "run-${8800 + index}", "status": "${
    index % 4 === 0 ? "failed" : "completed"
  }", "durationMs": ${1200 + index * 37} }`;
}

export const CODE_LONG_JSON = `A JSON payload past the collapse threshold, so it arrives folded:

\`\`\`json
{
  "generatedAt": "2026-08-15T08:59:00.000Z",
  "runs": [
${Array.from({ length: 48 }, (_value, index) => jsonLine(index)).join(",\n")}
  ]
}
\`\`\``;

export const CODE_WIDE = `A line far past the bubble width, which must scroll rather than wrap:

\`\`\`typescript
const resolved = await resolveProviderRuntime({ providerId: "anthropic", modelRef: "claude-sonnet-4-6-20260514", capabilityFamily: "chat", attachmentClass: "image", channelId: "telegram", target: "dm:1188432", sessionKey: "agent:main:release-audit" });
\`\`\``;

export const LONG_MONOLOGUE = `I went through the whole pairing path rather than the reported symptom, and the short answer is that the expiry check lived in three places instead of one.

## What actually happens

The Gateway receives a pairing request, looks the device up in the pairing store, and hands the row to the channel adapter. The store returned the row unconditionally; each caller then decided for itself whether the row was still valid. Two of the three callers compared against \`Date.now()\`, the third compared against the request timestamp carried in the envelope. When the two clocks disagreed by more than the pairing window, the request was accepted by one path and refused by another, and nothing recorded which path had run.

## Why it looked intermittent

The operator only saw it when a device retried across the expiry boundary. Inside the window every path agreed, so the bug stayed invisible for the whole beta train.

## The repair

Expiry belongs to the store, because the store owns the lifecycle of the row. \`readPairingToken\` now returns \`null\` for an expired row and the three caller-side checks are gone. That is a net negative production diff: one guard added at the owner, three removed at the consumers, plus the dead \`isPairingTokenExpired\` helper the middle caller used.

## What I checked besides the reported path

- the Telegram and Discord adapters, which share the same store call
- the device-pairing CLI flow, which reads the same rows through \`openclaw devices\`
- \`openclaw doctor --fix\`, which rewrites stale rows and previously relied on the consumer-side check
- the migration that introduced \`expiresAt\`, to confirm no shipped row can carry a null there

The regression test drives the store directly at a timestamp past the window and fails on pre-fix code because the row still comes back.`;
