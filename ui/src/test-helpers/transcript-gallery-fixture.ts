// Standalone harness page rendering every artifact that can appear inside a
// Control UI chat transcript, so the operator can polish them one by one in
// both themes without driving a live session into each state.
//
// Artifacts render through the real transcript pipeline (renderChatThread over
// ChatThreadProps) rather than reconstructed markup: a second copy of the
// bubble, grouping, and tool-card markup would drift from production within a
// release, and conversation rhythm only exists in the real projection.
import { html, render, type TemplateResult } from "lit";
import { OpenClawLightDomElement } from "../lit/openclaw-element.ts";
import { renderChatThread } from "../pages/chat/components/chat-thread.ts";
import { ChatTranscriptController } from "../pages/chat/components/chat-transcript-controller.ts";
import { SESSION_SECTIONS } from "./transcript-gallery-cases-session.ts";
import { SURFACE_SECTIONS } from "./transcript-gallery-cases-surfaces.ts";
import { TOOL_SECTIONS } from "./transcript-gallery-cases-tools.ts";
import { TEXT_SECTIONS } from "./transcript-gallery-cases.ts";
import type { GallerySection, TranscriptCase } from "./transcript-gallery-content.ts";
// The fixture renders outside the app shell, so it loads the app stylesheet
// itself (Web Awesome theme included) plus the chat sheets the chat route
// imports lazily — without them every bubble, tool card, and notice is
// theme-less.
import "../styles.css";
import "../styles/chat.css";
// GitHub links inside a transcript only raise a hovercard under this provider,
// so the gallery mounts it the way app-root does.
import "../components/github-link-hovercard-registration.ts";

const THEME_STORAGE_KEY = "openclaw-transcript-gallery-theme";

const SECTIONS: readonly GallerySection[] = [
  ...TEXT_SECTIONS,
  ...TOOL_SECTIONS,
  ...SESSION_SECTIONS,
  ...SURFACE_SECTIONS,
];

function applyTheme(mode: "dark" | "light") {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.themeMode = mode;
  root.classList.toggle("wa-light", mode === "light");
  root.classList.toggle("wa-dark", mode === "dark");
  root.style.colorScheme = mode;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

/**
 * The session-list row the chat pane always has in production. Without it the
 * projection reads reasoningLevel as "off" (reasoning blocks vanish) and
 * contextTokens as null (the footer meta popover loses its context share), so
 * a gallery passing `sessions: null` renders a thinner transcript than any
 * real session ever does.
 */
function sessionsFor(sessionKey: string): Record<string, unknown> {
  const ts = Date.parse("2026-08-15T09:10:00.000Z");
  return {
    ts,
    path: "",
    count: 1,
    defaults: { contextTokens: 200_000, model: "gpt-5.6-luna", modelProvider: "openai" },
    sessions: [
      {
        key: sessionKey,
        kind: "direct",
        label: "Pairing audit",
        displayName: "Pairing audit",
        agentId: "main",
        model: "claude-opus-5",
        modelProvider: "anthropic",
        status: "done",
        contextTokens: 200_000,
        totalTokens: 186_400,
        reasoningLevel: "medium",
        hasActiveRun: false,
        updatedAt: ts,
      },
    ],
  };
}

/**
 * Callbacks the chat pane always supplies. Their mere presence is what turns on
 * visible affordances — the reply and rewind buttons, the image lightbox
 * trigger, and the checkpoints action on a compaction divider all render only
 * when their handler exists. A gallery that omitted them would show a
 * quieter transcript than production and mislead every polish decision.
 */
function transcriptCallbacks(requestUpdate: () => void): Record<string, unknown> {
  return {
    onDraftChange: () => undefined,
    onSend: () => undefined,
    onRequestUpdate: requestUpdate,
    onSetReply: () => undefined,
    onRewindMessage: () => true,
    onForkMessage: () => undefined,
    onFocusComposer: () => undefined,
    onOpenSidebar: () => undefined,
    onOpenWorkspaceFile: () => undefined,
    onOpenSessionCheckpoints: () => undefined,
    onOpenSession: () => undefined,
    onAssistantAttachmentLoaded: () => undefined,
    onRequestOpenImage: () => 0,
    onOpenImage: () => undefined,
  };
}

/** The minimum ChatThreadProps a case must supply; every case overrides part. */
function threadProps(entry: TranscriptCase, requestUpdate: () => void): Record<string, unknown> {
  const sessionKey = (entry.props?.sessionKey as string | undefined) ?? `agent:main:${entry.id}`;
  return {
    paneId: `gallery-${entry.id}`,
    sessionKey,
    basePath: "",
    localMediaPreviewRoots: [],
    loading: false,
    messages: [],
    toolMessages: [],
    streamSegments: [],
    stream: null,
    streamStartedAt: null,
    queue: [],
    showThinking: true,
    showToolCalls: true,
    sessions: sessionsFor(sessionKey),
    assistantName: "Molty",
    assistantAvatar: null,
    // The Control UI always knows who is signed in, and the projection keys the
    // avatar gutter off it: with userId absent every agent-solo key classifies
    // as a direct thread, which hides avatars and widens the column. Omitting
    // it is what made this gallery diverge from the real transcript.
    userId: "profile-operator",
    userName: "Riley",
    userAvatar: null,
    // Each stage is its own log region; announcing 20 of them at once would
    // make the page unusable with a screen reader.
    announceTranscript: false,
    ...transcriptCallbacks(requestUpdate),
    ...entry.props,
  };
}

class OpenClawTranscriptGallery extends OpenClawLightDomElement {
  // Controllers are built before the first render: Lit only drives
  // hostConnected/hostUpdated for controllers registered by connectedCallback,
  // and the transcript virtualizer measures its scrollport from those hooks.
  private readonly transcripts = new Map<string, ChatTranscriptController>(
    SECTIONS.flatMap((section) =>
      section.cases
        .filter((entry) => entry.render === undefined)
        .map((entry) => [entry.id, new ChatTranscriptController(this)] as const),
    ),
  );

  private transcriptFor(entry: TranscriptCase): ChatTranscriptController {
    const controller = this.transcripts.get(entry.id);
    if (!controller) {
      throw new Error(`transcript gallery case is missing a controller: ${entry.id}`);
    }
    return controller;
  }

  private renderStage(entry: TranscriptCase): TemplateResult {
    const stageClass = entry.stage ? ` tg__stage--${entry.stage}` : "";
    return html`
      <div class="tg__stage${stageClass}">
        <div class="chat">
          ${entry.render
            ? entry.render()
            : renderChatThread(
                threadProps(entry, () => this.requestUpdate()) as never,
                this.transcriptFor(entry),
              )}
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    return html`
      <openclaw-github-link-hovercard-provider>
        <div class="tg__bar">
          <div class="tg__bar-inner">
            <strong class="tg__bar-title">Transcript artifacts</strong>
            <nav class="tg__bar-nav" aria-label="Artifact families">
              ${SECTIONS.map((section) => html`<a href="#${section.id}">${section.short}</a>`)}
            </nav>
            <div class="tg__themes">
              <button type="button" @click=${() => applyTheme("light")}>Light</button>
              <button type="button" @click=${() => applyTheme("dark")}>Dark</button>
            </div>
          </div>
        </div>
        <header class="tg__head">
          <div>
            <p class="tg__eyebrow">Control UI</p>
            <h1>Transcript artifacts</h1>
            <p>
              Every artifact that can render inside a chat transcript, in production shapes and
              through the real transcript renderer. Tool rows, disclosures, and players are live —
              click and hover them.
            </p>
          </div>
        </header>
        <nav class="tg__index" aria-label="Every artifact case">
          ${SECTIONS.flatMap((section) =>
            section.cases.map(
              (entry) => html` <a href="#${entry.id}">${entry.title}<i>${section.title}</i></a> `,
            ),
          )}
        </nav>
        ${SECTIONS.map(
          (section) => html`
            <section class="tg__section" id=${section.id}>
              <h2>${section.title}</h2>
              <p class="tg__hint">${section.note}</p>
              ${section.cases.map(
                (entry) => html`
                  <article class="tg__case" id=${entry.id}>
                    <h3>${entry.title}<code>#${entry.id}</code></h3>
                    <p class="tg__hint">${entry.note}</p>
                    ${this.renderStage(entry)}
                  </article>
                `,
              )}
            </section>
          `,
        )}
      </openclaw-github-link-hovercard-provider>
    `;
  }
}

if (!customElements.get("openclaw-transcript-gallery")) {
  customElements.define("openclaw-transcript-gallery", OpenClawTranscriptGallery);
}

const mount = document.querySelector<HTMLElement>("#app");
if (mount) {
  render(html`<openclaw-transcript-gallery></openclaw-transcript-gallery>`, mount);
}
