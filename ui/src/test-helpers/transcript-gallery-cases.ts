// Text-shaped transcript artifacts: bubble anatomy, conversation rhythm, the
// markdown surface, and code blocks. Tool and session artifacts live in the
// sibling case modules.
import {
  CODE_BASH,
  CODE_DIFF,
  CODE_LONG_JSON,
  CODE_NO_LANGUAGE,
  CODE_TYPESCRIPT,
  CODE_UNKNOWN_LANGUAGE,
  CODE_WIDE,
  LONG_MONOLOGUE,
  MARKDOWN_DETAILS,
  MARKDOWN_HEADINGS,
  MARKDOWN_INLINE,
  MARKDOWN_LINKS,
  MARKDOWN_LISTS,
  MARKDOWN_MEDIA,
  MARKDOWN_QUOTES,
  MARKDOWN_TABLE,
  MARKDOWN_UNSUPPORTED,
  type GallerySection,
  assistant,
  user,
  type TranscriptCase,
} from "./transcript-gallery-content.ts";

const BUBBLE_CASES: readonly TranscriptCase[] = [
  {
    id: "bubbles-alternating",
    title: "Alternating turns",
    note: "Baseline rhythm: user turn, assistant turn, repeated. Watch the gap between speakers.",
    props: {
      messages: [
        user("Why is the gateway refusing the pairing request?", 0),
        assistant(
          "The request carries a device id the Gateway has never seen, so pairing fails closed. Let me check the pairing store.",
          1,
        ),
        user("Check the credentials directory too.", 2),
        assistant(
          "Credentials are intact — the pairing token expired 15 minutes ago, which is why the handshake is rejected.",
          3,
        ),
      ],
    },
  },
  {
    id: "bubbles-consecutive",
    title: "Consecutive same-speaker turns",
    note: "Three assistant messages in a row, then three user messages. Grouping suppresses the repeated identity slot; the corner treatment and the intra-group gap are the polish target.",
    props: {
      messages: [
        user("Give me the state of the release train.", 0),
        assistant("Code SHA validation is green.", 1),
        assistant("The changelog is generated and reviewed.", 2),
        assistant("The Release SHA run is queued behind one npm preflight job.", 3),
        user("And the backports?", 4),
        user("Only the two you selected, right?", 5),
        user("Do not pick up anything else from main.", 6),
        assistant("Correct — only the two selected commits are on the release branch.", 7),
      ],
    },
  },
  {
    id: "bubbles-monologue",
    title: "Long assistant monologue",
    note: "A full report in one bubble: headings, sections, and lists inside a single turn. Reading rhythm and bubble max-width are the concern here.",
    stage: "tall",
    props: {
      messages: [
        user("Explain the pairing bug and what you actually checked.", 0),
        assistant(LONG_MONOLOGUE, 1),
      ],
    },
  },
  {
    id: "bubbles-oneliners",
    title: "One-liner exchange",
    note: "Short turns back to back. The vertical rhythm dominates when no bubble carries weight.",
    stage: "short",
    props: {
      messages: [
        user("Ready?", 0),
        assistant("Yes.", 1),
        user("Ship it.", 2),
        assistant("Pushed.", 3),
        user("Thanks.", 4),
      ],
    },
  },
  {
    id: "bubbles-reply",
    title: "Reply preview",
    note: "A user turn that replies to an earlier assistant message; the preview chip resolves against loaded history.",
    props: {
      messages: [
        assistant(
          "The pairing token expired 15 minutes before the retry, so the handshake was refused.",
          0,
          { __openclaw: { id: "source-message" } },
        ),
        user("Fifteen minutes? The window is supposed to be an hour.", 1, {
          __openclaw: { id: "reply-message", replyToId: "source-message" },
        }),
        assistant("The window is 15 minutes in config; the docs page is stale.", 2),
      ],
    },
  },
];

const MARKDOWN_CASES: readonly TranscriptCase[] = [
  {
    id: "md-headings",
    title: "Heading ladder h1–h6",
    note: "h1–h4 are allowlisted; h5 and h6 are stripped by the sanitizer and only their text survives. That gap is visible here on purpose.",
    props: { messages: [user("Show me the heading ladder.", 0), assistant(MARKDOWN_HEADINGS, 1)] },
  },
  {
    id: "md-inline",
    title: "Inline emphasis and long tokens",
    note: "Bold, italic, strikethrough, inline code, escapes, soft breaks, plus an unbreakable identifier that stresses bubble wrapping.",
    props: { messages: [user("Inline formatting.", 0), assistant(MARKDOWN_INLINE, 1)] },
  },
  {
    id: "md-lists",
    title: "Lists, nesting, task lists",
    note: "Unordered three deep, ordered with an explicit start, and a read-only task list (checkboxes are disabled by design).",
    stage: "tall",
    props: { messages: [user("Every list shape.", 0), assistant(MARKDOWN_LISTS, 1)] },
  },
  {
    id: "md-quotes",
    title: "Blockquotes",
    note: "One, two, and three levels deep, plus a quote wrapping a list.",
    props: { messages: [user("Quote nesting.", 0), assistant(MARKDOWN_QUOTES, 1)] },
  },
  {
    id: "md-tables",
    title: "Tables",
    note: "A readable table followed by one wide enough to force horizontal overflow inside the bubble.",
    stage: "tall",
    props: { messages: [user("Table rendering.", 0), assistant(MARKDOWN_TABLE, 1)] },
  },
  {
    id: "md-links",
    title: "Links, file chips, GitHub marks",
    note: "External links, bare autolinks, a GitHub item link (hover it for the hovercard), workspace file chips, a refused javascript: scheme, and a docs shortlink.",
    props: { messages: [user("Link handling.", 0), assistant(MARKDOWN_LINKS, 1)] },
  },
  {
    id: "md-media",
    title: "Images and rules",
    note: "Remote images become placeholders inside a chat message; a data-URI image renders inline; one URL is deliberately unreachable.",
    props: { messages: [user("Images in markdown.", 0), assistant(MARKDOWN_MEDIA, 1)] },
  },
  {
    id: "md-details",
    title: "Disclosure blocks",
    note: "Model-authored <details>, one closed, one shipped open with a nested disclosure inside it.",
    props: { messages: [user("Collapsible sections.", 0), assistant(MARKDOWN_DETAILS, 1)] },
  },
  {
    id: "md-unsupported",
    title: "Unsupported syntax, as it lands",
    note: "Footnotes, math, and mermaid have no plugin, and raw HTML is escaped. Documented here as-is so the fallbacks can be judged rather than assumed.",
    stage: "tall",
    props: {
      messages: [
        user("What happens to unsupported syntax?", 0),
        assistant(MARKDOWN_UNSUPPORTED, 1),
      ],
    },
  },
];

const CODE_CASES: readonly TranscriptCase[] = [
  {
    id: "code-highlighted",
    title: "Fenced code with language",
    note: "TypeScript and bash: language label, copy affordance, and highlighting from the registered language set.",
    stage: "tall",
    props: {
      messages: [
        user("Show me the helper.", 0),
        assistant(CODE_TYPESCRIPT, 1),
        assistant(CODE_BASH, 2),
      ],
    },
  },
  {
    id: "code-fallbacks",
    title: "No language and unregistered language",
    note: "An unlabelled fence goes through auto-detection; Ruby is not in the bundled highlighter build, so it renders plain.",
    stage: "tall",
    props: {
      messages: [
        user("What about fences without a usable language?", 0),
        assistant(CODE_NO_LANGUAGE, 1),
        assistant(CODE_UNKNOWN_LANGUAGE, 2),
      ],
    },
  },
  {
    id: "code-diff-fence",
    title: "Diff fence",
    note: "A unified diff pasted as a fenced block — distinct from the structured diff a tool card renders.",
    props: { messages: [user("Paste the patch.", 0), assistant(CODE_DIFF, 1)] },
  },
  {
    id: "code-long-json",
    title: "Long JSON, collapsed",
    note: "JSON past the 40-line threshold arrives folded behind a summary row that keeps its own copy button.",
    props: { messages: [user("Dump the run index.", 0), assistant(CODE_LONG_JSON, 1)] },
  },
  {
    id: "code-wide",
    title: "Overflowing code line",
    note: "A single line far wider than the bubble. It must scroll inside the block without widening the transcript.",
    stage: "short",
    props: { messages: [user("One long line.", 0), assistant(CODE_WIDE, 1)] },
  },
  {
    id: "code-user-turn",
    title: "Code inside a user turn",
    note: "User messages render code with the copy chrome suppressed. Same fence, different treatment.",
    props: {
      messages: [
        user(
          `Here is what I ran:\n\n\`\`\`bash\npnpm openclaw doctor --fix\n\`\`\`\n\nand it still refuses to start.`,
          0,
        ),
        assistant(
          "Doctor repairs config; the refusal is coming from ingress protection instead.",
          1,
        ),
      ],
    },
  },
];

export const TEXT_SECTIONS: readonly GallerySection[] = [
  {
    id: "bubbles",
    title: "Bubbles and conversation rhythm",
    short: "Bubbles",
    note: "Turn containers, identity slots, grouping, and the spacing the real projection produces. Every case is a conversation, not an isolated sample.",
    cases: BUBBLE_CASES,
  },
  {
    id: "markdown",
    title: "Markdown surface",
    short: "Markdown",
    note: "Everything the transcript parser accepts, plus the syntax it deliberately does not, shown as it actually lands.",
    cases: MARKDOWN_CASES,
  },
  {
    id: "code",
    title: "Code blocks",
    short: "Code",
    note: "Language labels, copy affordance, highlighting coverage, collapse behavior, and overflow.",
    cases: CODE_CASES,
  },
];
