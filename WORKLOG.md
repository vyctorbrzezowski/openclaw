# WORKLOG - discord-invite-sidebar

## Feito

- Li o brief `~/openclaw-maintainer/briefs/discord-invite-sidebar.md`, `AGENTS.md`, `ui/AGENTS.md` e `scripts/AGENTS.md`.
- Confirmei que o worktree estava limpo, em detached HEAD `be645953`, enquanto a PR 123351 aponta para `fa0cb853`; vou atualizar o checkout local antes da implementacao.
- Mapeei o convite atual: copy em `ui/src/i18n/locales/en.ts`, arte em `ui/public/community-art/discord-invite.webp`, apresentacao em `ui/src/components/community-invite-dialog.ts`, owner de cohort em `ui/src/app/app-host.ts` e scheduler/tombstone em `ui/src/app/community-invite.runtime.ts`.
- Mapeei a sidebar: `.sidebar-shell__body` e o scroller em `ui/src/components/app-sidebar.ts`; `.sidebar-shell__footer` e a barra de usuario no mesmo arquivo; geometria em `ui/src/styles/layout.css`.
- Atualizei o detached HEAD para a cabeca atual da PR 123351, `fa0cb853`, e reli as revisoes mais novas de cohort, elegibilidade ao vivo e dismiss permanente.
- Rebaseei mecanicamente os 19 commits da PR e o card local sobre `origin/main` atualizado, preservando os arquivos gerais do main e reaplicando a tese somente em `community-invite*`, cohort, runtime, card, copy, imagem e E2E.
- Retirei o commit-envelope de fixture do historico depois do rebase; `scripts/control-ui-mock-dev.ts` e este WORKLOG continuam apenas no worktree.

## Decidido

- O card sera ancorado como overlay absoluto acima de `.sidebar-shell__footer`, fora do scroller, para nao alterar `scrollHeight` nem sofrer a mascara de fade do body.
- Sidebar colapsada: nao mostrar. O app esconde a sidebar inteira nesse estado, portanto o card acompanha o mesmo contrato sem criar um floater alternativo.
- Drawer/mobile: mostrar dentro da mesma instancia persistente da sidebar, porque o shell move o proprio `openclaw-app-sidebar` para o drawer.
- Dismiss/join e cohort permanecem com o runtime da PR; apenas o mount target e a apresentacao mudam.
- A fixture local vai armar o convite apenas no mock e ficara explicitamente fora de eventual commit.
- O caminho canonico agora e `ui/src/components/community-invite-card.ts`; o antigo nome/tag `dialog` sai por completo.
- O scheduler observa apenas mudancas da classe `.shell` enquanto esta armado, para tentar novamente quando collapse, drawer ou settings devolverem uma sidebar visivel; nao ha polling nem observacao da arvore de sessoes.
- O drawer mobile e um `openclaw-modal-dialog`; o gate continua bloqueando dialogs de conteudo, mas permite a unica camada modal que contem o proprio `openclaw-app-sidebar`, para o card aparecer dentro da navegacao aberta.
- A fixture de `scripts/control-ui-mock-dev.ts` arma o registro, acelera somente o dwell exato do convite e inicia uma execucao local elegivel; isso contorna os runs ativos do mock geral sem mudar fixtures de produto e deve sair antes de qualquer commit.
- O `node_modules` compartilhado tem `markdown-it@15`, mas este checkout fixa `14.3.0`; para a bancada apenas, `scripts/control-ui-mock-dev.ts` aponta os imports ao tarball oficial 14.3.0 e dependencias exatas extraidos em `.artifacts/`. Esses aliases locais tambem devem sair antes de qualquer commit.
- A paleta do card voltou exatamente ao pop-up original: fundo `#10131c`, texto `#f3f5fb`, corpo `rgb(243 245 251 / 70%)`, eyebrow/focus `#a5b4ff` e CTA branco `#fff` com texto/icone `#10131c`.

## Proximo

- Aguardar o Gate 1 do Vyctor no mock. Nada foi commitado, enviado ou publicado.

## Evidencia visual

- Desktop: `.artifacts/control-ui-e2e/discord-invite-sidebar/desktop.png`; card `221 x 302`, filho de `.sidebar-shell__footer`, bottom `7px` acima do footer.
- Drawer aberto: `.artifacts/control-ui-e2e/discord-invite-sidebar/drawer.png`; card `272 x 311`, contido no drawer final de `320px`.
- Drawer fechado: nenhum card montado e `.shell-nav` inert.
- Collapse desktop: card invisivel; expandido novamente, `scrollHeight=952` e `clientHeight=464` antes/depois; remover o card mantem os mesmos valores.
- Dismiss: elemento removido e o mesmo registro `openclaw:control-ui:community-invite:v1` recebeu `outcome: "dismissed"` sem alterar o tombstone.
- Formatacao focal (`oxfmt`) e `git diff --check` passaram. Suites/builds nao foram executados nesta fase de iteracao, conforme `~/openclaw-maintainer/PLAYBOOK.md` I.1.
- O comando literal do brief nao existe neste checkout (`scripts/tsx.mjs` ausente); a mesma bancada roda via `node_modules/.bin/tsx scripts/control-ui-mock-dev.ts -- --host 127.0.0.1 --port 5284`.
- Rebase final: `68b4c93272bc46bccb10f2edd841f9cf9258e001` sobre `origin/main` `2c032e1e8b8edeaebfad5c2d1ddde9b866afbd69`.
- Screenshot pos-rebase: `.artifacts/control-ui-e2e/discord-invite-sidebar/rebased-white-cta.png`, inspecionado visualmente com o chrome novo do main e CTA branco.
- Computed styles: card `rgb(16, 19, 28)`, titulo `rgb(243, 245, 251)`, body `rgba(243, 245, 251, 0.7)`, CTA `rgb(255, 255, 255)` e texto/icone `rgb(16, 19, 28)`; console sem erros.
