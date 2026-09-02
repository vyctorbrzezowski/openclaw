# inbox-header worklog

## feito

- Li integralmente `~/lanes/inbox-header-prompt.md`, `~/lanes/PLAYBOOK.md`, `ui/AGENTS.md`, `scripts/AGENTS.md` e a skill `control-ui-e2e`.
- Atualizei `origin/main`, criei este worktree detached em `8a2f6c3c770` e liguei `node_modules` do checkout de dependências no root, `ui/` e pacotes disponíveis. Nenhum `pnpm install`.
- Li os novos caminhos canônicos `.lanes/inbox-header-prompt.md` e `.lanes/PLAYBOOK.md`; markers antigos foram descartados.
- Mapeei o fluxo completo: `ui/src/components/sidebar-attention.ts:441-464` constrói as entradas e `ui/src/components/sidebar-attention-panel.runtime.ts:57-179` filtra a aba, calcula dismissals/contagens e renderiza header + tabs. As categorias/contagens vêm de `ui/src/components/sidebar-attention-entries.ts:1-115` e as quatro abas de `ui/src/components/sidebar-issues-tabs.ts:3-14`.
- Causa localizada em `ui/src/components/sidebar-attention-panel.runtime.ts:131-152`: quando `visibleDismissals` fica vazio, o botão inteiro vira `nothing`. Em `ui/src/styles/sidebar-issues.css:79-121` o header não reserva altura e o botão presente tem `min-height: 28px`; no mobile `ui/src/styles/sidebar-issues.css:178-180` ele passa a 40px, alterando a altura do header.
- Histórico confirmado: o botão condicional e os tamanhos atuais entraram juntos em `238c884986b` para disponibilizar dismiss no mobile; não há contrato exigindo colapso do espaço.
- A primeira composição com alertas de Automations/System não reproduziu: esses alertas mantêm o controle real Ask OpenClaw presente e ele já estabiliza o header. Ajustei somente a bancada `inbox-header` para usar o update dispensável real em System, sem alertas do custodian. Assim All/System têm contagem e item com Dismiss shown; Approvals/Automations são vazias e removem o botão. Nenhum elemento visual novo foi criado.
- Reprodução pré-fix em viewport 390x844: All (populada) mostrou Dismiss shown, header `56px` e tabs em `341.09375px`; Approvals (vazia) removeu Dismiss shown, header `52px` e tabs em `337.09375px`. Deslocamento observado: `4px`. Capturas: `.artifacts/control-ui-e2e/inbox-header/before-populated.png` e `before-empty.png`.
- Fix aplicado em `ui/src/styles/sidebar-issues.css`: o header mobile agora reserva `min-height: 56px`, exatamente a altura que já tinha quando o controle touch-size de 40px estava presente (40px + padding vertical de 8px em cada lado).
- Verificação pós-fix via HMR em viewport 390x844: All (Dismiss shown presente) e Approvals (ausente) medem header `56px` e tabs em `341.09375px`; deslocamento `0px`. Capturas inspecionadas: `.artifacts/control-ui-e2e/inbox-header/after-populated.png` e `after-empty.png`.
- Controles verificados na bancada: tabs alternam item/empty state; Dismiss shown remove o update e zera o badge; Close remove o painel. A bancada segue ativa em `http://127.0.0.1:6001/chat`.
- Linha final da causa: `ui/src/components/sidebar-attention-panel.runtime.ts:139-151`. Linha final do fix: `ui/src/styles/sidebar-issues.css:145-147`.
- Delta atual: produção `ui/src/styles/sidebar-issues.css` +4/-0 (uma regra CSS); bancada `scripts/control-ui-mock-dev.ts` +18/-2. WORKLOG e artefatos são locais/untracked. Nenhum teste/build/typecheck/suite, commit, push ou `open` foi executado.
- Ordem de fechamento recebida: issue + PR draft, provas no corpo, autoreview, gate de escopo e handoff sem land/ready.
- Busca de duplicatas: `gitcrawl` indisponível; buscas GitHub ao vivo em issues e PRs por “Inbox header Dismiss shown empty tab shift” não encontraram equivalentes.
- Issue criada: #132795, atribuída a `vyctorbrzezowski`.
- Prova final capturada e olhada em light/dark. Screenshots equivalentes: `before-{light,dark}.png` (56→52px) e `after-{light,dark}.png` (56→56px). Vídeos `inbox-header-{light,dark}.webm`, ~6,8s, tiveram frames antes/depois inspecionados.
- Bancada removida do diff publicável. Teste existente estendido em `ui/src/components/sidebar-attention-layout.browser.test.ts`: mede o header com Dismiss shown, remove a ação e exige altura idêntica; falha no CSS pré-fix por 4px, passa com o owner fix, sem seam de produção.
- Branch `fix/inbox-header-stability`, commit `8c4811a6813`, push concluído. PR draft #132798 criada e atribuída a `vyctorbrzezowski`, com `Closes #132795`, escopo e provas anexadas.
- Autoreview Codex contra `origin/main`: limpo, zero findings aceitos/acionáveis; patch considerado correto com confiança 0,99. Nenhuma alteração adicional necessária.
- Estado remoto final: PR #132798 OPEN e draft, assignee `vyctorbrzezowski`, head exato `8c4811a6813ce866cd5a092b2b8874788914f7cc`; nenhum check em bucket pending/fail. Checks pesados ficam skipped por contrato enquanto draft. O watcher canônico não termina sem `openclaw/ci-gate` executável em draft e foi interrompido pela própria sessão após o rollup ficar terminal.
- `maintainerCanModify=false` é não configurável em PR same-repo; a API recusou com “Fork collab can only be enabled on cross-repo pull requests”. A branch está no próprio `openclaw/openclaw`, portanto não há fork cujo allow-edits possa ser habilitado.
- Iteração do maintainer (verbatim): “remova o Ask OpenClaw (o bonequinho) do header do Inbox pra ele testar como o header fica SEM esse elemento — em alguns environments ele nao existe, e ele pode estar servindo de balanceamento visual do header, o que atrapalha a avaliacao da estabilidade. Ideal: um toggle na bancada mostrar/esconder Ask OpenClaw, default ESCONDIDO, com efeito visivel imediato. So essa mudanca, nada de aproveitar a passada.”
- Restaurei a fixture local `inbox-header` necessária ao processo mock e adicionei nela um único controle de bancada `Ask OpenClaw: hidden/shown`. Default hidden é aplicado antes do DOM; o clique alterna imediatamente a visibilidade do elemento real `.sidebar-issues-panel__ask`. Nenhuma linha do commit/PR foi alterada.
- Ajustei o toggle dentro da própria bancada após duas verificações: fora do presenter ele fechava o painel por outside-click; dentro do drawer ele interceptava o botão Inbox. A versão final fica absoluta no canto inferior esquerdo do painel, fora do fluxo do header e oposta ao Ask OpenClaw no canto inferior direito.
- Verificação final headless: default `display: none`; primeiro clique `display: flex`; segundo clique `display: none`. O painel permaneceu aberto. Vite segue ativo em `http://127.0.0.1:6001/chat`.
- PR intocada: HEAD continua `8c4811a6813ce866cd5a092b2b8874788914f7cc`; nenhuma mudança de produção/teste foi commitada ou enviada.
- Reprovação do maintainer confirmada visualmente em `.lanes/evidence/inbox-header/com-item.png` e `sem-item.png`: sem Ask OpenClaw, o desktop também encolhia quando o botão condicional desaparecia. O `min-height` mobile era um curativo incompleto no consumidor CSS.
- Correção refeita no produtor do slot em `ui/src/components/sidebar-attention-panel.runtime.ts`: o botão Dismiss shown é sempre renderizado; quando não há dismissals visíveis, fica `visibility:hidden`, `disabled` e `aria-hidden`, reservando a caixa localizada idêntica sem ação ou foco disponível.
- Removi a regra `min-height: 56px` do primeiro fix. O teste browser agora renderiza o painel real e comprova altura do header e posição das tabs idênticas entre All populada e Approvals vazia em shells desktop e mobile.
- Prova final com Ask OpenClaw escondido, todas as quatro abas: desktop 1280x900 manteve `headerHeight=44`, `headerTop=343`, `tabsTop=387`; mobile 390x844 manteve `headerHeight=56`, `headerTop=285.09375`, `tabsTop=341.09375`. All/System exibem Dismiss shown; Approvals/Automations preservam o slot invisível. Deslocamento: `0px` em ambas as larguras.
- Capturas finais abertas e inspecionadas: `v2-desktop-{all,approvals}.png` e `v2-mobile-{all,approvals}.png`. A posição de header/tabs é visualmente idêntica em cada par; Ask OpenClaw está escondido.

## decidido

- A validação seguirá a bancada mock canônica na porta 6001, sem `open`, suites, build ou typecheck local.
- A bancada usa `--fixture inbox-header`: All/System têm o update real e dismissível; Approvals/Automations são abas vazias. Tabs, Dismiss shown, update/install/hold, Ask OpenClaw (quando disponível) e fechar continuam ligados aos handlers reais.
- O dono correto é o produtor do slot no renderer do painel, não uma altura mínima por media query. O slot invisível conserva exatamente a largura/altura da ação traduzida em qualquer viewport, sem ser interativo ou exposto à árvore de acessibilidade.
- Gate de escopo: `ui/src/components/sidebar-attention-panel.runtime.ts` é o produtor compartilhado do header. Consumidores nominais: painel Inbox desktop, drawer Inbox mobile e todas as abas All/Approvals/Automations/System. `ui/src/components/sidebar-attention-layout.browser.test.ts` protege o mesmo owner em ambas as larguras. `ui/src/styles/sidebar-issues.css` apenas remove o curativo anterior; não há nova regra CSS.

## próximo

- Amend/push da correção estrutural, upload das quatro provas, atualização da PR draft #132798, autoreview contra `origin/main` até zero findings e marker final.

## closeout consolidado

- GATE 1 aprovado: fix estrutural em todas as larguras + respiro do bloco título/tabs + hairline dark visível. Land segue proibido até auditoria adversarial limpa e autorização seguinte.
- Prova equivalente refeita sem expor o tuner da bancada: desktop 1280x900 e estreito 390x844, light e dark; cada imagem composta mostra All populada e Approvals vazia lado a lado. As oito composições finais foram abertas e olhadas antes do upload.
- Antes reproduzido no browser sem editar o servidor: renderer antigo (slot removido em Approvals), padding antigo e token dark antigo. Desktop variava `44px -> 32px`; estreito `56px -> 52px`.
- Depois real via HMR: desktop All/Approvals `52px`, estreito All/Approvals `64px`; tabs têm top idêntico dentro de cada largura. Dark track usa `#2e3040` a 60%; light continua `#e8e4dc` a 60%.
- Gate de escopo do diff completo:
  - `ui/src/components/sidebar-attention-panel.runtime.ts`: produtor do slot de ação; mantém Dismiss shown renderizado, oculto/desabilitado/aria-hidden quando não há ação.
  - `ui/src/components/sidebar-attention-layout.browser.test.ts`: teste browser existente do owner; protege a invariância de header/tabs em desktop e mobile sem seam de produção.
  - `ui/src/styles/sidebar-issues.css`: owner do layout do Inbox; aumenta somente padding vertical do header e das tabs.
  - `ui/src/styles/base.css`: owner do token `--border`; aumenta somente o valor dark aprovado. Consumidores nominais conferidos visualmente na bancada: track inferior das tabs do Inbox, contorno do painel desktop, botão Close/contorno superior do drawer estreito e controles auxiliares que usam `var(--border)`; light não muda.
  - `scripts/control-ui-mock-dev.ts`: fixture + toggle locais, explicitamente excluídos do staging/commit.
  - `WORKLOG.md` e `.artifacts/**`: locais/untracked, explicitamente excluídos.
- Test-audit authoring gate: protege o comportamento observável “trocar categoria não move header/tabs”; regressão crível é voltar a renderizar o botão como `nothing`; cobertura anterior só media touch targets e não alternava o renderer real; nenhum export/flag/wrapper de produção foi adicionado. O teste falha no renderer pré-fix pelas diferenças de 12px desktop e 4px mobile e passa no owner estrutural.
- Política da máquina: nenhuma suite/build/typecheck local; prova mocked visual + CI exato do head após push.
