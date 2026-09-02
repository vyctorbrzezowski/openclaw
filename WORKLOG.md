# sidebar-align worklog

## Feito

- Li integralmente `.lanes/sidebar-align-prompt.md`, `.lanes/PLAYBOOK.md`, a skill `control-ui-e2e` e `ui/AGENTS.md`; a atualização do maintainer substitui os caminhos antigos.
- Atualizei `origin/main` e criei o worktree destacado em `8a2f6c3c770`.
- Liguei `node_modules` da raiz, `ui/` e pacotes disponíveis a `~/veredito-mine/repo`; nenhum install executado.
- Localizei a implementação real da sidebar, o mock canônico e os testes visuais existentes.
- Reproduzi o desalinhamento no mock: `ONLINE` iniciava em x=18 e `SESSIONS` em x=10.
- Corrigi o dono compartilhado da grade; agora Online, Sessions, nav, header do agente e footer começam em x=10.
- Reduzi o gutter direito das rows em 4px, preservando 4px da folga interna destinada ao scrollbar clássico.
- Completei a fixture com três pessoas online, header longo com quebra, rows com/sem avatar, badges/estados e contador no footer.
- Adicionei a régua vertical viva no harness; confirmei os estados ligado e desligado no navegador automatizado.
- Inspecionei a captura final em `.artifacts/sidebar-align-final.png`; vídeo em `.artifacts/sidebar-align-video/page@90aa87c7cc81616e0bc1c6a77ff8fa4d.webm`.
- Fechamento operacional autorizado pelo maintainer: issue #132791 e PR draft #132794 criadas, ambas atribuídas a `vyctorbrzezowski`; PR liga `Closes #132791`.
- Capturei e olhei provas equivalentes before/after nos temas light e dark; uploads de user attachments estão no corpo da PR.
- Retirei toda a bancada do commit. O commit contém somente produção e o teste de regressão da geometria observável.
- Autoreview Codex contra `origin/main`: limpo, zero findings acionáveis.
- Hard gate Codex inspecionado diretamente em `../codex/codex-rs/exec/src/cli.rs:26`, `../codex/codex-rs/exec/src/lib.rs:250`, `../codex/codex-rs/exec/src/lib.rs:797` e `../codex/codex-rs/config/src/loader/mod.rs:516`.
- Iteração de stress do maintainer aplicada somente ao harness local; PR #132794 e seu head permaneceram intocados.
- Fixture de stress: 60 sessões-raiz extras, títulos curtos/longos/com e sem espaços/unicode/emoji, pinned/unread/running/incognito, duas árvores com pais visíveis e roster com 16 pessoas.
- Auditoria do tuner: removidos Density, Online e Row state porque o tuner falsificava essas superfícies por CSS; a densidade existente pertence ao Workboard e não alcança a sidebar.
- Width agora dispara o evento `resize` do `resizable-divider` real e usa somente os limites reais 240/258/400. Scrollbar ficou explicitamente rotulado como emulação de plataforma. Guides ficou explicitamente rotulado como medição da bancada. Expand continua clicando os controles reais.
- Tuner auditado conferido visualmente em `.artifacts/sidebar-align-audited-tuner.png`; controles restantes produziram 240/258/400px, scrollbar classic `stable`, uma régua visível e 85 rows/4 níveis expandidos.
- Corrigi a infidelidade apontada na captura `sidebar-align-1268-infiel.png`: removi a promoção de filhas de pais pinados/ocultos. Depth 1 e Tax filing research são raízes visíveis; suas filhas são renderizadas recursivamente sob elas. Lisbon trip planning agora é raiz real.
- Tornei “Expand 50+ sessions” determinístico: ele espera a renderização entre cliques nos controles reais de grupo, paginação e filhos. Verificação final: 85 rows, zero grupos fechados, zero paginação restante, zero raízes com classe de filha e zero filhas sem pai DOM.
- Abri e olhei `.artifacts/sidebar-align-faithful-depth-sidebar.png` e `.artifacts/sidebar-align-faithful-tax-sidebar.png`; spinner/check à esquerda aparecem somente em linhas indentadas sob o pai visível.
- Decisão de design do maintainer substituiu a reserva fixa de scrollbar: `scrollbar-gutter: stable` agora pertence ao `.sidebar-shell__body`, com apenas 4px constantes de respiro do conteúdo. Removida a dupla-reserva de 10px do scroller + compensação parcial das rows.
- Suporte verificado: o repo já usa `scrollbar-gutter` em `ui/src/styles/chat/layout.css:634,4100`, `ui/src/styles/components.css:2867` e `ui/src/styles/config.css:912`; CSS Overflow Level 3 define `stable`, e MDN classifica a propriedade como Baseline 2024, disponível nos browsers atuais desde dezembro de 2024. Não há browserslist mais antiga declarada para a Control UI.
- Provas próprias equivalentes capturadas em Chromium headed no mesmo viewport/scroll: `.artifacts/sidebar-align-gutter-overlay-sidebar-headed.png` e `.artifacts/sidebar-align-gutter-classic-sidebar-headed.png`; ambas abertas e olhadas. A clássica mostra o thumb real de 15px; a overlay não reserva largura.
- Autoreview Codex contra `origin/main` concluído limpo, sem findings acionáveis. Commit amendado/pushado em `237f1544ae54368f304c74d2f5389328061795a0`; PR draft #132794 atualizada com tese adaptável, medidas, suporte do padrão e as duas novas capturas via user-attachments.
- Watcher do CI no head exato primeiro retornou `NO-RUN-ATTACHED`; close/reopen mecânico redisparou o run `33321199968`, preservando OPEN+DRAFT. O run anexou e terminou `skipped` porque `.github/workflows/ci.yml:83` não executa CI em draft. Não marquei ready, conforme ordem explícita.
- Corretiva final da bancada: removidos o eixo “Platform scrollbar emulation” e todo CSS de scrollbar do harness (`overflow-y`, `scrollbar-width/color`, `::-webkit-scrollbar`, thumb e classes overlay/classic). O tuner agora contém somente Width real, Guides de medição e Expand real em `scripts/control-ui-mock-dev.ts:3341-3389`.
- Prova nativa em `.artifacts/sidebar-align-native-scrollbar-headed.png`, capturada em Chromium headed, aberta e olhada: `overflow-y:auto`, `scrollbar-width:thin` pela política real em `ui/src/styles/base.css:643-645`, `scrollbar-gutter:stable`, barra nativa 10px, content edge x=247, row right x=243, gap 4px.
- GATE 1 aprovado. Closeout final capturou e inspecionou individualmente oito provas abertas e equivalentes: desktop/mobile × light/dark × before/after, todas com conteúdo em overflow e thumb nativo visível. Uma primeira matriz foi rejeitada por tuner/hovercard e não foi usada; a segunda matriz limpa é a única referenciada na PR.
- Issue #132791 atualizada no template de bug e PR #132794 atualizada no template What Problem / Why / User Impact / Evidence; ambas atribuídas a `vyctorbrzezowski`. Corpo da PR contém exatamente os oito uploads finais, gate de escopo e consumidores nominais.
- Compactação mecânica de comentários antes do closeout; formatter manteve o template Lit multiline. Autoreview final contra `origin/main` limpo. Push final `b62d1127fe5ae02ca0e9965b0e26cd382a3a5473`; PR permanece OPEN+DRAFT.

## Decidido

- Escopo estrito: coluna esquerda compartilhada e gutter direito das session rows; tipografia, tamanhos e comportamento ficam intocados.
- Bancada: harness canônico na porta 6008, sem `open`; fixture existente será ampliada somente onde faltar fidelidade, com régua vertical de efeito visível.
- Marker final: `.lanes/markers/sidebar-align.done` dentro deste worktree.
- Existing-solutions preflight: a própria sidebar já possui tokens/grid compartilhados e harness oficial; biblioteca/plugin/plataforma externa não é adequada para um ajuste CSS interno de precisão.

## Próximo

- Aguardar nova inspeção do maintainer na bancada fiel :6008. Fix aprovado; PR permanece draft e intocada.

## Mapa dos donos de indent

- Shell/root gutter: `ui/src/styles/layout.css:975` (`--sidebar-pad-x`, padding do shell).
- Header do agente: `ui/src/styles/layout.css:991` (`.sidebar-brand`, padding de 8px); render em `ui/src/components/app-sidebar-render.ts:82`.
- Nav/Home/itens com badge: `ui/src/styles/layout.css:2894` (`.nav-item`, padding de 8px); render Home em `ui/src/components/app-sidebar-render.ts:150` e demais rotas via `ui/src/components/app-sidebar-nav-menus.ts`.
- Online + Sessions, grid comum: `ui/src/styles/layout.css:1108` (`--sidebar-inset`, `--sidebar-lead`, `--sidebar-row-gap`) e `ui/src/styles/layout.css:1226` (compensação inline compartilhada).
- Online opt-in no grid comum: `ui/src/components/app-sidebar-render.ts:266`; margem vertical sem sobrescrever inline em `ui/src/styles/layout.css:2155`.
- Headers ONLINE/SESSIONS/grupos: render comum em `ui/src/components/app-sidebar-session-section-header.ts:4`; grid em `ui/src/styles/layout.css:1296` e `ui/src/styles/layout.css:1314`.
- Avatares/ícones/texto das rows: render em `ui/src/components/app-sidebar-session-row-render.ts:317`; geometria em `ui/src/styles/layout.css:1783`, `ui/src/styles/layout.css:1822` e `ui/src/styles/layout.css:4356`.
- Online people rows: render em `ui/src/components/app-sidebar-render.ts:299`; geometria em `ui/src/styles/layout.css:2178` e `ui/src/styles/layout.css:2185`.
- Footer do usuário/contador: shell em `ui/src/styles/layout.css:1095`, barra em `ui/src/styles/layout.css:3281`, card em `ui/src/styles/layout.css:3363`; render em `ui/src/components/app-sidebar-render.ts:336`.
- Gutter direito das session rows: dono compartilhado `ui/src/styles/layout.css:1226`; overlay de ações permanece em `ui/src/styles/layout.css:2063`.
- Gutter adaptável: owner de scroll `ui/src/styles/layout.css:1079`; `scrollbar-gutter: stable` reserva a largura clássica real, `padding-right: 4px` é somente respiro visual, e `ui/src/styles/layout.css:1234` cancela integralmente o inset local das famílias Online/Sessions.
- Fixture rica: `scripts/control-ui-mock-dev.ts:1719`, `scripts/control-ui-mock-dev.ts:2110`; régua/toggle em `scripts/control-ui-mock-dev.ts:3284`.

## Mapa linha-a-linha da fixture fiel

- Stress roots 01–60: shapes sem `spawnedBy` em `scripts/control-ui-mock-dev.ts:467-491`; pinned (`index % 7`), unread (`index % 4`), running (`index % 11`) e incognito (`index % 13`) são campos reais da row. A projeção mantém roots sem pai em `ui/src/components/app-sidebar-session-tree.ts:148-158`; roots running/unread recebem estado à direita em `ui/src/components/session-leading-indicator.ts:65-66` e `ui/src/components/app-sidebar-session-row-render.ts:225-240`.
- Depth 1: root categorizada sem `spawnedBy`, aponta `childSessions: [Depth 2]` em `scripts/control-ui-mock-dev.ts:1735-1740`; o vínculo explícito vira árvore em `ui/src/components/app-sidebar-session-tree.ts:56-70`. Estado running/unread agregado fica à direita porque continua root.
- Depth 2: shape tem `spawnedBy: Depth 1`, `childSessions: [Depth 3]`, `hasActiveRun` e `status: running` em `scripts/control-ui-mock-dev.ts:1741-1746`; projeção chama `build(child, true)` em `ui/src/components/app-sidebar-session-tree.ts:80-92`; renderer produz spinner esquerdo somente no ramo child em `ui/src/components/session-leading-indicator.ts:65-68,108-112`.
- Depth 3: shape tem `spawnedBy: Depth 2`, `childSessions: [Depth 4]`, `status: done` herdado do `sessionRow` e unread em `scripts/control-ui-mock-dev.ts:1747-1751`; o mesmo ramo child real produz check esquerdo + unread badge em `ui/src/components/session-leading-indicator.ts:68-112`.
- Depth 4: shape tem `spawnedBy: Depth 3` e `status: done` em `scripts/control-ui-mock-dev.ts:1752-1754`; é renderizada recursivamente dentro do DOM de Depth 3 por `ui/src/components/app-sidebar-session-row-render.ts:523-542`, com check esquerdo pelo ramo child real.
- Tax filing research: root visível sem pin/spawn, `childSessions: [Reading receipts]`, running em `scripts/control-ui-mock-dev.ts:1811-1815`; spinner da root fica à direita.
- Reading receipts: shape retornado pelo fetch real `spawnedBy: tax-research`, running e runtime em `scripts/control-ui-mock-dev.ts:1666-1676`; aparece como filha DOM imediata de Tax filing research, com spinner esquerdo e trail de runtime pelos ramos `isChild` em `ui/src/components/app-sidebar-session-row-render.ts:235-242`.
- Lisbon trip planning: shape sem `spawnedBy`, unread em `scripts/control-ui-mock-dev.ts:1658-1665`; não consta mais em `main.childSessions`, portanto é root e o unread aparece à direita.
- Online roster: 14 payloads reais adicionais de presence, além dos dois existentes, em `scripts/control-ui-mock-dev.ts:2203-2218`; passam pela projeção/render de presence em `ui/src/components/app-sidebar-render.ts:248-312`. Nomes curtos, longos, sem espaços e unicode exercitam truncamento sem CSS de estado inventado.
- Recursão/indentação de todas as filhas: `renderSessionTree` cria `.sidebar-session-tree__children` e chama a si mesmo em `ui/src/components/app-sidebar-session-row-render.ts:515-563`; nenhum wrapper/ícone de filha é fabricado no harness.

## Verificação

- URL viva: `http://127.0.0.1:6008/chat`.
- Medição final nativa: scrollbar 10px, content edge x=247, session row right x=243, distância conteúdo→barra 4px; `overflow-y:auto`, `scrollbar-width:thin` e `scrollbar-gutter:stable`, sem classes de scrollbar no documento.
- Suites/build/typecheck não executados, conforme `.lanes/PLAYBOOK.md` I.1.
- Teste novo protege o alinhamento observável e o owner adaptável: emula scrollbar overlay (0px) e clássica (>0px), exige `scrollbar-gutter: stable`, alinhamento comum e 4px entre conteúdo e a borda real entregue pelo navegador em ambos. Execução local omitida conforme I.1; CI é o gate.
- Nenhum `open` ou `pnpm install` executado.
- Gate de escopo: `ui/src/components/app-sidebar-render.ts` (opt-in do Online no grid canônico); `ui/src/styles/layout.css` (owner compartilhado do inset/gutter); `ui/src/e2e/chat-flow.sidebar-presentation.e2e.test.ts` (regressão observável). Nenhum outro arquivo no commit.
- Consumidores nominais do owner compartilhado checados: Online roster; sessões Gateway agrupadas; catalogs Codex/Claude Code; toolbar/paginação; nav, header do agente e footer como referências da shell grid.
- Produção final contra o merge-base: +13/-9 (net +4). Testes: +105/-0. O crescimento de quatro linhas é apenas o opt-in Lit formatado de Online no grid compartilhado; o reparo do scroll substitui a política fixa no owner, sem fluxo paralelo.
- Stress fiel: alinhamento Online/Sessions permaneceu igual; gutter medido em 4px; 60 títulos extremos carregados; quatro child rows expandidas sob pais visíveis; scrollbar clássica reportou `scrollbar-gutter: stable`.
- Controles confirmados: larguras reais 240/258/400; guias de medição; expansor real levou a lista a 85 rows. Scrollbar, Density, Online e Row state não existem mais no tuner; a scrollbar é exclusivamente a nativa do app/plataforma.
- Auditoria adversarial: rebase sobre `origin/main` corrente; removida toda simulação CSS de scrollbar do E2E. O cenário padrão agora gera overflow real com 60 sessões, Online, grupos Gateway, catálogos Codex/Claude, toolbar, paginação e overlay de ações por hover. O guard clássico existente mede o mesmo contrato de 4px a partir da borda útil descontando a largura nativa observada.
- Autoreview repetido após o rebase final: zero findings acionáveis. Oito screenshots desktop/mobile, light/dark, before/after foram recapturados, abertos individualmente e publicados no corpo da PR. Rebase mecânico final preservou o diff no head `49f6cc5aab7580ab0d61139f21d30cbd439914fd`; PR segue draft, sem land/ready.
- Re-auditoria de honestidade: removidas alegações de identificação overlay e overflow horizontal; catálogo fica limitado aos headers medidos, paginação é declarada apenas como dado presente na fixture. LOC de testes corrigido para +144/-8 e navegação do guard migrada para `controlUiSessionUrl`.
- Pares mobile/desktop refeitos na mesma página e fixture, com animações/transições pausadas e a mesma row ancorada no centro antes/depois. Oito imagens abertas individualmente antes do upload. Autoreview limpo; head `d8f8c8958a62670303bae218997adf8e1df1acdd`.
- Prova final refeita no topo (`scrollTop = 0`): workspace completo, Online colapsado pelo controle real, Sessions e primeiras rows no mesmo quadro. Contexto nasce com `reducedMotion: reduce`; transições permanecem zeradas e before/after usam a mesma página, conteúdo e scroll. Os quatro pares foram comparados visualmente e têm títulos/badges/estados idênticos.
