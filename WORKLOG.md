# Lane error-emoji

## Escopo e lei

- Objetivo: investigar, em mock, emojis decorativos em mensagens de erro/aviso que chegam ao chat da Control UI.
- Base: `origin/main` em `dc17d248cc62ac2ba6d754787c1fe99edf1d396f`, worktree detached.
- Limites: nenhuma mudança em produção, nenhum teste/build/suite, nenhum `pnpm install`, nenhum commit/push/PR.
- Coexistência: a lane `error-polish` (`:5271`) é dona da apresentação do card. Esta lane (`:5272`) é dona apenas do conteúdo textual com emoji e não altera o trabalho dela.

## Estado

| Feito | Decidido | Próximo |
| --- | --- | --- |
| PLAYBOOK fases 1-2 e invioláveis lidos; worktree fresco criado; inventário e fixture mock-only concluídos; porta `5272` servindo. | Nenhuma decisão de produto foi tomada. A bancada compara texto bruto e sanitizado usando o card real de `origin/main`. | Maintainer alterna `strip emojis`, compara os dois lados e decide a política. |

## Inventário

Varredura em `src/`, `extensions/`, `packages/` e `ui/`, consolidando wrappers dinâmicos de mesmo formato. Excluídos: status de sucesso/progresso, reações, exemplos de docs, testes/test-support e decoração exclusiva de CLI. Unidade: string/forma user-visible com emoji de severidade, inclusive as que não entram na Web UI.

**Resultado:** 77 linhas; 75 usam emoji como decoração; 2 carregam categoria reconhecida pelo parser (`🛠️` ferramenta e `✉️` entrega).

**Achado central do rate limit:** `src/agents/failover/user-copy.ts:36` produz `⚠️ API rate limit reached...`. No evento live, `ui/src/pages/chat/chat-gateway.ts:143` chama `stripChatErrorMarker` e remove apenas `⚠️`. Em refresh/reconexão, `src/gateway/session-lifecycle-state.ts:128` persiste `lastRunError`, `src/gateway/session-utils-row.ts:535` o projeta e `ui/src/pages/chat/chat-history.ts:534` → `ui/src/pages/chat/run-lifecycle.ts:187` restaura o texto sem strip. O card em `ui/src/pages/chat/chat-view-notices.ts:67` já desenha `icons.alertTriangle`, portanto a duplicação reaparece no caminho histórico.

**Caminho comum:** produtor → payload `isError`/evento lifecycle → `src/agents/embedded-agent-subscribe.handlers.lifecycle.ts:154` → Gateway chat/session → `ui/src/pages/chat/run-lifecycle.ts:187` → `ui/src/pages/chat/chat-view-notices.ts:67`. Strings de canais marcadas como “only” não chegam ao card da Web UI hoje; estão na coleção para delimitar o efeito de limpar produtores.

**Preflight de solução existente:** `extensions/discord/src/voice/sanitize.ts:5` já remove `Extended_Pictographic`; `packages/terminal-core/src/decorative-emoji.ts:14` faz strip por grapheme; `src/agents/embedded-agent-helpers/messaging-dedupe.ts:16` normaliza emoji para comparação. Nenhum desses é hoje o dono do texto do card.

| # | String/forma | Produtor | Chega na Web UI? caminho | Classe |
| ---: | --- | --- | --- | --- |
| 1 | <code>⚠️ API rate limit reached. Please try again later.</code> | <code>src/agents/failover/user-copy.ts:36</code> | card: live event strips only ⚠️; sessions.list recovery preserves it | decoração |
| 2 | <code>⚠️ Selected model is at capacity. Try a different model, or wait and retry.</code> | <code>src/agents/failover/user-copy.ts:42</code> | card via lifecycle error / lastRunError | decoração |
| 3 | <code>⚠️ The model request was rate-limited. Please try again in a few minutes.</code> | <code>src/agents/failover/user-copy.ts:46</code> | card via error reply and lifecycle | decoração |
| 4 | <code>⚠️ OpenAI (gpt-5.6-sol) returned a billing error — check your account for subscription or usage limits, then try again.</code> | <code>src/agents/failover/user-copy.ts:74</code> | card via error reply and lifecycle | decoração |
| 5 | <code>⚠️ API provider returned a billing error — check your account for subscription or usage limits, then try again.</code> | <code>src/agents/failover/user-copy.ts:75</code> | card via error reply and lifecycle | decoração |
| 6 | <code>⚠️ OpenAI (gpt-5.6-sol) returned a billing error — your API key has run out of credits or has an insufficient balance. Check your OpenAI billing dashboard and top up or switch to a different API key.</code> | <code>src/agents/failover/user-copy.ts:78</code> | card via error reply and lifecycle | decoração |
| 7 | <code>⚠️ API provider returned a billing error — your API key has run out of credits or has an insufficient balance. Check your provider's billing dashboard and top up or switch to a different API key.</code> | <code>src/agents/failover/user-copy.ts:79</code> | card via error reply and lifecycle | decoração |
| 8 | <code>⚠️ Too many requests; retry in 30 seconds.</code> | <code>src/agents/failover/user-copy.ts:117</code> | card; bounded provider rate-limit text gets a warning prefix | decoração |
| 9 | <code>⚠️ Something went wrong while processing your request. Please try again, or use /new to start a fresh session.</code> | <code>src/agents/failover/user-copy.ts:358</code> | card via marked error reply | decoração |
| 10 | <code>⚠️ Heartbeat check failed before it could produce an update. The main chat session remains available.</code> | <code>src/agents/failover/user-copy.ts:360</code> | card via marked error reply | decoração |
| 11 | <code>⚠️ The model provider rejected the conversation state. Please try again, or use /new to start a fresh session.</code> | <code>src/agents/failover/user-copy.ts:362</code> | card via provider request failure | decoração |
| 12 | <code>⚠️ The model provider returned HTTP 429 before replying. This can mean rate limiting, exhausted quota, or an account balance/billing issue. Check the selected provider/model, API key, and provider billing/quota dashboard, then try again.</code> | <code>src/agents/failover/user-copy.ts:364</code> | card via provider request failure | decoração |
| 13 | <code>⚠️ The model provider returned a temporary internal error before replying. Try again in a moment, or switch to another model if it keeps happening.</code> | <code>src/agents/failover/user-copy.ts:366</code> | card via provider request failure | decoração |
| 14 | <code>⚠️ Authentication failed (provider returned HTTP 401). Your provider token may have expired — try the request again in a moment. If the failure persists, re-authenticate this provider.</code> | <code>src/agents/failover/user-copy.ts:367</code> | card via provider request failure | decoração |
| 15 | <code>⚠️ The configured model is unavailable from the provider — it may have been renamed, retired, or is not offered on this account. This needs a config update (agents.defaults.model); retrying or starting a new session won't fix it.</code> | <code>src/agents/failover/user-copy.ts:369</code> | card via provider request failure | decoração |
| 16 | <code>⚠️ Rate-limited — ready in ~30s. Please wait a moment.</code> | <code>src/agents/failover/user-copy.ts:504</code> | card via exhausted failover reply | decoração |
| 17 | <code>⚠️ Rate-limited — ready in ~3 min. Please try again shortly.</code> | <code>src/agents/failover/user-copy.ts:505</code> | card via exhausted failover reply | decoração |
| 18 | <code>⚠️ All attempted models were rate-limited or overloaded. Please try again in a few minutes.</code> | <code>src/agents/failover/user-copy.ts:512</code> | card via exhausted failover reply | decoração |
| 19 | <code>⚠️ Missing API key for OpenAI on the gateway. Use `openai/gpt-5.6-sol` with the OpenAI OAuth profile, or set `OPENAI_API_KEY` for direct OpenAI API-key runs.</code> | <code>src/agents/failover/user-copy.ts:554</code> | card via marked error reply | decoração |
| 20 | <code>⚠️ Missing API key for provider "openai". Run `openclaw doctor --fix` to repair stale OpenAI model/session routes, restart the gateway if doctor asks, then try again. If doctor has nothing to repair or the error persists, re-auth with `openclaw models auth login --provider openai` or run `openclaw configure`.</code> | <code>src/agents/failover/user-copy.ts:557</code> | card via marked error reply | decoração |
| 21 | <code>⚠️ Missing API key for provider "anthropic". Configure the gateway auth for that provider, then try again.</code> | <code>src/agents/failover/user-copy.ts:560</code> | card via marked error reply | decoração |
| 22 | <code>⚠️ Missing API key for the selected provider on the gateway. Configure provider auth, then try again.</code> | <code>src/agents/failover/user-copy.ts:561</code> | card via marked error reply | decoração |
| 23 | <code>⚠️ CLI subprocess: no output for 30s, so the no-output watchdog stopped it. This is separate from the overall agent timeout; the gateway is unaffected. Check for an interactive prompt. The CLI backend openai produced no output before its watchdog expired.</code> | <code>src/agents/failover/user-copy.ts:607</code> | card via marked error reply | decoração |
| 24 | <code>⚠️ CLI turn: timed out after 120s (overall turn limit). The gateway is unaffected. For long work, use a detached OpenClaw sub-agent (no run timeout by default), or raise `agents.defaults.timeoutSeconds`.</code> | <code>src/agents/failover/user-copy.ts:608</code> | card via marked error reply | decoração |
| 25 | <code>⚠️ Agent failed before reply: model switch could not be completed.<br>To view logs, run `openclaw logs --follow` in a terminal.</code> | <code>src/agents/failover/user-copy.ts:699</code> | card; Control UI-specific failure copy | decoração |
| 26 | <code>⚠️ This Codex session changed before your message could run. Please send it again.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:142</code> | card via marked error reply | decoração |
| 27 | <code>⚠️ Codex app-server connection closed before this turn finished. OpenClaw retried once when the stdio turn was still replay-safe; please try again if this keeps happening.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:145</code> | card via marked error reply | decoração |
| 28 | <code>⚠️ Codex app-server stopped before confirming turn completion. OpenClaw did not replay the turn automatically because it may still be active; try again, or use /new if the session stays stuck.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:148</code> | card via marked error reply | decoração |
| 29 | <code>⚠️ Context is too large and auto-compaction timed out before it could finish. Try again, use /compact, or use /new to start a fresh session.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:171</code> | card via marked error reply | decoração |
| 30 | <code>⚠️ Context is too large and auto-compaction could not recover this turn. Try again, use /compact, or use /new to start a fresh session.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:172</code> | card via marked error reply | decoração |
| 31 | <code>⚠️ Agent failed before reply: provider failed. Please try again, or use /new to start a fresh session.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:201</code> | card via marked error reply | decoração |
| 32 | <code>⚠️ Model login expired on the gateway for openai. Re-auth with `openclaw models auth login --provider openai` in a terminal, then try again.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:241</code> | card via marked error reply | decoração |
| 33 | <code>⚠️ Model login failed on the gateway for openai. Please try again. If this keeps happening, re-auth with `openclaw models auth login --provider openai` in a terminal.</code> | <code>src/auto-reply/reply/agent-runner-failure-reply.ts:247</code> | card via marked error reply | decoração |
| 34 | <code>⚠️ Context overflow — prompt too large for this model. Try a shorter message or a larger-context model.</code> | <code>src/auto-reply/reply/agent-runner-error-handler.ts:501</code> | card via marked error reply | decoração |
| 35 | <code>⚠️ This turn was interrupted because it stopped making progress. Please try again.</code> | <code>src/auto-reply/reply/dispatch-from-config.prepare-context.ts:482</code> | chat reply; can be returned as an error payload | decoração |
| 36 | <code>⚠️ Previous run is still shutting down. Please try again in a moment.</code> | <code>src/auto-reply/reply/get-reply-run-queue.ts:13</code> | chat reply; queue admission warning | decoração |
| 37 | <code>⚠️ Gateway is restarting. Please wait a few seconds and try again.</code> | <code>src/auto-reply/reply/reply-operation-abort.ts:12; src/auto-reply/reply/agent-runner-core.ts:49</code> | card when marked as run failure; otherwise chat reply | decoração |
| 38 | <code>⚠️ Memory maintenance temporarily failed; continuing your reply.</code> | <code>src/auto-reply/reply/compaction-notice.ts:19</code> | chat transcript notice, not run-error card | decoração |
| 39 | <code>⚠️ Memory flush failed after 3 attempts; skipping for this cycle. It will retry after the next compaction.</code> | <code>src/auto-reply/reply/agent-runner-memory.ts:1697</code> | chat transcript warning | decoração |
| 40 | <code>⚠️ Agent couldn't generate a response. Note: some tool actions may have already been executed — please verify before retrying.</code> | <code>src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:131</code> | error reply; transcript and terminal card paths | decoração |
| 41 | <code>⚠️ Agent couldn't generate a response. Please try again.</code> | <code>src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:148</code> | error reply; transcript and terminal card paths | decoração |
| 42 | <code>⚠️ Turn yielded without a continuation source. Send a message to resume.</code> | <code>src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:241</code> | chat transcript warning | decoração |
| 43 | <code>⚠️ Reply truncated at the model's output token limit. The text above is partial — ask to continue it.</code> | <code>src/agents/embedded-agent-runner/run/incomplete-turn-resolution.ts:244</code> | chat transcript warning | decoração |
| 44 | <code>⚠️ 🛠️ Exec failed (exit 1): command failed.</code> | <code>src/agents/embedded-agent-runner/run/tool-error-warning.ts:44-73</code> | chat transcript warning; parser-recognized tool category | informação/categoria |
| 45 | <code>⚠️ ✉️ Message failed: delivery unavailable</code> | <code>src/agents/embedded-agent-runner/run/tool-error-warning.ts:66-73; src/agents/tool-display-message-config.ts:9</code> | chat transcript warning; parser-recognized delivery category | informação/categoria |
| 46 | <code>⚠️ I couldn't reach the configured model backend openai/gpt-5.6-sol. Fallback used anthropic/claude-sonnet-4-6, but it produced no visible reply.</code> | <code>src/auto-reply/reply/agent-runner-core.ts:97</code> | error reply (`isError: true`) | decoração |
| 47 | <code>⚠️ LLM connection failed. This could be due to server issues, network problems, or context length exceeded (e.g., with local LLMs like LM Studio). Original error:<br>```<br>Connection closed<br>```</code> | <code>src/auto-reply/reply/agent-runner-utils.ts:200</code> | error reply when Bun socket failure is surfaced | decoração |
| 48 | <code>⚠️ This command requires authorization.</code> | <code>src/plugins/plugin-command-execution.ts:155; src/plugins/plugin-command-runtime.ts:168</code> | slash-command reply; not a run-error card by itself | decoração |
| 49 | <code>⚠️ This command has invalid gateway scope configuration.</code> | <code>src/plugins/plugin-command-execution.ts:159</code> | slash-command reply; not a run-error card by itself | decoração |
| 50 | <code>⚠️ This command requires gateway scope: operator.admin.</code> | <code>src/plugins/plugin-command-execution.ts:179</code> | slash-command reply; not a run-error card by itself | decoração |
| 51 | <code>⚠️ This command is no longer available after the plugin registry changed. Please try again.</code> | <code>src/plugins/plugin-command-execution.ts:269; src/plugins/plugin-command-runtime.ts:122</code> | slash-command reply; not a run-error card by itself | decoração |
| 52 | <code>⚠️ Plugin "calendar" failed to load: module unavailable. Run `openclaw doctor` and check the gateway logs.</code> | <code>src/plugins/plugin-command-runtime.ts:179</code> | slash-command reply; not a run-error card by itself | decoração |
| 53 | <code>⚠️ Command failed. Please try again later.</code> | <code>src/plugins/plugin-command-execution.ts:283</code> | slash-command reply; not a run-error card by itself | decoração |
| 54 | <code>⚠️ Channel-initiated /config writes cannot replace channels, channel roots, or accounts collections. Use a more specific path or gateway operator.admin.</code> | <code>src/channels/plugins/config-write-policy-shared.ts:230</code> | possible Web UI slash-command transcript; primarily channel reply | decoração |
| 55 | <code>⚠️ Config writes are disabled for Discord. Set commands.config=true to enable.</code> | <code>src/channels/plugins/config-write-policy-shared.ts:242</code> | possible Web UI slash-command transcript; primarily channel reply | decoração |
| 56 | <code>⚠️ Media failed. Try sending a smaller supported file or a different format.</code> | <code>src/channels/plugins/contracts/outbound-payload-testkit.ts:62</code> | contract fixture only; no production Web UI path | decoração |
| 57 | <code>⚠️ Couldn't process this message because the session stayed busy. Please try again in a moment.</code> | <code>extensions/discord/src/monitor/message-handler.retry.ts:3</code> | Discord delivery only | decoração |
| 58 | <code>⚠️ Command produced no visible reply.</code> | <code>extensions/discord/src/monitor/native-command-reply.ts:22</code> | Discord interaction notice only | decoração |
| 59 | <code>⛔ You are not authorized to approve requests.</code> | <code>extensions/discord/src/monitor/exec-approvals.ts:123</code> | Discord interaction response only | decoração |
| 60 | <code>❌ Failed to apply openai/gpt-5.6-sol. Try /model openai/gpt-5.6-sol directly.</code> | <code>extensions/discord/src/monitor/native-command-model-picker-apply.ts:78</code> | Discord interaction notice only | decoração |
| 61 | <code>⚠️ File too large. Maximum size is 20MB.</code> | <code>extensions/telegram/src/bot-handlers.inbound-processing.ts:283</code> | Telegram sendMessage only | decoração |
| 62 | <code>⚠️ Failed to download media. Please try again.</code> | <code>extensions/telegram/src/bot-handlers.inbound-processing.ts:307</code> | Telegram sendMessage only | decoração |
| 63 | <code>⚠️ Couldn't process this message, please try again in a moment.</code> | <code>extensions/telegram/src/bot-handlers.inbound-pipeline.ts:268</code> | Telegram sendMessage only | decoração |
| 64 | <code>⚠️ Media unavailable.</code> | <code>extensions/whatsapp/src/auto-reply/deliver-reply.ts:391</code> | WhatsApp reply only | decoração |
| 65 | <code>⚠️ Media failed.</code> | <code>extensions/whatsapp/src/auto-reply/deliver-reply.ts:398</code> | WhatsApp reply only | decoração |
| 66 | <code>⚠️ This reply completed without visible content. The turn may have been interrupted; please retry or ask me to recover from recent context.</code> | <code>extensions/feishu/src/reply-dispatcher.ts:86</code> | Feishu reply only | decoração |
| 67 | <code>⚠️ Failed to initialize the configured ACP session for this Feishu conversation: runtime unavailable</code> | <code>extensions/feishu/src/bot.ts:950</code> | Feishu reply only | decoração |
| 68 | <code>⚠️ Something went wrong. Please try again.</code> | <code>extensions/msteams/src/monitor-handler/inbound-dispatch.ts:334</code> | Microsoft Teams activity only | decoração |
| 69 | <code>⚠️ Security Warning: Multiple users are sharing a DM session with this bot. This can leak conversation context between users.<br><br>Fix: Add to your OpenClaw config:<br>session:<br>  dmScope: "per-channel-peer"<br><br>Docs: https://docs.openclaw.ai/concepts/session#secure-dm-mode</code> | <code>extensions/tlon/src/monitor/index.ts:483</code> | Tlon reply only | decoração |
| 70 | <code>⚠️ This command requires operator.pairing.</code> | <code>extensions/device-pair/pair-command-auth.ts:71</code> | plugin command reply; can appear in Web UI transcript | decoração |
| 71 | <code>❌ Matrix plugin approvals are not enabled for this bot account.</code> | <code>extensions/matrix/src/approval-native.ts:341</code> | Matrix approval response only | decoração |
| 72 | <code>⚠️ /dreaming on&#124;off requires owner status for channel callers or operator.admin for gateway clients.</code> | <code>extensions/memory-core/src/dreaming-command.ts:116</code> | plugin command reply; can appear in Web UI transcript | decoração |
| 73 | <code>⚠️ /active-memory global enable/disable changes require owner or operator.admin.</code> | <code>extensions/active-memory/session-policy.ts:170</code> | plugin command reply; can appear in Web UI transcript | decoração |
| 74 | <code>⚠️ /voice set requires operator.admin.</code> | <code>extensions/talk-voice/index.ts:192</code> | plugin command reply; can appear in Web UI transcript | decoração |
| 75 | <code>⚠️  Gateway is binding to a non-loopback address. Ensure authentication is configured before exposing to public networks.</code> | <code>src/gateway/server-runtime-state.ts:282</code> | gateway log only; never a chat card | decoração |
| 76 | <code>⚠️  gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true is enabled. Host-header origin fallback weakens origin checks and should only be used as break-glass.</code> | <code>src/gateway/server-runtime-state.ts:288</code> | gateway log only; never a chat card | decoração |
| 77 | <code>⚠️ API rate limit reached. Please try again later.</code> | <code>ui/src/pages/chat/chat-gateway.ts:143-160</code> | UI does not produce it; live error normalization strips only the leading ⚠️ | decoração |

## Fronteira com error-polish

- `error-polish` decide aparência, geometria, ícone, cor e espaçamento do card.
- `error-emoji` compara somente o texto recebido versus o mesmo texto sanitizado na renderização.
- A fixture reutilizará a apresentação atual de `origin/main`; não transplantará nem editará o trabalho da lane vizinha.

## Recomendação

**Recomendação, não decisão:** ambos, mas de forma segmentada.

- **Render da UI:** remover apenas marcadores decorativos de severidade no início do resumo colapsado do card. Prós: fecha a assimetria live/histórico e cobre plugins de terceiros que não controlamos. Contras: um strip global de todo emoji apagaria categoria útil e poderia alterar diagnóstico/cópia; o texto bruto deve permanecer disponível no detalhe/copy.
- **Produtores próprios:** retirar gradualmente os emojis decorativos dos erros pertencentes ao core/plugins oficiais. Prós: limpa também TUI, transcript e canais. Contras: é uma superfície ampla, não cobre terceiros e exige preservar `🛠️`/`✉️` quando são contrato de categoria.
- **Combinação sugerida:** produtores próprios sem decoração + defesa estreita na apresentação Web UI para prefixos de severidade (`⚠️`, `❌`, `⛔`, `🚨`). Não usar o regex amplo da bancada como implementação final; ele existe para tornar o contraste visível.

## Bancada

- Comando: `node --import ./scripts/tsx.mjs scripts/control-ui-mock-dev.ts -- --host 127.0.0.1 --port 5272`
- URL decisória: `http://127.0.0.1:5272/`
- A raiz serve a coleção completa em pares do card real: “As produced” × “UI candidate”.
- Toggle vivo: `strip emojis` (`OFF` preserva; `ON` aplica o candidato amplo apenas na renderização mock).
- Sem Gateway real, credenciais, WebSocket externo, teste, build, commit, push ou PR.

## Fase 2 — rodada corretiva de fidelidade

### Ordem do Vyctor

> O ícone de alerta do card está sem restrição de tamanho e renderiza gigante nos dois lados. Cada item deve usar o card real do chat, a lista de 77 itens deve permanecer navegável e o toggle deve controlar somente o lado candidate. Provar olhando um screenshot próprio; sem open, commit ou PR.

### Causa

- A fixture já reutilizava o componente/markup real por `renderChatComposerNotices` em `ui/src/test-helpers/error-emoji-fixture.ts:4,150-151`, cujo card é produzido por `ui/src/pages/chat/chat-view-notices.ts:68-89`.
- O estouro vinha do stylesheet ausente: `ui/src/test-helpers/error-emoji-fixture.ts:5` importava apenas `ui/src/styles.css:1-8`, que deliberadamente não inclui o CSS lazy do chat. A tela real importa `ui/src/styles/chat.css` em `ui/src/pages/chat/chat-page.ts:25`; sem ele, a regra `ui/src/styles/chat/layout.css:356-359` que restringe o ícone a `16px × 16px` não existia na página.
- Além disso, `ui/src/test-helpers/error-emoji-fixture.css:160-164` sobrescrevia largura, limite e margem do `.chat-error`, portanto a promessa de geometria real também era falsa.

### Mudança

- `ui/src/test-helpers/error-emoji-fixture.ts:5-7`: importa a folha global e a mesma `ui/src/styles/chat.css` carregada pelo chat real; mantém o renderer canônico para os dois cards.
- `ui/src/test-helpers/error-emoji-fixture.css:166-168`: conserva apenas o `min-width: 0` do grid comparativo; remove o override de `.chat-error`, deixando tamanho, margem, largura e ícone sob o owner real em `ui/src/styles/chat/layout.css:46-61,334-359,409-417`.
- A lista continua no fluxo natural da página (`ui/src/test-helpers/error-emoji-fixture.css:110-120`), com uma linha de inventário por `<article>` e dois cards lado a lado. O estado `stripEmojis` só altera `candidate` em `ui/src/test-helpers/error-emoji-fixture.ts:139-151`.

### Prova visual

- Primeira passagem headless confirmou `77` itens, `154` cards, ícone computado em `16px × 16px`, cards da primeira comparação em `631px × 52px`, toggle `ON` preservando `⚠️` no lado produced e removendo-o somente no candidate, sem erro de console.
- A mesma passagem revelou a lista ainda não navegável: `ui/src/styles/base.css:661-670` fixa `html, body` em `height: 100%` e `overflow: clip` porque a aplicação real usa scroll interno. Como esta fixture é um documento longo sem shell, `ui/src/test-helpers/error-emoji-fixture.css:1-16` agora devolve altura automática e scroll vertical ao documento, sem tocar no card.
- Passagem final headless: `documentScrollHeight=10898` para viewport de `1000`, `overflow-y: auto`, `77` pares, `154` cards, primeiro ícone `16px × 16px`, cada card inicial `631px × 52px`, duas colunas de `667px`, lado produced intacto e candidate sem `⚠️` com toggle `ON`; zero erros de console.
- Captura final `.artifacts/control-ui-e2e/error-emoji-iter1/page.png` olhada em resolução original: ícones pequenos e alinhados dentro dos cards, seis linhas do inventário legíveis no viewport, metadados/fontes legíveis, cards compactos e sem recorte horizontal. A comparação visual mostra o emoji apenas em “As produced”; “UI candidate · stripped” mantém só o ícone real do card.
- O Vite original encerrou sem sinal desta rodada antes da captura; a bancada foi retomada na mesma porta e mesma linha de comando. Estado final verificado: PID `81274` escutando `127.0.0.1:5272`.

## Fase 3 — implementação autorizada

### Decisão aplicada

- A decisão do maintainer substitui a recomendação exploratória acima: todos os emojis do inventário são removidos somente na apresentação de erro da WebUI.
- Produtores e canais permanecem byte-for-byte intocados. A sanitização recebe apenas summaries/reasons curtos nos renderers de erro; nenhum transcript é percorrido ou reescrito.
- Tradeoff deliberado: `⚠️ 🛠️ Exec failed` e `⚠️ ✉️ Message failed` perdem também o glifo de categoria na WebUI porque o card/row já possui ícone próprio. Isso será declarado no corpo da PR.

### Base e owner boundary

- Base atualizada antes da edição: `origin/main` em `1a11f9c6f3a2feee066a3c8cce44af08263ee414`.
- O strip parcial do evento live em `ui/src/pages/chat/chat-gateway.ts` foi removido; o estado agora preserva o erro bruto como a recuperação persistida já fazia.
- Um helper de apresentação WebUI em `ui/src/components/error-presentation.ts` é consumido pelo card compartilhado e pelo subtitle de atenção da sidebar.
- Consumidores nominais do card: erro live, erro recuperado por `chat.startup`/`chat.history`, erro de request no topbar e falha de startup de placement.
- Consumidores nominais da sidebar: row Home, recent-session subtitle e projeção de subtitle crítico; todos atravessam `sessionAttentionSubtitle` e já têm `alertTriangle` próprio.

### Prova antes da mudança

- A bancada continuou viva na porta `5272`; captura com toggle `OFF` confirmou `77` itens, `154` cards e zero erros de console.
- Olhadas em resolução original: `before-light-overview.png`, `before-dark-overview.png`, `before-light-semantic.png` e `before-dark-semantic.png` em `.artifacts/control-ui-e2e/error-emoji-pr/`.
- As capturas semantic mostram explicitamente os casos `🛠️` e `✉️`; as overview mostram múltiplos exemplos com o alerta duplicado.

### Testes colocados

- E2E de recovery usa uma linha canônica de `sessions.list` e prova o card restaurado sem `⚠️`/`✉️`.
- E2E live prova o mesmo card sem `⚠️`/`🛠️`.
- Testes de renderer cobrem run/request e sidebar; teste do gateway exige que o estado live preserve o texto bruto.
- Contratos existentes de Telegram, Discord e WhatsApp já assertam texto com emoji sem alteração; não foi adicionado teste duplicado de canal.
- Conforme a lei da máquina do maintainer, nenhum teste, build ou typecheck local foi executado. A validação será somente CI no SHA exato da PR.

### Prova depois e gate de escopo

- A mesma bancada, com toggle `OFF`, mostrou a mudança do renderer real nos dois lados: `77` itens, `154` cards e zero erros de console.
- Olhadas em resolução original: `after-light-overview.png`, `after-dark-overview.png`, `after-light-semantic.png` e `after-dark-semantic.png` em `.artifacts/control-ui-e2e/error-emoji-pr/`.
- As quatro imagens mantêm o ícone de alerta do card e removem os emojis do texto; as semantic mostram `Exec failed` e `Message failed` sem os glifos de categoria.
- A base avançou durante o closeout; o commit foi rebaseado sobre `origin/main` `681c0c6bf398b21109bb153fe765a9b45074b76b`. Head local após rebase: `737659e237a02a87df7db403b7ec76ae6777a51c`.
- Gate de commit: exatamente 8 arquivos (`4` produção, `4` testes), `69` adições/`27` remoções no total. Produção: `21` adições/`11` remoções, delta `+10`, justificado pelo helper WebUI compartilhado necessário para um owner de apresentação entre card e sidebar. Testes: `48` adições/`16` remoções.
- `git diff --check origin/main...HEAD` passou. A bancada (`WORKLOG.md`, mock server, fixture e CSS) permanece fora do commit.
- Autoreview de `origin/main...HEAD`: `scoped-clean`, sem achados acionáveis na prioridade do gate.

### Publicação e handoff para auditoria

- Issue: `https://github.com/openclaw/openclaw/issues/133341`, aberta e atribuída a `vyctorbrzezowski`.
- Draft PR: `https://github.com/openclaw/openclaw/pull/133342`, aberta e atribuída a `vyctorbrzezowski`.
- Head remoto confirmado: `737659e237a02a87df7db403b7ec76ae6777a51c`, idêntico ao head local e baseado no `origin/main` atualizado.
- Corpo remoto confirmado com `Closes #133341`, template completo, tradeoff semântico nomeado e `8` user-attachments (before/after, overview/semantic, light/dark).
- Labels atuais: `app: web-ui`, `maintainer`, `size: S`; sem label de limite de PRs. A PR permanece draft e mergeable.
- Os 8 gates leves do draft passaram. As lanes substantivas foram marcadas `skipped` pelo workflow porque a PR continua draft; elas ficam explicitamente pendentes para o gate pós-auditoria/ready-for-review. Nenhuma validação local substituiu a CI e nenhum “CI green” foi alegado.
- Nenhum land foi executado. O próximo gate é a auditoria adversarial ordenada pelo maintainer.

## Fase 3 — correção após auditoria adversarial

### Achados obrigatórios

- Clipboard é dado: `Copy error` deve receber o texto bruto, com emojis e whitespace intactos.
- O detalhe continua sendo apresentação WebUI: remove pictogramas, mas preserva exatamente os espaços, tabs, quebras e trailing whitespace restantes.
- Transcript warnings, notices `danger`, toasts dinâmicos de falha/atenção, placement startup e Home devem atravessar a mesma regra; mensagens comuns, ações/cópia, produtores, estado e canais não atravessam.

### Owner boundary revisado

- `formatWebUiErrorText` agora só remove sequências pictográficas; não insere espaço, não colapsa whitespace e não aplica `trim`.
- O card usa o texto sanitizado apenas em summary e diagnóstico visual; `renderCopyButton` recebe o argumento bruto.
- O transcript aplica a regra no corpo renderizado apenas quando a resposta começa com marcador explícito de warning/error; `data-message-text`, reply e copy continuam brutos. Notices estruturados aplicam a regra somente em `tone: danger`.
- Os toasts genéricos continuam intocados. Apenas falha de entrega de uma sessão não visível e critical observer — os dois fluxos de toast com texto dinâmico de erro/aviso inventariados — sanitizam a mensagem imediatamente antes da apresentação.

### Testes colocados, não executados localmente

- Card de run/request: diagnóstico multiline conserva forma após remover pictogramas; clipboard recebe o input byte-for-byte.
- Placement startup: diagnóstico visual remove o marcador e conserva indentação/trailing whitespace.
- Transcript: warning sem glifos na renderização, texto bruto nas ações e emoji comum preservado; notice Guardian `danger` preserva o produtor e sanitiza só o DOM.
- Toast de falha invisível: DOM sem glifos e outbox `sendError` bruto.
- Home: placement real da row usa o subtitle sanitizado; unit do subtitle atualizado para whitespace não comprimido.
- Nenhum teste, build ou typecheck local foi executado; CI no novo SHA continuará sendo a única validação.

### Gate de escopo do diff completo da PR

- `ui/src/components/error-presentation.ts`: único owner da regra WebUI, incluindo a guarda estreita de warning de transcript.
- `ui/src/components/session-attention-presentation.ts`: consumidor compartilhado de sidebar e Home.
- `ui/src/pages/chat/chat-gateway.ts`: remove o strip parcial antigo e mantém o estado live bruto.
- `ui/src/pages/chat/chat-view-notices.ts`: card compartilhado de run/request/placement; display sanitizado e clipboard bruto.
- `ui/src/pages/chat/chat-send-support.ts`: toast dinâmico de falha de entrega fora do pane visível.
- `ui/src/pages/chat/critical-observer-notice.ts`: toast dinâmico de atenção crítica.
- `ui/src/pages/chat/components/chat-divider.ts`: notices estruturados `danger` do transcript.
- `ui/src/pages/chat/components/chat-message-bubble.ts`: warning/error prefixado no corpo visível, com ações brutas.
- `ui/src/components/session-row-subtitle.test.ts`: whitespace preservado no consumer sidebar.
- `ui/src/e2e/chat-run-lifecycle.e2e.test.ts`: recovery e live reais do card com os dois casos semânticos.
- `ui/src/pages/chat/chat-gateway.test.ts`: estado live continua com o texto original.
- `ui/src/pages/chat/chat-view.test.ts`: run/request, detalhe multiline, clipboard e placement startup.
- `ui/src/pages/chat/chat-send.test.ts`: toast sanitizado e outbox bruto.
- `ui/src/pages/chat/components/chat-message.test.ts`: warning comum, emoji legítimo e notice `danger`.
- `ui/src/pages/chat/critical-observer-notice.test.ts`: critical-observer toast.
- `ui/src/test-helpers/app-sidebar-cases/attention.ts`: placement real de Home.
- `WORKLOG.md`, `scripts/control-ui-mock-dev.ts`, `scripts/control-ui-mock-error-emoji.ts`, `ui/src/test-helpers/error-emoji-fixture.ts` e `.css` continuam bancada não rastreada/modificada e ficam fora do commit.

### Publicação do follow-up

- Commit/push: `758e4dbe178ae743fc898de8d1bf23af97cf162a`; head local, branch remota e PR confirmados idênticos.
- Corpo remoto atualizado com a matriz nominal completa de placements e passa/não-passa, incluindo expanded diagnostic, Copy error, placement startup, Home, transcript, toasts, estado e canais.
- PR `#133342` permanece draft, mergeable e atribuída a `vyctorbrzezowski`; issue `#133341` permanece aberta e atribuída ao mesmo maintainer.
- Re-auditoria solicitada no novo head. Checks leves do draft ainda estavam em andamento; lanes substantivas permaneciam skipped pela condição draft. Nenhum estado verde foi alegado.
- Bancada re-capturada no renderer atual: 77 itens, 154 cards, zero console errors; quatro capturas light/dark overview/semantic olhadas em resolução original.
- Nenhum land foi executado.

## Fase 3 — correção após re-auditoria no head `758e4dbe`

### Bloqueios recebidos

- Rebase obrigatório porque a PR #133369 alterou o owner `ui/src/pages/chat/chat-view-notices.ts` e seus testes, adicionando disclosure somente quando o detalhe difere do summary.
- O strip anterior era largo: removia qualquer `Extended_Pictographic` do texto inteiro e alcançava transcript/toasts sem ícone substituto.
- Fronteira ordenada: remover apenas o prefixo decorativo/categórico em cards/rows que já exibem ícone próprio; preservar emoji semântico no corpo, clipboard, transcript e os dois toasts.

### Rebase e owner boundary final

- Rebase final concluído sobre `origin/main` `998c80f9a868f5da9e02c5879287fbae66ba13ac`, incluindo a PR #133369 e os dois commits que chegaram durante o closeout.
- `ui/src/pages/chat/chat-view-notices.ts` aplica `formatWebUiIconErrorText` antes de derivar `summary` e `hasDetails`; o mesmo `displayError` alimenta o `<pre>`, portanto a regra `detail != summary` do renderer novo permanece canônica.
- `renderCopyButton` continua recebendo `error` bruto. Estado live/recovery, produtores e canais continuam brutos.
- `ui/src/components/error-presentation.ts` reconhece somente a sequência inicial conhecida (`⚠️`, `⛔`, `❌`, `🛠️`, `✉️`), remove apenas os tokens e conserva todo whitespace e emoji do corpo.
- Consumidores que passam: card compartilhado de request/run/startup e rows sidebar/Home, todos com `alertTriangle` próprio.
- Consumidores que não passam: clipboard, transcript comum/estruturado, hidden-session delivery toast, critical-observer toast, host genérico de toast, estado/produtores e canais.

### Testes colocados, sem execução local

- Recovery por `sessions.list` e evento live exercitam os dois casos categóricos no card curto do renderer novo, mantêm `🧭` no corpo e exigem ausência de disclosure redundante.
- Run/request multiline prova prefix-only no summary/detail, forma intacta do diagnóstico e clipboard bruto.
- Hidden-session delivery e critical-observer provam que os dois toasts conservam os emojis originais.
- Placement startup, sidebar e Home continuam cobrindo os consumidores icon-backed; o gateway continua exigindo estado live bruto.
- Nenhum teste, build, typecheck ou suite local foi executado; validação permanece CI no SHA exato.

### Gate de escopo pré-push

- Diff contra a base: 11 arquivos, `150` adições / `39` remoções.
- Produção: `36` adições / `13` remoções, delta `+23`; o crescimento cria um único owner WebUI prefix-only compartilhado por card e rows, mantém raw/display separados no wrapper de startup e reconcilia o renderer novo, enquanto remove o hack parcial live.
- Testes/test-support: `114` adições / `26` remoções; cobre live, recovery, raw clipboard/state/toasts, startup, sidebar e Home.
- `git diff --check origin/main...HEAD` passou. Bancada permanece exclusivamente em `WORKLOG.md`, `scripts/control-ui-mock-dev.ts`, `scripts/control-ui-mock-error-emoji.ts` e `ui/src/test-helpers/error-emoji-fixture.{ts,css}`, fora dos commits.
- Head local pré-push: `ce018b75405795c5ce4b35f7fa7268a7c280dad6`. Nenhum land executado; próximo gate continua sendo a re-auditoria independente.

### Publicação da corretiva impl3

- Force-with-lease explícito substituiu somente o head remoto conhecido `758e4dbe178ae743fc898de8d1bf23af97cf162a`; head local, branch remota e PR confirmados em `ce018b75405795c5ce4b35f7fa7268a7c280dad6`.
- PR #133342 permanece aberta, draft, mergeable e atribuída a `vyctorbrzezowski`; issue #133341 permanece aberta e atribuída ao mesmo maintainer.
- Corpo remoto reescrito em inglês com a fronteira prefix-only, a lógica `detail != summary`, clipboard bruto, transcript/toasts fora da regra, matriz nominal completa e oito novas user-attachments equivalentes light/dark.
- Bancada revalidada na porta `5272`: HTTP 200, `77` rows, `154` cards e zero console errors. As oito capturas before/after foram olhadas em resolução original antes do upload.
- Checks do draft foram despachados no SHA novo; lanes substantivas continuam skipped pela condição draft e checks leves ainda estavam em andamento. Nenhum estado verde foi alegado.
- Marker `error-emoji-impl3.done` encerra a fase 3. Nenhum land foi executado; a re-auditoria independente no head novo é o próximo gate.
