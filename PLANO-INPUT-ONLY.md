# Plano: Chat input-only com Details popover

Status: especificacao de implementacao. Nenhuma mudanca de UI deve comecar antes da revisao do operador.

Branch: `brzezowski/composer-input-only`, baseada em `brzezowski/composer-multiline-restyle`.

## 1. Tese e invariantes

A pagina passa a ter tres superficies com responsabilidades exclusivas:

1. **Composer = input puro.** Texto, anexos, reply, voz/camera, modelo, reasoning/fast, permissao, capacidades, fila de mensagens ainda nao executadas e a acao primaria.
2. **Transcript = conversa e atividade do agente.** Mensagens, stream, tool calls, estado do run, subagent/teammate activity transitiva, perguntas e aprovacoes que fazem parte do turno.
3. **Details = estado auxiliar da sessao.** Ambiente, branch, changes, PR/CI, goal, progress card, tarefas, subagents/background processes em detalhe, participantes, provider/context usage e diagnosticos persistentes.

O `Details` sera um **popover nao modal ancorado no topo direito do header**, nao o side panel existente. Ele resume e aciona superficies maiores que continuam abrindo nos owners existentes (diff, files, task detail, terminal, browser, desktop, discussion e companion).

Invariantes de produto:

- Uma acao que exige resposta imediata nao pode ficar escondida no `Details`. Pending approval e pending gateway question continuam visiveis no fluxo principal, mas migram para o transcript.
- Um estado que bloqueia input precisa continuar explicando o motivo junto ao composer. Banners de sessao arquivada, recovery e model setup nao podem virar metadata escondida.
- Erros e avisos urgentes continuam visiveis no fluxo principal. O `Details` pode duplicar uma entrada resumida para descoberta, mas nunca ser o unico lugar de um erro acionavel.
- Message queue e reconnect outbox pertencem ao composer: sao mensagens do operador ainda editaveis, reordenaveis ou removiveis, nao trabalho do agente. Sua integracao visual e de ownership esta fora desta branch e pertence ao agente/branch irma `composerqueue`; este plano registra apenas a classificacao e a interface esperada.
- O transcript nao ganha metadata de sessao. PR, CI, branch, goal e progress card saem do fluxo de conversa.
- A migracao muda **render ownership**, nao os owners de dados e lifecycle. Subscriptions, fencing, retries, timers e persistencia permanecem onde estao ate haver razao independente para refatorar.

## 2. Modelo atual da pagina

### 2.1 Render graph

```text
app-routes.ts
  -> route-loader.ts
  -> route.ts
  -> <openclaw-chat-page> (chat-page.ts)
     -> split layout / retained panes (chat-page-pane-render.ts)
        -> <openclaw-chat-pane> (chat-pane.ts)
           -> ChatPane.render (chat-pane-render.ts)
              -> header (chat-pane-header.ts -> components/chat-pane-header.ts)
              -> renderChat (chat-view.ts)
                 -> notices
                 -> transcript search
                 -> virtual transcript
                 -> history/scroll controls
                 -> inline approval
                 -> task suggestions
                 -> PR/CI/branch rows
                 -> session suggestions
                 -> swarm progress
                 -> composer
              -> board/dashboard primary
              -> existing sidebar region
              -> lightbox/reset overlays
```

O limite tecnico importante e `chat-transcript-projection.ts`: somente itens enviados a `ChatTranscriptSession.render()` participam de virtualizacao, identidade de row, restauracao de scroll e reveal de mensagens. Hoje varias superficies parecem parte do transcript, mas sao siblings posteriores em `chat-view.ts:539`.

### 2.2 Lifecycles que nao podem ser achatados

Uma pane tem tres estados independentes:

- **mounted**: retained pane continua conectada ao DOM;
- **presented**: sessao selecionada e visivel na pane;
- **active**: pane apresentada que recebe bindings globais, atalhos e announcements.

`chat-pane-retained-presentation.ts` aposenta efeitos visiveis quando uma pane retained fica oculta sem destruir transcript, drafts ou cache. A migracao do render nao pode fazer um popover fechado equivaler a pane nao apresentada.

Fences existentes que devem sobreviver:

- `connectionGeneration` para resultados async depois de reconnect;
- state object, client, session key e session ID para history, sharing, typing e tasks;
- presentation generation para outcomes do header;
- watcher de PR somente quando a pane esta presented;
- background tasks carregadas mesmo com UI recolhida, porque badges/resumos precisam ser verdadeiros;
- question takeover faz commit de IME antes de desmontar textarea;
- attachments possuem payloads, object URLs, reads abortaveis e handoff entre mounts;
- composer state e module-global por pane, com draft/controller reescopado por agent + session.

## 3. Inventario completo e destino

Legenda de destino:

- **C**: composer/input puro.
- **T**: transcript/conversa ou atividade do agente.
- **D**: Details popover ou superficie maior aberta a partir dele.
- **H**: header/chrome estrutural; nao e conteudo do Details.
- **O**: overlay ou estado bloqueante que permanece no fluxo principal.

### 3.1 Route, page e layout

| Superficie atual | Owner | Condicao atual | Destino | Regra de migracao |
| --- | --- | --- | --- | --- |
| Ambiguous session chooser | `route.ts:renderAmbiguous` | `routeData.kind === "ambiguous"` | H | Fora da pagina de chat; sem mudanca. |
| Route loading vazio | `route.ts` | `!routeData` | H | Sem mudanca. |
| Pane boot shell | `chat-pane-render.ts:ChatPane.render` | `!state` | H | Sem mudanca. |
| Split columns/panes | `chat-page.ts:renderSplitLayout` | persisted split layout | H | Sem mudanca. |
| Active-only narrow pane | `chat-page-pane-render.ts` | narrow e pane nao ativa | H | Sem mudanca. |
| Split dividers | `chat-page.ts` | wide split e nao ultimo item | H | Sem mudanca. |
| Session drop indicator | `chat-page.ts` | drag reconhecido, wide, drop zone valida | O | Sem mudanca. |
| Dashboard/board face | `chat-pane-board.ts`, `board-session-surface.ts` | board com tabs/widgets e face selecionada | H | Fora desta migracao; chat dockado reutiliza o mesmo Details por pane. |
| Existing side panel | `chat-pane-sidebar-layout.ts`, `chat-sidebar-region.runtime.ts` | `layout.open` | H | Continua para conteudo profundo; nao vira o novo Details. |

### 3.2 Header e chrome

| Superficie atual | Owner | Condicao atual | Destino | Regra de migracao |
| --- | --- | --- | --- | --- |
| Mobile nav toggle | `components/chat-pane-header.ts:renderChatPaneHeader` | `mergedChrome` | H | Permanece. |
| Incognito lock | mesmo | `session.incognito` | H | Permanece como identidade critica. |
| Project/workspace crumb | `renderProjectCrumb` | nao catalog e `workspaceLabel` | D | Trigger do Details assume o resumo; path/reveal/copy entram em Environment. O titulo da sessao permanece no header. |
| Parent session crumb | `renderParentSessionCrumb` | parent distinto e presente na lista | H | Permanece como navegacao hierarquica e nao se duplica no Details. |
| Session title/rename | `renderSessionCrumb` | row mutavel, nao catalog, access; input quando editing | H | Permanece. |
| Owner chip/participants | `renderChatPaneHeader` | multiplos creators/owners ou participants | D | Mover para Session/People. Incognito continua no header. |
| Presence facepile | `chat-pane-header.ts` | nao catalog e viewers qualificados | D | Mover para Session/People; trigger pode mostrar avatar cluster quando relevante. |
| Cloud placement | `chat-pane-placement.ts` | cloud-worker placement state | D | Environment; moving/failure continua gerando indicador urgente no trigger e erro visivel quando necessario. |
| Sharing control | header owner | `session.visibility.set` advertised | D | Session/People; preservar lazy member load e scopes por acao. |
| Transcript branch selector | header owner | nao catalog e `branches.length > 1` | D | Section Session/Conversation branch, distinta da Git worktree branch. |
| Native gateway picker | `renderGatewayPicker` | native host, snapshot, >1 gateway, nao onboarding | D | Environment; manter health, primary e Alt-open behavior. |
| Board face control | header owner | board com tabs/widgets | H | Permanece como layout mode. |
| Browser quick action | `chat-pane-header.ts` | browser callback disponivel | D | Environment action; abre o panel existente. |
| Background tasks quick action | mesmo | nao catalog | D | Subagents/Processes section; abre tasks panel. |
| Existing side-panel toggle | mesmo | sempre | H | Permanece, pois abre ferramentas profundas independentes do summary. |
| Discussion/diff/files/companion entries do session menu | `chat-pane-header.ts` / `chat-header-session-menu.ts` | non-catalog/capability; no header direto apenas em configuracoes especificas | D | Viram rows/actions do Details e saem das entradas equivalentes do session menu quando houver duplicacao; continuam abrindo slots existentes. Browser e background tasks sao os quick actions diretos atuais. |
| Split view/down/right/close | mesmo | callbacks e largura | H | Permanecem. |
| Command palette | mesmo | `mergedChrome` | H | Permanece. |
| Session kebab | `chat-header-session-menu.ts` | row/state | H | Permanece para lifecycle destructive e view prefs; evitar duplicar tudo no Details. |
| Continue in terminal dialog | `chat-pane-header.ts` | command atual resolvido | O | Permanece modal/overlay. |

### 3.3 Notices e estados globais

| Superficie atual | Owner | Condicao atual | Destino | Regra de migracao |
| --- | --- | --- | --- | --- |
| Disk warning/critical | `chat-view-notices.ts:renderDiskSpaceNotice` | placement active e status != ok | O + D | Continua callout visivel; Environment mostra status resumido. |
| General chat error | `renderChatViewNotices` | `state.lastError` | O | Continua visivel e dismissible. Nao esconder. |
| Workspace conflict | `chat-workspace-conflict.ts` | conflict atual nao dismissado por staged ref | O + D | Continua callout; Environment/Changes pode apontar para inspect/copy. |
| Focus exit | `chat-view-notices.ts` | `focusMode && onToggleFocusMode` | H | Caminho dormente hoje; sem migracao ate existir producer. |
| Cloud startup | `renderCloudStartupStatus` | startup state presente | T/O + D | Startup ativo e failure continuam visiveis como agent/environment activity; Environment resume placement. |
| Run error | `chat-composer-view.ts` | `runError` | T/O | Mover para final do turno/agent activity, sem esconder no Details. |
| Realtime voice/camera error | `chat-voice-activity.ts` | composer visivel, error e detail | C/O | Continua junto ao modo de input que falhou. |

### 3.4 Transcript e controles de leitura

| Superficie atual | Owner | Condicao atual | Destino | Regra de migracao |
| --- | --- | --- | --- | --- |
| Loading skeleton | `chat-thread.ts` / projection | loading e zero rows | T | Permanece. |
| Welcome/model setup/recent sessions/prompts | `chat-welcome.ts` | transcript vazio, nao loading, search fechada | T/O | Permanece como empty state. Model setup continua bloqueante. |
| No matches | `chat-thread.ts` | search aberta e projection vazia | T | Permanece. |
| User messages | thread build/group/projection | mensagem normalizada e visivel | T | Permanece. |
| Assistant messages/stream | mesmos owners | conteudo visivel, stream nao vazio | T | Permanece. |
| Tool call/result cards | grouping + `chat-tool-cards.ts` | `showToolCalls`; pairing/grouping | T | Permanece agent activity; detalhes expandidos e side detail continuam onde estao. |
| System/internal/guardian notices | `chat-thread-build.ts`, `chat-divider.ts` | mensagens/eventos reconhecidos; guardian oculto em search | T | Permanece. |
| Compaction/reset dividers | mesmos owners | durable special message | T | Permanece como boundary historico. |
| Workspace conflict transcript event | `chat-message-bubble.ts` | mensagem reconhecida | T | Permanece; e distinto do callout corrente. |
| Terminal question summary | question projection | prompt terminal da sessao | T | Permanece. |
| Realtime Talk transcript | projection/realtime renderer | conversation local nao vazia | T | Permanece. |
| Working indicator/startup phase/waiting approval | `chat-working-indicator.ts` | runWorking/empty stream/sending queue | T | Permanece atividade do agente. |
| Completed `Worked...` disclosure | grouping/stream renderer | dashboard turn concluido, reply final, search fechada | T | Permanece. |
| Turn recap | `chat-progress.ts` + projection | terminal fresh done dentro da janela | T | Permanece. |
| Subagent activity rows | `chat-subagent-activity.ts` | active ou terminal <60s; max 5; main run parado | T + D | Status curto continua no transcript; lista completa e detalhes ficam em Details. |
| Background-task aggregate | `chat-background-tasks-status.ts` | connected, active non-subagent tasks, main run parado | T + D | Status curto continua no transcript; click abre Details/Subagents, nao precisa abrir rail diretamente. |
| Swarm progress | `chat-swarm-progress.ts` | grupo com queued/running children | T + D | Mover da faixa pre-composer para uma activity row do transcript; Details oferece lista completa. |
| Teammates typing | `chat-composer-view.ts`, producer em sharing | input normal visivel e actors >0 | T | Mover para o limite final do transcript; manter expiry de 2.5s e ate 3 avatares. |
| Transcript search | `chat-thread-interactions.ts` | state `searchOpen`; Cmd/Ctrl+F | H | Continua controle do transcript, nao Details. |
| Earlier history sentinel/button | history + `chat-view.ts` | history loading definido / hasMore | H | Permanece. |
| Scroll to latest | `chat-view.ts` | `showNewMessages && onScrollToBottom` | H | Permanece. |
| Inline exec approval | `exec-approval-card.ts` | matching approval + callback; nao participation blocked | T/O | Incorporar como activity/action row no transcript. Nao Details. |
| Pending gateway question | `chat-question-card.ts` | pending prompt com session key equivalente | T/O | Remover takeover do composer; renderizar action row no transcript com collapse, navegacao e submit. Preservar IME/focus durante transicao. |
| Session suggestions de colaboradores | `chat-session-suggestions.ts` | multi-identity e lista nao vazia | T/O | Renderizar como collaboration activity no transcript. Send/queue/edit/dismiss permanecem; archived esconde send/queue/edit. |

### 3.5 Composer

| Superficie atual | Owner | Condicao atual | Destino | Regra de migracao |
| --- | --- | --- | --- | --- |
| Textarea | `chat-composer-view.ts` | composer normal visivel | C | Permanece. |
| Slash menu | slash owner | connected, canCompose e state visivel | C | Permanece. |
| Skill mention menu | skill owner | connected, canCompose, caret/query validos | C | Permanece. |
| Attachments inputs/previews/paste/drop | `chat-attachments.ts` | composer visivel/lista nao vazia | C | Permanece. |
| Reply preview | composer view | reply target | C | Permanece. |
| Plus/capability menu | `chat-composer-plus-menu.ts` | composer visivel; capabilities nao catalog | C | Permanece. Corrigir rotulo abrangente, pois nao e apenas attachment. |
| Permission picker | `chat-permission-picker.ts` | chat normal nao catalog | C | Permanece. |
| Model picker | `chat-model-picker.ts` | chat normal nao catalog | C | Permanece. |
| Reasoning/fast picker | `chat-effort-picker.ts` | thinking options ou fast visivel | C | Permanece. |
| Tool override pill | composer view | override count >0 e capability menu | C | Permanece como configuracao do proximo turno. |
| Microphone picker/dictation/Talk | composer controls | callbacks/capabilities | C | Permanece. |
| Camera input/preview/switch | attachments/voice owners | stream e devices/callbacks | C | Permanece. |
| Send/Stop/Steer/Queue | composer controls | run/draft/follow-up mode | C | Permanece. |
| Offline hint | composer view | `offlineStable` | C/O | Permanece, pois explica se input entrara no reconnect outbox. |
| Disabled reason | composer view | `disabledReason` | C/O | Permanece; input nunca desabilita silenciosamente. |
| Archived/recovery/model setup replacement banner | session creation + composer view | banner correspondente | C/O | Permanece junto ao input ausente. |
| Dictation status | composer view | dictation active | C | Permanece, pois e feedback do modo de input. |
| Message queue | `chat-composer-queue.ts` | itens cujo state != sending | C | Dependencia externa: a branch irma `composerqueue` integra a queue ao composer e preserva retry/steer/reorder/edit/remove/offline. Esta branch nao altera render, CSS, semantics ou testes da queue. |
| Queue edit marker | composer view | `editingId` | C | Dependencia externa da mesma frente `composerqueue`; esta branch apenas evita conflito com seu destino input. |
| Progress card | `session-progress-card.ts` | card e nao companion rail wide | D | Remover do composer; section Work/Plan. Nao depender da visibilidade do companion rail para existir no Details. |
| Goal | `chat-composer-goal.ts` | selected session goal | D | Remover do composer; section Work/Goal com edit/pause/resume/clear. |
| Context/provider usage | `chat-composer-context.ts` | context facts ou quota groups | D | Remover do composer; Environment/Usage. Compact continua acao contextual. |
| Fallback status | `chat-composer-status.ts` | active/cleared <8s | T/O + D | Status curto no transcript; provenance/model attempts em Details/Usage. |
| Compaction status | mesmo | active/retrying ou completed <5s | T/O | Status no transcript; durable divider continua historico. |
| Interrupted toast | mesmo | interrupted dentro da janela | T/O | Mover para agent activity no transcript. |

### 3.6 Details candidates hoje abaixo do transcript

| Superficie atual | Owner | Condicao atual | Destino | Regra de migracao |
| --- | --- | --- | --- | --- |
| Task suggestions | `chat-task-suggestions.ts` | suggestions >0 | D | Work/Suggested tasks; preservar modes, admin/write gates, busy/copy states. |
| PR/branch/changes rows | `chat-pull-requests.ts` | PR undismissed ou branch reportavel | D | Environment/Changes e Pull requests. |
| CI checks submenu | mesmo | PR `checks` presente | D | Row de PR abre sub-popover/inline disclosure; preservar external link e contagens nao-zero. |
| Pull request dismiss/show more | mesmo | callbacks/hidden count | D | Preservar local dismiss store e active-before-settled ordering. |
| Session suggestions | `chat-session-suggestions.ts` | suggestions >0 | T/O | Conforme acima: collaboration activity, nao metadata. |
| Swarm strip | `chat-swarm-progress.ts` | active swarm groups | T + D | Conforme acima. |

### 3.7 Existing panels e overlays

| Superficie | Owner | Condicao | Destino | Regra |
| --- | --- | --- | --- | --- |
| Detail/review panel | `chat-pane-embedded-panels.ts` | pane context; selected content/diff | D -> panel | Details abre esse owner para diff/tool/task detail. |
| Terminal | mesmo | enabled, connected/admin, method | D -> panel | Environment action. |
| Browser | mesmo | connected/admin/method | D -> panel | Environment action. |
| Files/workspace | mesmo | pane context | D -> panel | Environment action. |
| Companion | mesmo | pane context | D -> panel | Work/Session action; nao embutir companion inteiro no popover. |
| Tasks rail | mesmo | pane context | D -> panel | Subagents/Processes `View all`. |
| Desktop | mesmo | target/capability | D -> panel | Environment action. |
| Discussion | mesmo | config resolvida | D -> panel/external | Session action. |
| Board chat slot | mesmo | board exists | H | Sem mudanca. |
| Image lightbox | `chat-image-lightbox.ts` | selected image | O | Sem mudanca. |
| Reset confirmation | lifecycle owner | reset em sessao com board | O | Sem mudanca. |

## 4. Condicionais que o novo render deve preservar

### 4.1 Connected, disconnected e offline

- `connected` controla RPC/mutation live; `offlineStable` controla tratamento visual de reconnect.
- Texto e attachments comuns podem entrar na fila offline; slash commands nao.
- Queue reorder/remove continuam locais offline; retry/steer exigem connected + canCompose.
- Tasks em execucao nao podem continuar piscando como verdade durante disconnect; o summary atual as suprime e o panel mostra disconnected.
- Model/reasoning, goal mutation, Talk/dictation e capability mutation mantem seus disabled reasons.
- Details pode abrir offline usando ultimo snapshot, mas rows stale precisam de tratamento muted; nenhuma acao live deve parecer disponivel.

### 4.2 Sessao ausente, catalog e loading

- Ausencia de `GatewaySessionRow` nao desabilita o composer por si so.
- Catalog substitui messages/loading/pagination e omite live tools, questions, tasks capabilities e composer controls conforme hoje.
- Catalog com `canContinue !== true` mantem motivo view-only no composer, apenas depois do loading terminar.
- Header/Details omite facts ausentes; nao inventa placeholders para branch/path/gateway.
- Model setup splash continua apenas quando nao ha messages, tools, stream segments, stream ou queue.

### 4.3 Participacao e suggestions

- Participation block observado durante loading continua retido para evitar writable flash.
- Suggestion composer existe apenas no conjunto exato de multi-identity, visibility, role, scopes e methods atual.
- Suggestion composer nao oferece attachments, capabilities, compact ou realtime Talk.
- Pending exec approval/question continuam omitidos para participation-blocked/catalog conforme producers atuais.

### 4.4 Active run

- `sending || stream !== null` continua busy; abort exige run abortable e nao terminal.
- Submitted queue item pode projetar in-progress antes do run status.
- Working, startup, waiting approval, tool progress, interruption, fallback e compaction aparecem no transcript activity.
- Details nao substitui a sinalizacao do run.

### 4.5 Loading, empty e error states

- PR store preserva ultimo snapshot em rate limit/unavailable; badge de staleness continua.
- Background tasks preservam buffered events durante dual-list load; erro bloqueia auto-loop ate refresh manual.
- Task suggestions nao ganham skeleton artificial; event-delivered cards sobrevivem a list failure.
- Progress card nao possui loading/error proprio; ausencia significa section omitida ou empty Work quando outros itens existirem.
- Branch/worktree header fetch hoje preserva ultimo valor e falha silenciosamente; Details nao deve transformar isso em erro falso.
- General, run, cloud, disk e conflict errors mantem outcomes visiveis fora do popover.

## 5. Reverse engineering da referencia Codex desktop

Inspecao somente-leitura realizada em `/Applications/ChatGPT.app`, bundle `com.openai.codex`, versao `26.810.52044` (build `6662`). O renderer esta em `Contents/Resources/app.asar`.

Assets relevantes dentro do ASAR:

- `webview/assets/local-conversation-page-DSaHQbBd.js`: trigger do topo direito e estado overlay/pinned.
- `webview/assets/local-conversation-thread-CShhuS2f.js`: composicao Environment, Changes, Subagents e Sources.
- `webview/assets/app-initial-BqZ9AFkF.js`: primitives, branch picker e commit/push workflow.
- `webview/assets/app-HA18C9Gp.css`: tokens e medidas.

Estrutura confirmada:

```text
HeaderAction (end aligned)
  Popover trigger, aria-haspopup=dialog
  PopoverContent, role=dialog, non-modal
    Environment
    Changes / This branch
    Pull requests
    Side chats / Created tasks
    Subagents
    Background processes
    Sources
```

Medidas/tokens confirmados:

- largura `300px`;
- max-height `min(available-height, 100vh - 16px)`;
- surface radius `20px`;
- section horizontal inset `14px`;
- scroller top `10px`, bottom `6px`;
- gap entre sections `12px`;
- separator `0.5px`, inset `14px`;
- texto base `14px`, small Electron `13px`, extra-small `12px`;
- shadow com stroke de `0.5px`, duas camadas suaves de 3/7.5px e 20px;
- Escape/outside dismiss; focus retorna ao trigger; popover nao prende foco.

Branch picker confirmado:

- busca debounce `200ms`;
- resultado remoto limitado a 20, recentes a 100;
- current/recent/default/search combinados;
- row atual pode mostrar `Uncommitted: N files`;
- acao `Create and checkout new branch`;
- create valida nome, recusa trailing `/` e branch existente;
- conflito de working tree conduz a commit-and-switch, nao falha silenciosa.

Commit or push confirmado:

- e um dialog/command surface aberto pelo row, nao um menu simples;
- largura `420px`, max `92vw`;
- textarea de 3 rows/`80px` com placeholder “leave blank to generate”;
- checkbox Include unstaged changes com diff stats;
- acoes Commit, Commit and push e Push;
- Cmd/Ctrl+Enter aciona a opcao selecionada;
- workflow explicita phases creating-branch/committing/pushing e fecha ao iniciar.

Subagents/Sources confirmados:

- Subagents separa ativos/concluidos, mostra ate quatro avatars no compact summary, shimmer no ativo, diff stats e abre a conversa do child.
- Sources agrupa local files, URLs/resources, web search, tool/MCP, hostnames e images; compact list abre panel completo.

Limite de evidencia: cores finais dependem do theme e posicao exata depende do collision placement. A referencia confirma estrutura, medidas, estados e semantica, nao um pixel coordinate universal.

## 6. Anatomia proposta para o OpenClaw Details

### 6.1 Trigger

- Local: `chat-pane__actions`, antes do session kebab e junto aos controles de topo direito.
- Icone: summary/details coerente com o icon set existente; label acessivel `Session details`.
- Estado: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, pressed visual quando aberto.
- Attention compacta, sem virar dashboard:
  - avatar cluster + `N working` quando subagents/tasks ativos;
  - `+N -N` quando ha changes e nenhum alerta mais urgente;
  - dot warn/danger para disk/conflict/placement failure;
  - nenhum badge quando vazio/idle.
- O trigger fica por pane/presentation. Pane hidden nao anuncia nem rouba foco.

### 6.2 Container

- Popover end-aligned, nao modal, `role="dialog"`.
- Largura alvo 320px usando tokens OpenClaw; 300px da referencia e baseline, mas labels/actions do produto sao mais longos.
- Max-height pelo espaco disponivel e viewport menos 16px; scroller interno unico.
- Radius/sombra derivados dos tokens atuais do app, aproximando 20px e stroke sutil sem copiar cores hardcoded.
- Escape/outside click fecha e devolve foco.
- Em pane estreita/mobile: largura `min(calc(100vw - 16px), 360px)`, end-aligned ao trigger, sem converter em side panel. Collision placement pode abrir abaixo/esquerda, mas continua popover.
- Sections colapsaveis somente quando houver densidade. Environment abre por default; terminal sections auto-collapse quando nao ativas.

### 6.3 Sections e rows

#### Environment

Environment usa uma action de overflow/launcher para superficies disponiveis: Files, Terminal, Browser e Desktop, alem de gateway/placement actions quando aplicavel. Isso e uma adaptacao OpenClaw; na referencia Codex, Environment possui actions proprias, enquanto o `+` de attach/connect pertence a Sources. Nao usar `+` em Environment sem uma semantica de criacao/adicao real.

Rows, quando os facts existem:

1. Workspace: icon + label + basename; click abre Files, trailing external/reveal quando permitido.
2. Placement: Gateway/local/cloud/node + state; click abre move/reclaim flow.
3. Git branch: icon + branch + chevron; abre branch sub-popover.
4. Changes: diff icon + `+N -N`; abre existing session diff panel.
5. Pull request: PR icon + `#N`, repo/state; external arrow abre URL.
6. CI: status dot + counts; disclosure/sub-popover abre breakdown e checks link.
7. Gateway: somente native multi-gateway; health + current name + chevron.
8. Context/usage: compact percentage/quota; click abre usage sub-popover ou route existente; Compact aparece quando elegivel.

Branch sub-popover faseado:

- Fase inicial reutiliza a branch-history capability ja existente apenas para conversation branches, claramente rotulada `Conversation branch`.
- Git checkout branch exige contrato de list/search/checkout/create que o Control UI atual nao oferece na mesma forma. Nao simular com transcript branches.
- So implementar search/create Git branch quando os RPCs atuais comprovarem suporte completo, working-tree conflict e disabled reasons. Ate la, Git branch row e informativo/copyable e transcript branch fica em section Session.

Commit/push:

- OpenClaw hoje oferece diff/Create PR, mas nao ha no inventario da pagina um owner equivalente ao workflow completo de commit/push da referencia.
- Nao criar shell execution ad hoc nem inferir git commands no browser.
- Fase futura depende de contrato Gateway tipado para status, generated message, include unstaged, commit, push, progress/cancel e working-tree errors.
- Quando esse contrato existir, usar dialog 420px/max 92vw com textarea, checkbox/diff stats e as tres acoes da referencia.

#### Work

Rows:

1. Goal: status icon + objective truncada + elapsed/status trailing. Click expande detalhes e acoes edit/pause/resume/clear.
2. Progress: current step + completed/total. Click expande Markdown e step list.
3. Suggested tasks: cada suggestion como row/card compacta; start/mode/copy/dismiss preservados.
4. Companion: observer digest/headline, quando presente; click abre companion panel.
5. Workboard link: quando card associado existe, abre card/board existente.

Nao mostrar section vazia se nenhum desses itens existir.

#### Subagents

Header:

- cluster de ate quatro avatars;
- `N working`/`N recent`;
- action `+` apenas se houver um fluxo existente e permitido para criar/delegar; sem tal owner, usar `View all`, nao um `+` decorativo.

Rows:

- subagents ativos primeiro, depois terminal-retained;
- status, label/title, elapsed/relative time e optional `+N -N`;
- click abre task detail/conversation existente;
- background processes separados dos subagents, mas na mesma section;
- swarm groups podem entrar como aggregate rows e expandir children;
- footer `View all` abre tasks panel.

O status curto de atividade continua no transcript. Details e a visao inspecionavel, nao a unica indicacao de trabalho.

#### Session

Rows:

- owner/participants/presence cluster;
- sharing/visibility;
- conversation branches;
- discussion;
- incognito como fact somente se a informacao adicional for util, mantendo o lock no header.

Nao mover rename, split/layout ou destructive session lifecycle para esta section; continuam no header/kebab.

#### Sources

Nao existe hoje um producer dedicado de Sources/citations no chat OpenClaw. Portanto:

- nao criar uma section vazia;
- files/artifacts conhecidos permanecem em Environment/Files;
- tool links e attachments permanecem no transcript;
- uma futura Sources section exige um owner canonico de provenance, agrupamento e actions, em vez de reconstruir fontes a partir de mensagens.

### 6.4 Sub-popovers e dialogs

- O parent Details pode permanecer montado com no maximo um child popover ativo. O child ancora no row trigger, recebe Escape primeiro e devolve foco ao row sem fechar o parent.
- Um segundo child substitui o primeiro. Escape seguinte ou outside interaction fecha o parent e devolve foco ao trigger do header.
- Dialogs de confirmacao/mutacao podem fechar o popover principal, desde que guardem trigger para focus restore.
- Rows com external URL usam anchors reais, `target=_blank`, `rel=noopener noreferrer`.
- Rows disabled continuam visiveis quando o motivo informa o operador; reason em tooltip/description.

## 7. Arquitetura proposta

### 7.1 Novo render owner, mesmos data owners

Criar um componente/render owner de summary popover proximo ao header, por exemplo:

- `ui/src/pages/chat/components/chat-details-popover.ts`
- `ui/src/pages/chat/components/chat-details-environment.ts`
- `ui/src/pages/chat/components/chat-details-work.ts`
- `ui/src/pages/chat/components/chat-details-subagents.ts`

Comecar em um arquivo e dividir apenas quando o owner ultrapassar clareza/limite. Evitar um novo framework de panels.

`chat-pane-render.ts` ja possui quase todos os facts e callbacks. Hoje, porem, workspace reveal/copy, sharing scopes, native gateway actions, placement actions e parte dos panel actions sao preparados dentro de `ChatPaneHeader.renderPaneHeader`. Antes de mover UI, extrair dali um unico modelo preparado, consumido por header e Details. Esse owner compartilhado monta um `ChatDetailsProps` fechado sem rederivar policy, access ou callbacks e sem fazer o Details redescobrir estado por loaders globais.

Facts carregados antecipadamente continuam antecipados:

- tasks seguem em `createBackgroundTasksProps`;
- PRs seguem no shared session PR store;
- workspace segue em `createSessionWorkspaceProps`;
- progress segue em `SessionProgressCardController`;
- session/placement/goal seguem no selected row;
- provider usage segue no model-auth/session context owner.

O popover nao faz polling, filesystem discovery, PR refresh ou task loads por conta propria.

### 7.2 Estado local

Estado efemero por `presentationId`:

- open/closed;
- section collapsed state;
- active child popover;
- local branch/search query quando essa fase existir;
- focus restore target.

Nao persistir open state inicialmente. O Codex oferece pinned mode, mas o pedido atual e popover. Persistencia criaria uma nova preference sem beneficio comprovado.

### 7.3 Existing side panels

Details e side panel sao complementares:

- Details resume e oferece entry points.
- Existing panel mostra diff, files, task transcript/detail, terminal, browser, desktop, discussion e companion.
- Abrir um entry point chama `openPanelSlot`/`state.handleOpenSidebar` existentes.
- O side-panel toggle generico permanece no header para power users e layout management.

### 7.4 Transcript activity adapters

Approvals, questions, teammates typing e swarm hoje sao siblings do transcript. Para coloca-los no transcript sem quebrar o virtualizer:

1. definir itens de projection tipados ou um bounded activity-footer slot owned pelo transcript controller;
2. manter identity keys estaveis por approval/question/task/group;
3. preservar live-region boundaries para nao anunciar rich controls inteiros;
4. nao transformar pending UI em durable history;
5. terminal question summary continua sendo o unico registro durable depois da resolucao.

O live announcement persistente hoje renderizado pelo composer tambem migra para esse owner. Run working/done/interrupted, waiting approval e startup mantem um unico `aria-live` atomico e persistente no transcript; remover status visual do composer nao pode remover a narracao de transicoes.

Evitar simplesmente posicionar esses elementos com CSS sobre o transcript: scroll/reveal/virtualization precisam conhecer a altura real.

### 7.5 Composer queue integration (dependencia externa)

Ownership: agente/branch irma `composerqueue`. Nao implementar nesta branch.

Contrato esperado para composicao entre as branches:

- mover `renderChatQueue()` de sibling anterior ao shell para dentro de `.agent-chat__composer-shell`, antes da writing surface;
- shell passa a ser owner unico de queue + composer;
- queue usa `width: 100%`, `max-width: none` e spacing do shell;
- nao mover inicialmente para dentro da borda `.agent-chat__input`, pois isso altera menu anchoring, short-landscape scrolling e sticky footer;
- depois da verificacao visual, avaliar uma surface unificada com queue visualmente encaixada.

Semantica a cargo da frente `composerqueue`: `role="status"` hoje envolve controles interativos; a frente dedicada decide a separacao do live announcement textual.

Esta branch deve:

- nao editar `chat-composer-queue.ts` nem CSS/tests exclusivos da queue;
- nao mover sua chamada em `chat-composer-view.ts`;
- aceitar a forma final entregue pela branch irma ao resolver stack/rebase;
- manter qualquer novo Details/transcript layout desacoplado da posicao interna da queue;
- sinalizar conflito imediatamente em vez de reimplementar a integracao.

## 8. Fases de implementacao

Cada fase deve ser um commit local granular. Nao abrir PR ate nova ordem.

### Fase 0: fixture e esqueleto navegavel

1. Expandir o mock dev somente com cenarios desta frente ja suportados pelo harness: idle, active run, PR/CI/changes, goal/progress, tasks/subagents, approval/question, shared suggestions e errors. Consumir o cenario de queue da branch irma quando ele estiver disponivel; nao cria-lo aqui.
2. Criar Details trigger/popover vazio usando uma primitive ancorada capaz de `role="dialog"`, non-modal, focus restore e collision handling. `wa-dropdown` isolado nao serve porque carrega semantica de menu.
3. Confirmar anchor, focus, Escape/outside dismissal, collision e retained pane behavior.

Commit sugerido: `feat(ui): add chat details popover shell`.

### Fase 1: Environment

1. Projetar workspace, placement, branch, changes, PR/CI, gateway e usage props.
2. Extrair o modelo preparado compartilhado entre header e Details para workspace access, sharing, gateway, placement e panel actions.
3. Mover project/workspace, placement, gateway e quick actions redundantes do header para Details.
4. Mover PR/CI/branch rows de baixo do transcript.
5. Rows abrem owners existentes de diff/files/browser/terminal/desktop e URLs.
6. Preservar rate limit/unavailable snapshots, dismiss state e scopes.

Commit sugerido: `feat(ui): move session environment into details`.

### Fase 2: Work

1. Mover goal e progress card do composer.
2. Mover task suggestions de baixo do transcript.
3. Adicionar companion/workboard entry points quando existentes.
4. Remover a regra de placement mutualmente exclusiva progress-card-in-composer/rail; Details recebe o card autoritativo e companion pode manter sua propria representacao somente se o operador quiser duplicacao.

Commit sugerido: `feat(ui): collect session work in details`.

### Fase 3: Subagents e processes

1. Details lista tasks/subagents/swarm com status e deep links.
2. Transcript mantem apenas activity summaries curtos.
3. Mover swarm progress para transcript projection/activity footer.
4. Click de aggregate abre Details section; View all abre tasks panel.
5. Preservar eager loading, disconnected suppression, buffered events e terminal retention.

Commit sugerido: `feat(ui): summarize subagent work in chat details`.

### Fase 4: Agent interaction no transcript

1. Integrar inline approval ao transcript activity flow.
2. Integrar pending gateway question sem composer takeover.
3. Integrar teammate typing no limite final do transcript.
4. Integrar session suggestions como collaboration activity.
5. Mover cloud startup ativo/failure/retry, run error, interrupted, fallback e compaction transient status para activity owner; Environment mantem apenas o resumo de placement.
6. Mover o live announcement persistente do composer para o transcript, preservando working/done/interrupted/waiting-approval/startup.
7. Validar keyboard/IME/focus e screen-reader announcements.

Commit sugerido: `refactor(ui): keep agent interaction in the transcript`.

### Fase 5: Composer input-only (sem queue)

1. Remover progress, goal, context usage e run status restantes do composer.
2. Manter disabled/offline/input-mode feedback.
3. Nao tocar na integracao, semantics, CSS ou testes da message queue.
4. Conferir apenas que o layout desta branch aceita a queue integrada fornecida pela branch irma sem sobreposicao ou duplicacao.

Commit sugerido: `refactor(ui): make the chat composer input only`.

### Fase 6: Picker polish

1. Unificar altura, radius, foreground, hover/open/focus e menu surface de model, reasoning, permission, plus e microphone.
2. Preservar implementacoes (`details + wa-popup` versus `wa-dropdown`) quando a troca nao pagar risco; unificar linguagem visual por tokens/classes compartilhados.
3. Corrigir icon hierarchy e active-state vocabulary.
4. Corrigir plus label para capabilities/attachments.
5. Ajustar attachment previews a luminance/radius do composer multiline.
6. Manter desktop hit area minima e mobile 44px.

Commit sugerido: `polish(ui): align composer input controls`.

### Fase 7: limpeza e documentacao de comportamento

1. Remover CSS/props/render paths mortos apenas depois que todos os cenarios estiverem cobertos.
2. Atualizar `docs/web/control-ui.md`, `docs/tools/progress-card.md` e `docs/tools/goal.md`, que hoje afirmam rail/composer placement.
3. Atualizar English i18n source e baseline, sem editar translations geradas manualmente.
4. Registrar qualquer feature deliberadamente adiada: Git checkout create/switch e commit/push.

Commit sugerido: `docs(ui): document chat details and input-only composer`.

## 9. Verificacao visual durante iteracao

Por ordem do operador, esta frente nao roda testes/CI/build durante a iteracao. Verificacao manual usa:

```bash
node --import tsx scripts/control-ui-mock-dev.ts --port 5215
```

Checklist no mock HMR:

- desktop wide, split panes e dashboard-docked chat;
- pane estreita e viewport mobile;
- popover end-aligned sem clipping, scroll interno e focus restore;
- pane retained hidden nao abre/anuncia popover;
- idle sem Details facts nao mostra sections vazias;
- offline com a queue fornecida pela branch irma, apenas para checar composicao visual desta frente;
- active run com working/tools/approval/question/subagents/typing;
- archived, recovery tombstone, model setup, model unavailable e shared read-only;
- attachments, reply, dictation, Talk/camera e suggestion composer;
- goal/progress/task suggestions;
- PR open/draft/merged, CI passing/failing/pending, rate limited e branch-only changes;
- disk warning/critical, workspace conflict, cloud moving/failed;
- keyboard: Escape, Tab, Cmd/Ctrl+F e Enter send; queue edit pertence a verificacao da frente `composerqueue`;
- light/dark themes e text-size setting.

## 10. Riscos e mitigacoes

### P0: esconder outcome acionavel

Risco: approval/question/error migra para um popover fechado e a acao termina sem outcome visivel.

Mitigacao: approvals/questions/agent failures ficam no transcript ou overlay principal. Details apenas aponta para diagnostico complementar.

### P0: quebrar retained panes e async fencing

Risco: um novo component lifecycle dispara loads duplicados ou publica dados de sessao antiga.

Mitigacao: Details recebe facts preparados de `ChatPane.render`; nenhum loader/subscription novo no popover. Respeitar presented/active e generation fences.

### P1: virtualizer e scroll jump

Risco: mover action cards e activity para dentro do transcript sem row identity/height owner causa jumps e reveal incorreto.

Mitigacao: projection items tipados/estaveis ou bounded transcript footer sob o controller; nao usar CSS overlay.

### P1: composer IME/focus

Risco: remover question takeover perde composition draft, focus restore ou stale-input suppression; a branch irma pode tocar a mesma vizinhanca para integrar queue.

Mitigacao: manter handlers/refs existentes; alterar somente o render placement em passos pequenos; nao editar a queue; revalidar IME apos integrar/rebasear a frente irma.

### P1: responsive collision

Risco: popover de topo direito clipa em split/narrow/mobile ou fica por baixo de menus do composer.

Mitigacao: primitive de popover com available-height/collision; z-index no sistema existente; viewport width bounded; nao usar fixed coordinates.

### P1: duplicacao Details versus side panel

Risco: dois sistemas aparentam competir.

Mitigacao: Details e summary/launcher; side panel e workspace profundo. Labels e actions deixam a transicao explicita.

### P1: progress card duplicado ou perdido

Risco: regra atual move o unico card entre composer e companion rail por largura; novo Details pode duplicar ou ocultar.

Mitigacao: card autoritativo sempre disponivel ao Details; definir deliberadamente se companion mantem espelho. Nunca condicionar Details a rail visible.

### P1: git operations sem contrato

Risco: copiar a referencia Codex e executar git por shell/browser, sem typed errors, approval ou workspace ownership.

Mitigacao: fase inicial e read/open-only. Create/switch/commit/push ficam bloqueados ate existir Gateway contract completo e prova de conflitos/progress/cancel.

### P2: popover denso demais

Risco: mover tudo produz um mini dashboard ilegivel.

Mitigacao: sections condicionais, rows compactas, status agregado, progressive disclosure e View all para panels existentes.

### P2: i18n e copy drift

Risco: novos labels nao entram no catalog canonico ou traducoes geradas sao editadas manualmente.

Mitigacao: editar somente English source, rodar baseline na fase de fechamento e deixar locale workflow gerar outputs.

### P2: accessibility de live regions

Risco: dynamic sections anunciam controles inteiros repetidamente; a queue possui risco semelhante, mas pertence a `composerqueue`.

Mitigacao: nesta branch, transcript activity usa announcements atomicos e o popover nao e live region. A separacao do live text da queue fica com a frente dedicada.

## 11. Decisoes deliberadamente adiadas

- Pinned Details side panel: fora do pedido; o app de referencia suporta, mas OpenClaw ja possui side panel proprio.
- Git branch search/create/checkout: depende de contrato atual suficiente e prova de conflito.
- Commit/commit-and-push/push: depende de Gateway API tipada; nao sera implementado com shell ad hoc.
- Sources section: depende de provenance owner canonico.
- Persistencia de sections/open state: so depois de observar uso real.
- Remocao do existing generic side-panel toggle: nao faz parte desta tese.

## 12. Criterio de pronto da implementacao futura

- Composer contem apenas input e configuracao do proximo turno; a fila de input pendente aparece integrada quando a dependencia `composerqueue` for incorporada.
- Transcript contem conversa, agent/tool/run activity, teammate activity e requests que exigem resposta.
- Nenhuma faixa de goal/progress/task/PR/CI/environment/subagent detail orbita o composer.
- Details popover abre do topo direito, agrupa facts atuais e encaminha para owners profundos existentes.
- Toda condicional atual de connection/session/access/run/loading/error continua observavel.
- Nenhuma operacao antes visivel passa a falhar silenciosamente.
- Mock HMR foi inspecionado em desktop/mobile e nos estados listados.
- So depois da ordem do operador: checks proporcionais, autoreview, push e PR stackada.
