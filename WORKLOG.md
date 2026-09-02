# Composer stack worklog

## Feito

- Li integralmente os prompts iniciais em `~/lanes/`, antes da atualização de rota.
- Após a atualização do maintainer, reli integralmente as fontes canônicas `.lanes/composer-stack-prompt.md` e `.lanes/PLAYBOOK.md` no checkout principal.
- Li `ui/AGENTS.md` e a skill `control-ui-e2e`.
- Atualizei `origin/main` e criei este worktree detached em `8a2f6c3c770`.
- Liguei `node_modules` da raiz, `ui/` e `packages/*` a `/home/ubuntu/veredito-mine/repo`; não rodei `pnpm install`.
- Rodei `pnpm docs:list`; não havia documentação de produto relevante para um ajuste puramente geométrico já pertencente ao shell da Control UI.
- Li os renderizadores reais da pilha (`ui/src/pages/chat/components/chat-composer-view.ts`, Goal, queue e progress card), seus chamadores e os estilos donos da geometria.
- Adicionei ao harness uma fixture local `composer-stack` com Goal ativo, progress card real (Progress note colapsado / Task progress expandido) e duas entradas reais da queue. A fixture é bancada e não é mudança de produção.
- Iniciei o harness canônico na porta 6004 com `--fixture composer-stack`; reinícios por mudança de boot usaram exclusivamente o PID exato da porta e a mesma linha de comando.
- Capturei e olhei a bancada em Chromium headless, sem `open`, nos viewports desktop 1440x1000 e mobile 390x844. Artefatos: `.artifacts/control-ui-e2e/composer-stack/before/`.
- Confirmei que o disclosure de progress alterna visivelmente entre Progress note/estado resumido e Task progress/estado expandido; os controles da queue e do Goal também são controles reais.

## Auditoria de largura

- Largura canônica — composer shell: `ui/src/styles/chat/layout.css:2110` define o grid; `ui/src/styles/chat/layout.css:2120` aplica o inset lateral, `:2121` o máximo de 48rem e `:2122` centraliza. Medido: 768px desktop (x=465..1233) e 374px mobile (x=8..382).
- Progress note / Task progress — mesmo componente real: `ui/src/styles/chat/composer-progress.css:179` é o card, com `box-sizing: border-box` em `:184` e `width: 100%` em `:186`; o wrapper também usa `width: 100%` em `:219-227`. Medido: 768px desktop e 374px mobile. **Não excede**.
- Message queue: `ui/src/styles/chat/composer-queue.css:11` é o dono; `box-sizing: border-box` em `:18`, `width: 100%` em `:20`, margem inline zero em `:21`. Medido: 768px desktop e 374px mobile. **Não excede**.
- Goal: wrapper em `ui/src/styles/chat/composer-progress.css:642-649` e card em `:651-665`; ambos usam 100%, com border-box no card. Medido: 768px desktop e 374px mobile. **Não excede**.
- Status underlap (offline/disabled/dictation): `ui/src/styles/chat/layout.css:3447-3462`, `width: 100%` em `:3452`. **Não excede**.
- Composer overlay notices/errors/run status: lane em `ui/src/styles/chat/layout.css:3715-3723`; cartões/error/underlap são normalizados para `width: 100%; max-width: none` em `:3734-3743`. **Não excedem**.
- Question dock: `ui/src/styles/chat/question-card.css:1-5` é item grid sem largura própria e portanto estica pela única coluna do shell; o painel real começa em `:11`. **Não excede**.
- Disabled/replacement banner: `ui/src/styles/chat/layout.css:3791-3805`, `width: 100%` em `:3792`. **Não excede**.
- Composer errors: `ui/src/styles/chat/layout.css:4282-4286`, `width: 100%` em `:4283`. **Não excede**.
- PR rows, session suggestions e swarm aparecem imediatamente antes do shell, mas são irmãos, não cartões anexados. Seus donos são `ui/src/styles/chat/layout.css:2197-2205`, `:2681-2685` e `:2836-2848`. Todos têm o mesmo máximo de 48rem e nenhum excede o composer; em mobile, o `calc(100% - 36px)` legado os deixa mais estreitos que o composer, não mais largos.
- Background task status não é parte da pilha: é projetado como linha do transcript em `ui/src/pages/chat/components/chat-transcript-projection.ts:630-639`, e estilizado como pill em `ui/src/styles/chat/tool-cards.css:2014`. Não possui superfície full-width capaz de exceder o composer.

## Causa e estado atual

- O relatório corresponde a um estado anterior a `origin/main`. O histórico mostra a correção estrutural já aterrissada em `18beca535036`: progress ganhou `box-sizing: border-box` e surface anexada; Goal/queue passaram a 100% e à mesma surface. Os donos atuais são `ui/src/styles/chat/composer-progress.css:179-198`, `:642-665` e `ui/src/styles/chat/composer-queue.css:11-33`.
- O alinhamento trailing foi centralizado em `6a31c5e994bf`: token `--chat-stack-trailing-control-size: 24px` em `ui/src/styles/chat/composer-queue.css:3-9`, consumido pelo Goal em `ui/src/styles/chat/composer-progress.css:363-374` e pelo progress chevron em `:760-774`.
- Medição atual dos controles: chevron de progress e chevron de Goal ocupam 24px e têm exatamente o mesmo x: desktop 1200..1224; mobile 349..373.
- Surface computada atual de progress, queue e Goal: `color(srgb 0.992157 0.990588 0.987451)` em ambos os viewports.
- Resultado da auditoria: **nenhum componente da pilha excede a largura canônica do composer em `origin/main` 8a2f6c3c770**.
- Delta final: produção 0 linhas; testes 0 linhas; bancada local `scripts/control-ui-mock-dev.ts` +63/-4; `WORKLOG.md` untracked. Nenhum commit.

## Decidido

- A largura canônica será medida no composer real, e a correção será feita no proprietário compartilhado de largura/gutter quando a leitura completa dos consumidores confirmar esse limite.
- A bancada usará somente componentes reais e o mock canônico na porta 6004, sem `open`, suites, build ou typecheck local.
- O marker final será escrito em `.lanes/markers/composer-stack.done`, conforme a atualização explícita; os caminhos antigos em `~/lanes` e `~/markers` estão aposentados para esta lane.
- Não alterar produção: uma nova regra seria duplicação sobre uma invariável que já está correta e comprovada no browser. A lane entrega a bancada e a auditoria, sem commit.

## Próximo

- Marker `.lanes/markers/composer-stack.done` escrito no caminho canônico atualizado.
- Bancada permanece servindo na porta 6004 para revisão do maintainer (GATE 1); aguardar instrução.

## Reabertura após reprovação do maintainer

- Olhei integralmente `.lanes/evidence/composer-stack/1232.png`, `1233.png` e `1234.png`. As capturas mostram um degrau visual entre as superfícies anexadas, especialmente na transição queue/Goal.
- A fixture `composer-stack` agora semeia entradas neutras/pendentes: removeu `sendState: "unconfirmed"`, portanto não usa mais o fundo rosa, o badge “Delivery uncertain” nem “Retry”.
- Medição via `getBoundingClientRect()` no mesmo page load, viewport CSS 1440×1000: progress, queue, Goal e composer têm todos `left=465`, `right=1233`, `width=768`.
- Repetição no viewport físico da captura `1234.png` (1652×686, DPR 1): os quatro têm todos `left=571`, `right=1339`, `width=768`.
- Raios superiores computados: progress `25px/25px`; queue `25px/25px`; Goal `0px/0px` quando conectado à queue; composer `25px/25px`.
- Bordas laterais computadas: `1px` em todos os quatro.
- A discrepância mensurável está no contorno pintado, não no retângulo: em light, progress e queue têm `0 0 0 1px rgb(0 0 0 / 6%)`; Goal tem `box-shadow: none`; composer volta a ter o anel externo. Isso produz um ink edge 1px fora do retângulo para progress/queue/composer, mas não para Goal.
- Nenhuma mudança de produção foi feita após esta medição, conforme a instrução de trazer os números antes de alterar quando contradissessem a foto.

## Correção concluída

- Owner confirmado: `ui/src/styles/chat/composer-queue.css`, na regra light-theme que pinta um anel externo de 1px na queue e no contrato adjacente queue/progress → Goal.
- Produção: Goal conectado agora pinta somente strokes laterais externos em `-1px` e `+1px`, ambos `rgb(0 0 0 / 6%)`. Não foi adicionada sombra horizontal nem alterado o dark theme.
- Pós-fix no viewport 1652×686: todos permanecem `left=571`, `right=1339`, `width=768`; Goal agora computa `box-shadow: rgba(0,0,0,.06) -1px 0px, rgba(0,0,0,.06) 1px 0px`.
- Fixture: fila é injetada como duas entradas reais `pendingRunId`, sem estado de erro, badge, Retry ou fundo rosa.
- Teste owner-boundary ampliado para bordas, raios, fundos das superfícies anexadas e strokes laterais do Goal.
- Evidências antes/depois refeitas em light/dark, abertas e inspecionadas; URLs atualizadas na issue #132796 e draft PR #132799.
- Codex autoreview do diff produção+testes contra `origin/main`: limpo, zero findings.
- Commit publicado: `014e99ec9a6`. Delta embarcado: produção `+11/-0`; testes `+43/-0`. Fixture e worklog permanecem fora do commit.

## Iteração Goal surface 1269

- Evidência `.lanes/evidence/composer-stack-1269-goal.png` aberta e inspecionada: o Goal externo ainda lia como superfície separada, com borda mais escura e side-only shadow ultrapassando visualmente a queue.
- Root cause: a correção anterior criou uma forma local de sombra; queue ainda possuía `--chat-queue-hairline` duplicado, enquanto task/composer usavam o contrato do composer.
- Fix canônico: `--chat-composer-light-outline` agora é produzido no owner do composer e consumido por composer, task, queue e Goal conectado. Queue passou a usar `--chat-composer-hairline`; Goal light usa border transparente e o mesmo outline completo de 1px. `--composer-attached-surface` continua sendo o background comum de task/queue/Goal.
- O pre-prompt interno do Goal não foi tocado.
- Medição desktop 1440×1000: task `.session-progress-card--composer`, queue border owner `.chat-queue`, external Goal `.agent-chat__goal` e composer `.agent-chat__input` = `left=465`, `right=1233`, `width=768`.
- Medição mobile 390×844: os mesmos quatro = `left=8`, `right=382`, `width=374`.
- Queue rows internas: `466..1232`/766px desktop e `9..381`/372px mobile, exatamente dentro da borda de 1px do seu border owner `.chat-queue`; não são a borda externa da pilha.
- Screenshots completos antes/depois refeitos em desktop/mobile e light/dark, todos abertos e inspecionados antes do upload.
- Draft PR #132799 atualizada; Codex autoreview limpo, zero findings. Commit `955b7847e88`.
- Delta embarcado atual: produção `+18/-12` (net +6); testes `+44/-0`.

## Auditoria adversarial 955b7847

- Reprodução focal válida no head anterior: `left=[110,110,110,110]` versus expectativa absoluta `[32,32,32,32]`; teste falhou na linha da geometria.
- Fix: cada superfície agora compara `left/right` ao `getBoundingClientRect()` do shell medido no próprio fixture.
- Override light queue/progress → Goal restrito a `.agent-chat__goal--active`.
- O contrato warn foi movido após a regra estrutural do Goal externo para preservar cascade de `blocked`, `budget_limited` e `usage_limited`; o teste alterna pelos três estados e exige background/border distintos do active.
- Pós-fix: teste focal passou (`1 passed`, `110 skipped`). Autoreview limpo. Novo SHA `040dc4d649ce2bced387e45606c60edd7fad1edf`.
