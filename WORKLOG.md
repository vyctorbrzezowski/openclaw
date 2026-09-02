# Goal Fit Worklog

## Feito

- Worktree detached criado de `origin/main` em `8a2f6c3c770` após `git fetch origin main`.
- Dependências ligadas por symlink a `/home/ubuntu/veredito-mine/repo` no root, `ui/` e pacotes disponíveis; nenhum `pnpm install` executado.
- Lei autoritativa relida: `.lanes/PLAYBOOK.md`, fases 1–2 e invioláveis. A atualização do maintainer substituiu os caminhos externos antigos por caminhos dentro do repo.
- Skill `prototype` e especificação canônica do picker lidas integralmente.
- Fechamento operacional recebido: issue e PR draft obrigatórias, sem land e sem ready.
- Preflight de duplicatas: `gitcrawl` indisponível no host; fallback live `gh search` não encontrou issue/PR com os termos de Goal/composer/radius/seam.
- Issue criada e atribuída a `vyctorbrzezowski`: `#132786`.
- Branch `goal-fit` publicada com commit vazio deliberado `b53b9f4184e`; nenhum arquivo de produção, teste ou bancada entrou no commit.
- PR draft criada e atribuída a `vyctorbrzezowski`: `#132787`, com `Closes #132786`.
- Autoreview Codex contra `origin/main`: limpo, sem findings aceitos/acionáveis; confirmou diff de código vazio.
- Contrato Codex inspecionado diretamente no checkout irmão: `../codex/codex-rs/exec/src/cli.rs:27`, `:35`, `:39` (flags de isolamento) e `../codex/codex-rs/exec/src/lib.rs:333` (aplicação dos overrides).
- Transcript local seguro foi localizado, mas não incluído sem autorização explícita, conforme o skill `agent-transcript`.
- Ordem de iteração recebida verbatim: `REFAZER — componente errado. O maintainer olhou a bancada e a PR 132787: voce mexeu na barra de goal RODANDO que fica EM CIMA do composer (evidencia .lanes/evidence/goal-fit-1235.png — Pursuing goal com timer). O pedido dele era o componente que aparece DENTRO do composer quando o modo /goal esta ativo, o pre-prompt: linha Goal — Enter your objective. com X, acima do input What should this goal accomplish? (evidencia .lanes/evidence/goal-fit-1236.png).`
- Evidências `goal-fit-1235.png` e `goal-fit-1236.png` abertas e inspecionadas visualmente; confirmam barra externa versus pre-prompt interno.
- Não havia mudança de produção na barra de Goal rodando para reverter; o diff desse estilo permaneceu vazio.
- Fixture `goal` deixou de injetar uma Goal em execução e agora ativa o modo `/goal` pela interação real do composer.
- Picker canônico montado com `Rounded base` e `Straight base`; teclas `1`/`2` e setas também alternam instantaneamente.
- Bancada reiniciada somente pelo PID exato da porta 6006, mantendo a linha canônica com `--fixture goal`.
- HTTP verificado em `200` e DOM renderizado confirmou `.agent-chat__goal-mode`, `Enter your objective.`, placeholder `What should this goal accomplish?` e ausência de `.agent-chat__goal-float`.
- Capturas locais das duas variantes foram abertas e inspecionadas: `.local/goal-fit-rounded.png` e `.local/goal-fit-straight.png`.
- Ordem de GATE 1 recebida: remover completamente o gap/costura entre o pre-prompt Goal e o corpo do composer, fixar `Straight base` e remover o toggle; nenhuma mudança de commit/PR nesta rodada.
- Evidência `.lanes/evidence/goal-fit-1251-gap.png` aberta e inspecionada: a borda interna e o respiro de `margin-bottom` separavam visualmente o pre-prompt do corpo.
- Bancada fixada em base reta. O pre-prompt agora sobrepõe em 1px a borda externa do composer (`margin: -1px -1px 0`) e remove a borda inferior (`border-bottom: 0`), eliminando a fresta e deixando o composer como uma superfície contínua.
- Picker e toda a alternância de variantes foram removidos da bancada.
- A transformação de boot não atualizou por HMR; bancada reiniciada somente pelo PID exato `2917318`, com a mesma linha canônica. Resposta atual confirmada em HTTP 200, contendo o encaixe novo e nenhum picker.
- Terceira rodada recebida: evidências `goal-fit-corner-1256.png`, `goal-fit-corner-1257.png` e `goal-fit-corner-1258.png` abertas e inspecionadas; mostravam o composer e o Goal desenhando dois contornos arredondados concorrentes.
- Invariante aplicado na bancada: `.agent-chat__input` é o único dono da borda/radius externo e recorta o conteúdo; `.agent-chat__goal-mode` não desenha borda externa nem radius, apenas uma hairline inferior interna reta.
- Primeira prova própria em 2× reprovada antes do marker: o seletor do harness tinha a mesma especificidade do CSS carregado depois, e o card interno ainda aparecia. Corrigido no owner contextual com `.agent-chat__input .agent-chat__goal-mode`.
- Segunda prova própria em 2× aprovada após inspeção visual: `.local/goal-fit-proof-left-2x.png`, `.local/goal-fit-proof-right-2x.png` e `.local/goal-fit-proof-junction-2x.png`. Ambos os cantos têm uma única curva externa; a junção é uma hairline interna reta; nenhum pixel de canto duplicado permanece.
- Bancada reiniciada somente pelos PIDs exatos `3125937` e `3146319` durante as duas tentativas de transformação de boot; linha canônica preservada. HTTP 200 confirmado no resultado aprovado.

## Decidido

- Escopo desta rodada: somente bancada isolada para comparar o encaixe da barra de GOAL no composer; produção permanece intocada até decisão explícita do maintainer.
- Variantes solicitadas: `Current`, `Flush`, `Soft base`, conforme `.lanes/goal-fit-prompt.md`.
- Picker usa a especificação canônica, sem replay porque a comparação é estática.
- Alvo corrigido: somente `ui/src/styles/chat/composer-progress.css:230` (`.agent-chat__goal-mode`), renderizado por `ui/src/pages/chat/components/chat-composer-goal-mode.ts:139` dentro de `ui/src/pages/chat/components/chat-composer-view.ts:340`.
- Radius superior de ambas as variantes: valor real do composer em `ui/src/styles/chat/layout.css:3309`, `calc(20px * var(--openclaw-corner-radius-scale))`.
- `Rounded base`: cantos inferiores em `10px`, preservando o valor real atual de `ui/src/styles/chat/composer-progress.css:237`.
- `Straight base`: cantos inferiores em `0`, formando a alternativa de seam reto pedida pelo maintainer.
- GATE 1 decidiu `Straight base`: cantos superiores permanecem no radius real do composer; cantos inferiores ficam em `0`; sem borda inferior nem margem entre pre-prompt e corpo.
- Refinamento final: o Goal não possui cantos externos próprios. O radius superior pertence exclusivamente ao card composer; a base do Goal é divisor interno, não borda externa.

## Reconhecimento do código real

- Dono do radius do composer: `ui/src/styles/chat/layout.css:3309`, com `border-radius: calc(20px * var(--openclaw-corner-radius-scale))`.
- Dono do estilo da barra de Goal ancorada: `ui/src/styles/chat/composer-progress.css:651`; o radius está em `ui/src/styles/chat/composer-progress.css:659` e já é `calc(20px * var(--openclaw-corner-radius-scale)) calc(20px * var(--openclaw-corner-radius-scale)) 0 0`.
- O encaixe relatado não se reproduz na geometria pedida: em `origin/main` (`8a2f6c3c770`), a barra já compartilha exatamente o radius superior do composer e já tem os dois cantos inferiores retos. A regra nasceu assim em `18beca535036` e não é uma alteração recente posterior ao despacho.
- O estilo genérico da barra em `ui/src/styles/chat/composer-progress.css:261` usa `var(--radius-lg)` nos quatro cantos, mas a barra ancorada é sobrescrita pelo seletor mais específico em `ui/src/styles/chat/composer-progress.css:651`; apresentá-lo como estado atual seria uma fixture infiel.

## Bloqueio

- As variantes `Current` e `Flush` solicitadas são byte-equivalentes na propriedade que deveria diferenciá-las. Um seletor entre elas não teria efeito visível e quebraria `.lanes/PLAYBOOK.md:1.7` e a ordem explícita do prompt.
- Não foi criada uma falsa variante “Current”, porque isso deixaria de reproduzir o código real e quebraria `.lanes/PLAYBOOK.md:1.6`.
- Decisão necessária do maintainer: fornecer o estado atual visual que deseja preservar como variante (ou nomear outro eixo real de diferença, por exemplo a geometria do seam/composer), ou retirar a variante duplicada.

## Próximo

- GATE 1 aprovado pelo maintainer. Executar o closeout da fase 3 sem land e mantendo a PR draft.

## Closeout — gate de escopo

- `ui/src/styles/chat/composer-progress.css`: único owner de produção tocado. Remove do pre-prompt Goal a margem, borda externa e radius próprios; mantém apenas o divisor inferior interno e faz o card do composer recortar o estado Goal. Pertence diretamente à tese de silhueta externa única.
- `ui/src/pages/chat/chat-responsive.browser.test.ts`: regressão no boundary visual real. Protege ausência de bordas laterais/radius/margem no Goal e ownership do recorte pelo composer. Falha no CSS anterior pelos cinco valores medidos; não exige seam de produção.
- `scripts/control-ui-mock-dev.ts`: fixture e instrumentação de before/after; deliberadamente fora do commit conforme fase 3.1.
- `WORKLOG.md` e `.local/goal-fit-close/*.png`: artefatos operacionais locais; deliberadamente fora do commit.

## Closeout — consumidores nominais

- Composer de mensagem normal: não contém `.agent-chat__goal-mode`; seletor contextual não aplica e o layout permanece nominal.
- Composer de criação de Goal: contém o pre-prompt real; passa a usar a borda/radius externos do composer e uma hairline interna reta.
- Composer de edição de Goal: reutiliza o mesmo `renderGoalMode`; recebe o mesmo encaixe integrado, conforme o invariante compartilhado.
- Preview de anexos e status do composer: continuam na mesma `.agent-chat__composer-lede`; nenhuma regra própria foi alterada.
- Composer da session rail: reutiliza `.agent-chat__input`, mas não contém `.agent-chat__goal-mode`; seletor contextual não aplica.

## Closeout — prova

- Capturas equivalentes geradas em 2× para before/after, desktop 1440×1000 e mobile 390×844, nos temas light e dark.
- Primeira tentativa dark foi rejeitada localmente após inspeção porque o bootstrap restaurou light; todas as quatro dark foram refeitas com a preferência persistida antes do bootstrap.
- As oito capturas finais foram abertas e inspecionadas individualmente antes do upload. Todas mostram o estado `/goal` real; os after não têm canto duplo, gap ou borda externa do Goal.
- Suites/build/typecheck locais não executados: `.lanes/PLAYBOOK.md` I.1 exige validação por CI no head publicado.
- Issue `#132786` reescrita para o pre-prompt Goal interno correto e atribuída a `vyctorbrzezowski`.
- PR draft `#132787` atualizada no template exigido em inglês, atribuída a `vyctorbrzezowski`, ligada por `Closes #132786` e preenchida com os oito anexos before/after inspecionados.
- Head publicado: `4ec957fe0b52430bf23791a065f670773c7091be`; branch remoto confere com o SHA local de 40 caracteres e a PR permanece draft.
- Escopo final commitado contém somente `ui/src/styles/chat/composer-progress.css` e `ui/src/pages/chat/chat-responsive.browser.test.ts`; harness e worklog permanecem fora do commit.

## Auditoria adversarial — correção

- Finding bloqueante confirmado: `overflow: hidden` no composer com Goal sobrescrevia o `overflow-y: auto` do landscape curto e recortava o popover Context absoluto.
- Relatório ClawSweeper atual lido integralmente. Rank-up moves aplicados: Goal adicionado ao fixture do bounded composer; reachability landscape estendida; cobertura desktop do Context adicionada.
- Best fix aplicado: removido integralmente o seletor de overflow do `.agent-chat__input`; a linha Goal mantém somente `margin: 0`, divisor inferior interno e nenhum radius/borda externa.
- Teste anterior que exigia `composerOverflow: hidden` removido por codificar a regressão.
- Reprodução focal pré-fix com Chromium explícito: 2 falhas esperadas — landscape recebeu `hidden` em vez de `auto`; ponto visível do Context foi recortado.
- Prova focal pós-fix: 2 testes passaram; landscape mantém scroll e controles alcançáveis, Context permanece hit-testable fora do composer.
- Diff final contra o merge base: produção `+3/-3` (net zero); testes `+48/-1`.
