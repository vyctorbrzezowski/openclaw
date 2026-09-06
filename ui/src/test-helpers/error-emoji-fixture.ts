import { html } from "lit";
import { state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../lit/openclaw-element.ts";
import { renderChatComposerNotices } from "../pages/chat/chat-view-notices.ts";
import "../styles.css";
import "../styles/chat.css";
import "./error-emoji-fixture.css";

type InventoryEntry = {
  text: string;
  source: string;
  owner: "gateway" | "runtime/provider" | "plugin" | "channel" | "ui";
  webui: string;
  semantic?: boolean;
};

export const ERROR_EMOJI_INVENTORY: readonly InventoryEntry[] = [
  { text: "⚠️ API rate limit reached. Please try again later.", source: "src/agents/failover/user-copy.ts:36", owner: "runtime/provider", webui: "card: live event strips only ⚠️; sessions.list recovery preserves it" },
  { text: "⚠️ Selected model is at capacity. Try a different model, or wait and retry.", source: "src/agents/failover/user-copy.ts:42", owner: "runtime/provider", webui: "card via lifecycle error / lastRunError" },
  { text: "⚠️ The model request was rate-limited. Please try again in a few minutes.", source: "src/agents/failover/user-copy.ts:46", owner: "runtime/provider", webui: "card via error reply and lifecycle" },
  { text: "⚠️ OpenAI (gpt-5.6-sol) returned a billing error — check your account for subscription or usage limits, then try again.", source: "src/agents/failover/user-copy.ts:74", owner: "runtime/provider", webui: "card via error reply and lifecycle" },
  { text: "⚠️ API provider returned a billing error — check your account for subscription or usage limits, then try again.", source: "src/agents/failover/user-copy.ts:75", owner: "runtime/provider", webui: "card via error reply and lifecycle" },
  { text: "⚠️ OpenAI (gpt-5.6-sol) returned a billing error — your API key has run out of credits or has an insufficient balance. Check your OpenAI billing dashboard and top up or switch to a different API key.", source: "src/agents/failover/user-copy.ts:78", owner: "runtime/provider", webui: "card via error reply and lifecycle" },
  { text: "⚠️ API provider returned a billing error — your API key has run out of credits or has an insufficient balance. Check your provider's billing dashboard and top up or switch to a different API key.", source: "src/agents/failover/user-copy.ts:79", owner: "runtime/provider", webui: "card via error reply and lifecycle" },
  { text: "⚠️ Too many requests; retry in 30 seconds.", source: "src/agents/failover/user-copy.ts:117", owner: "runtime/provider", webui: "card; bounded provider rate-limit text gets a warning prefix" },
  { text: "⚠️ Something went wrong while processing your request. Please try again, or use /new to start a fresh session.", source: "src/agents/failover/user-copy.ts:358", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Heartbeat check failed before it could produce an update. The main chat session remains available.", source: "src/agents/failover/user-copy.ts:360", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ The model provider rejected the conversation state. Please try again, or use /new to start a fresh session.", source: "src/agents/failover/user-copy.ts:362", owner: "runtime/provider", webui: "card via provider request failure" },
  { text: "⚠️ The model provider returned HTTP 429 before replying. This can mean rate limiting, exhausted quota, or an account balance/billing issue. Check the selected provider/model, API key, and provider billing/quota dashboard, then try again.", source: "src/agents/failover/user-copy.ts:364", owner: "runtime/provider", webui: "card via provider request failure" },
  { text: "⚠️ The model provider returned a temporary internal error before replying. Try again in a moment, or switch to another model if it keeps happening.", source: "src/agents/failover/user-copy.ts:366", owner: "runtime/provider", webui: "card via provider request failure" },
  { text: "⚠️ Authentication failed (provider returned HTTP 401). Your provider token may have expired — try the request again in a moment. If the failure persists, re-authenticate this provider.", source: "src/agents/failover/user-copy.ts:367", owner: "runtime/provider", webui: "card via provider request failure" },
  { text: "⚠️ The configured model is unavailable from the provider — it may have been renamed, retired, or is not offered on this account. This needs a config update (agents.defaults.model); retrying or starting a new session won't fix it.", source: "src/agents/failover/user-copy.ts:369", owner: "runtime/provider", webui: "card via provider request failure" },
  { text: "⚠️ Rate-limited — ready in ~30s. Please wait a moment.", source: "src/agents/failover/user-copy.ts:504", owner: "runtime/provider", webui: "card via exhausted failover reply" },
  { text: "⚠️ Rate-limited — ready in ~3 min. Please try again shortly.", source: "src/agents/failover/user-copy.ts:505", owner: "runtime/provider", webui: "card via exhausted failover reply" },
  { text: "⚠️ All attempted models were rate-limited or overloaded. Please try again in a few minutes.", source: "src/agents/failover/user-copy.ts:512", owner: "runtime/provider", webui: "card via exhausted failover reply" },
  { text: "⚠️ Missing API key for OpenAI on the gateway. Use `openai/gpt-5.6-sol` with the OpenAI OAuth profile, or set `OPENAI_API_KEY` for direct OpenAI API-key runs.", source: "src/agents/failover/user-copy.ts:554", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Missing API key for provider \"openai\". Run `openclaw doctor --fix` to repair stale OpenAI model/session routes, restart the gateway if doctor asks, then try again. If doctor has nothing to repair or the error persists, re-auth with `openclaw models auth login --provider openai` or run `openclaw configure`.", source: "src/agents/failover/user-copy.ts:557", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Missing API key for provider \"anthropic\". Configure the gateway auth for that provider, then try again.", source: "src/agents/failover/user-copy.ts:560", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Missing API key for the selected provider on the gateway. Configure provider auth, then try again.", source: "src/agents/failover/user-copy.ts:561", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ CLI subprocess: no output for 30s, so the no-output watchdog stopped it. This is separate from the overall agent timeout; the gateway is unaffected. Check for an interactive prompt. The CLI backend openai produced no output before its watchdog expired.", source: "src/agents/failover/user-copy.ts:607", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ CLI turn: timed out after 120s (overall turn limit). The gateway is unaffected. For long work, use a detached OpenClaw sub-agent (no run timeout by default), or raise `agents.defaults.timeoutSeconds`.", source: "src/agents/failover/user-copy.ts:608", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Agent failed before reply: model switch could not be completed.\nTo view logs, run `openclaw logs --follow` in a terminal.", source: "src/agents/failover/user-copy.ts:699", owner: "runtime/provider", webui: "card; Control UI-specific failure copy" },
  { text: "⚠️ This Codex session changed before your message could run. Please send it again.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:142", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Codex app-server connection closed before this turn finished. OpenClaw retried once when the stdio turn was still replay-safe; please try again if this keeps happening.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:145", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Codex app-server stopped before confirming turn completion. OpenClaw did not replay the turn automatically because it may still be active; try again, or use /new if the session stays stuck.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:148", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Context is too large and auto-compaction timed out before it could finish. Try again, use /compact, or use /new to start a fresh session.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:171", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Context is too large and auto-compaction could not recover this turn. Try again, use /compact, or use /new to start a fresh session.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:172", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Agent failed before reply: provider failed. Please try again, or use /new to start a fresh session.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:201", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Model login expired on the gateway for openai. Re-auth with `openclaw models auth login --provider openai` in a terminal, then try again.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:241", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Model login failed on the gateway for openai. Please try again. If this keeps happening, re-auth with `openclaw models auth login --provider openai` in a terminal.", source: "src/auto-reply/reply/agent-runner-failure-reply.ts:247", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ Context overflow — prompt too large for this model. Try a shorter message or a larger-context model.", source: "src/auto-reply/reply/agent-runner-error-handler.ts:501", owner: "runtime/provider", webui: "card via marked error reply" },
  { text: "⚠️ This turn was interrupted because it stopped making progress. Please try again.", source: "src/auto-reply/reply/dispatch-from-config.prepare-context.ts:482", owner: "runtime/provider", webui: "chat reply; can be returned as an error payload" },
  { text: "⚠️ Previous run is still shutting down. Please try again in a moment.", source: "src/auto-reply/reply/get-reply-run-queue.ts:13", owner: "runtime/provider", webui: "chat reply; queue admission warning" },
  { text: "⚠️ Gateway is restarting. Please wait a few seconds and try again.", source: "src/auto-reply/reply/reply-operation-abort.ts:12; src/auto-reply/reply/agent-runner-core.ts:49", owner: "gateway", webui: "card when marked as run failure; otherwise chat reply" },
  { text: "⚠️ Memory maintenance temporarily failed; continuing your reply.", source: "src/auto-reply/reply/compaction-notice.ts:19", owner: "runtime/provider", webui: "chat transcript notice, not run-error card" },
  { text: "⚠️ Memory flush failed after 3 attempts; skipping for this cycle. It will retry after the next compaction.", source: "src/auto-reply/reply/agent-runner-memory.ts:1697", owner: "runtime/provider", webui: "chat transcript warning" },
  { text: "⚠️ Agent couldn't generate a response. Note: some tool actions may have already been executed — please verify before retrying.", source: "src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:131", owner: "runtime/provider", webui: "error reply; transcript and terminal card paths" },
  { text: "⚠️ Agent couldn't generate a response. Please try again.", source: "src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:148", owner: "runtime/provider", webui: "error reply; transcript and terminal card paths" },
  { text: "⚠️ Turn yielded without a continuation source. Send a message to resume.", source: "src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:241", owner: "runtime/provider", webui: "chat transcript warning" },
  { text: "⚠️ Reply truncated at the model's output token limit. The text above is partial — ask to continue it.", source: "src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:244", owner: "runtime/provider", webui: "chat transcript warning" },
  { text: "⚠️ 🛠️ Exec failed (exit 1): command failed.", source: "src/agents/embedded-agent-runner/run/tool-error-warning.ts:44-73", owner: "runtime/provider", webui: "chat transcript warning; parser-recognized tool category", semantic: true },
  { text: "⚠️ ✉️ Message failed: delivery unavailable", source: "src/agents/embedded-agent-runner/run/tool-error-warning.ts:66-73; src/agents/tool-display-message-config.ts:9", owner: "runtime/provider", webui: "chat transcript warning; parser-recognized delivery category", semantic: true },
  { text: "⚠️ I couldn't reach the configured model backend openai/gpt-5.6-sol. Fallback used anthropic/claude-sonnet-4-6, but it produced no visible reply.", source: "src/auto-reply/reply/agent-runner-core.ts:97", owner: "runtime/provider", webui: "error reply (`isError: true`)" },
  { text: "⚠️ LLM connection failed. This could be due to server issues, network problems, or context length exceeded (e.g., with local LLMs like LM Studio). Original error:\n```\nConnection closed\n```", source: "src/auto-reply/reply/agent-runner-utils.ts:200", owner: "runtime/provider", webui: "error reply when Bun socket failure is surfaced" },
  { text: "⚠️ This command requires authorization.", source: "src/plugins/plugin-command-execution.ts:155; src/plugins/plugin-command-runtime.ts:168", owner: "plugin", webui: "slash-command reply; not a run-error card by itself" },
  { text: "⚠️ This command has invalid gateway scope configuration.", source: "src/plugins/plugin-command-execution.ts:159", owner: "plugin", webui: "slash-command reply; not a run-error card by itself" },
  { text: "⚠️ This command requires gateway scope: operator.admin.", source: "src/plugins/plugin-command-execution.ts:179", owner: "plugin", webui: "slash-command reply; not a run-error card by itself" },
  { text: "⚠️ This command is no longer available after the plugin registry changed. Please try again.", source: "src/plugins/plugin-command-execution.ts:269; src/plugins/plugin-command-runtime.ts:122", owner: "plugin", webui: "slash-command reply; not a run-error card by itself" },
  { text: "⚠️ Plugin \"calendar\" failed to load: module unavailable. Run `openclaw doctor` and check the gateway logs.", source: "src/plugins/plugin-command-runtime.ts:179", owner: "plugin", webui: "slash-command reply; not a run-error card by itself" },
  { text: "⚠️ Command failed. Please try again later.", source: "src/plugins/plugin-command-execution.ts:283", owner: "plugin", webui: "slash-command reply; not a run-error card by itself" },
  { text: "⚠️ Channel-initiated /config writes cannot replace channels, channel roots, or accounts collections. Use a more specific path or gateway operator.admin.", source: "src/channels/plugins/config-write-policy-shared.ts:230", owner: "channel", webui: "possible Web UI slash-command transcript; primarily channel reply" },
  { text: "⚠️ Config writes are disabled for Discord. Set commands.config=true to enable.", source: "src/channels/plugins/config-write-policy-shared.ts:242", owner: "channel", webui: "possible Web UI slash-command transcript; primarily channel reply" },
  { text: "⚠️ Media failed. Try sending a smaller supported file or a different format.", source: "src/channels/plugins/contracts/outbound-payload-testkit.ts:62", owner: "channel", webui: "contract fixture only; no production Web UI path" },
  { text: "⚠️ Couldn't process this message because the session stayed busy. Please try again in a moment.", source: "extensions/discord/src/monitor/message-handler.retry.ts:3", owner: "channel", webui: "Discord delivery only" },
  { text: "⚠️ Command produced no visible reply.", source: "extensions/discord/src/monitor/native-command-reply.ts:22", owner: "channel", webui: "Discord interaction notice only" },
  { text: "⛔ You are not authorized to approve requests.", source: "extensions/discord/src/monitor/exec-approvals.ts:123", owner: "channel", webui: "Discord interaction response only" },
  { text: "❌ Failed to apply openai/gpt-5.6-sol. Try /model openai/gpt-5.6-sol directly.", source: "extensions/discord/src/monitor/native-command-model-picker-apply.ts:78", owner: "channel", webui: "Discord interaction notice only" },
  { text: "⚠️ File too large. Maximum size is 20MB.", source: "extensions/telegram/src/bot-handlers.inbound-processing.ts:283", owner: "channel", webui: "Telegram sendMessage only" },
  { text: "⚠️ Failed to download media. Please try again.", source: "extensions/telegram/src/bot-handlers.inbound-processing.ts:307", owner: "channel", webui: "Telegram sendMessage only" },
  { text: "⚠️ Couldn't process this message, please try again in a moment.", source: "extensions/telegram/src/bot-handlers.inbound-pipeline.ts:268", owner: "channel", webui: "Telegram sendMessage only" },
  { text: "⚠️ Media unavailable.", source: "extensions/whatsapp/src/auto-reply/deliver-reply.ts:391", owner: "channel", webui: "WhatsApp reply only" },
  { text: "⚠️ Media failed.", source: "extensions/whatsapp/src/auto-reply/deliver-reply.ts:398", owner: "channel", webui: "WhatsApp reply only" },
  { text: "⚠️ This reply completed without visible content. The turn may have been interrupted; please retry or ask me to recover from recent context.", source: "extensions/feishu/src/reply-dispatcher.ts:86", owner: "channel", webui: "Feishu reply only" },
  { text: "⚠️ Failed to initialize the configured ACP session for this Feishu conversation: runtime unavailable", source: "extensions/feishu/src/bot.ts:950", owner: "channel", webui: "Feishu reply only" },
  { text: "⚠️ Something went wrong. Please try again.", source: "extensions/msteams/src/monitor-handler/inbound-dispatch.ts:334", owner: "channel", webui: "Microsoft Teams activity only" },
  { text: "⚠️ Security Warning: Multiple users are sharing a DM session with this bot. This can leak conversation context between users.\n\nFix: Add to your OpenClaw config:\nsession:\n  dmScope: \"per-channel-peer\"\n\nDocs: https://docs.openclaw.ai/concepts/session#secure-dm-mode", source: "extensions/tlon/src/monitor/index.ts:483", owner: "channel", webui: "Tlon reply only" },
  { text: "⚠️ This command requires operator.pairing.", source: "extensions/device-pair/pair-command-auth.ts:71", owner: "plugin", webui: "plugin command reply; can appear in Web UI transcript" },
  { text: "❌ Matrix plugin approvals are not enabled for this bot account.", source: "extensions/matrix/src/approval-native.ts:341", owner: "channel", webui: "Matrix approval response only" },
  { text: "⚠️ /dreaming on|off requires owner status for channel callers or operator.admin for gateway clients.", source: "extensions/memory-core/src/dreaming-command.ts:116", owner: "plugin", webui: "plugin command reply; can appear in Web UI transcript" },
  { text: "⚠️ /active-memory global enable/disable changes require owner or operator.admin.", source: "extensions/active-memory/session-policy.ts:170", owner: "plugin", webui: "plugin command reply; can appear in Web UI transcript" },
  { text: "⚠️ /voice set requires operator.admin.", source: "extensions/talk-voice/index.ts:192", owner: "plugin", webui: "plugin command reply; can appear in Web UI transcript" },
  { text: "⚠️  Gateway is binding to a non-loopback address. Ensure authentication is configured before exposing to public networks.", source: "src/gateway/server-runtime-state.ts:282", owner: "gateway", webui: "gateway log only; never a chat card" },
  { text: "⚠️  gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true is enabled. Host-header origin fallback weakens origin checks and should only be used as break-glass.", source: "src/gateway/server-runtime-state.ts:288", owner: "gateway", webui: "gateway log only; never a chat card" },
  { text: "⚠️ API rate limit reached. Please try again later.", source: "ui/src/pages/chat/chat-gateway.ts:143-160", owner: "ui", webui: "UI does not produce it; live error normalization strips only the leading ⚠️" },
] as const;

const EMOJI_RE = /(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D|\p{Extended_Pictographic}|\p{Emoji_Modifier})*)+/gu;

function stripEmojiForRendering(text: string): string {
  return text
    .replace(EMOJI_RE, " ")
    .replace(/\s+([?!.,:;])/gu, "$1")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/ *\n */gu, "\n")
    .trim();
}

class ErrorEmojiFixture extends OpenClawLightDomElement {
  @state() private stripEmojis = false;

  override render() {
    return html`
      <main class="error-emoji-fixture" data-strip-emojis=${String(this.stripEmojis)}>
        <header class="error-emoji-fixture__header">
          <div>
            <span class="error-emoji-fixture__eyebrow">CONTENT LANE · ${ERROR_EMOJI_INVENTORY.length} INVENTORY ROWS</span>
            <h1>Error text with emoji</h1>
            <p>Same real chat error card on both sides. Only the candidate rendering changes.</p>
          </div>
          <label class="error-emoji-fixture__toggle">
            <input
              type="checkbox"
              .checked=${this.stripEmojis}
              @change=${(event: Event) => {
                this.stripEmojis = (event.currentTarget as HTMLInputElement).checked;
              }}
            />
            <span>strip emojis</span>
            <strong>${this.stripEmojis ? "ON" : "OFF"}</strong>
          </label>
        </header>

        <div class="error-emoji-fixture__columns" aria-hidden="true">
          <span>As produced</span>
          <span>UI candidate ${this.stripEmojis ? "· stripped" : "· unchanged"}</span>
        </div>

        <section class="error-emoji-fixture__list">
          ${ERROR_EMOJI_INVENTORY.map((entry, index) => {
            const candidate = this.stripEmojis ? stripEmojiForRendering(entry.text) : entry.text;
            return html`
              <article class="error-emoji-fixture__item" data-owner=${entry.owner}>
                <div class="error-emoji-fixture__meta">
                  <span>#${String(index + 1).padStart(2, "0")} · ${entry.owner}</span>
                  ${entry.semantic ? html`<strong>emoji carries category</strong>` : ""}
                  <code>${entry.source}</code>
                  <small>${entry.webui}</small>
                </div>
                <div class="error-emoji-fixture__pair">
                  <div>${renderChatComposerNotices({ messages: [], runError: { summary: entry.text } })}</div>
                  <div>${renderChatComposerNotices({ messages: [], runError: { summary: candidate } })}</div>
                </div>
              </article>
            `;
          })}
        </section>
      </main>
    `;
  }
}

if (!customElements.get("openclaw-error-emoji-fixture")) {
  customElements.define("openclaw-error-emoji-fixture", ErrorEmojiFixture);
}

document.querySelector("#app")?.append(document.createElement("openclaw-error-emoji-fixture"));
