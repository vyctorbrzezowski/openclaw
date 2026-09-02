# WORKLOG - discord-invite-sidebar

## Feito

- Li o brief `~/openclaw-maintainer/briefs/discord-invite-sidebar.md`, `AGENTS.md`, `ui/AGENTS.md` e `scripts/AGENTS.md`.
- Confirmei que o worktree estava limpo, em detached HEAD `be645953`, enquanto a PR 123351 aponta para `fa0cb853`; vou atualizar o checkout local antes da implementacao.
- Mapeei o convite atual: copy em `ui/src/i18n/locales/en.ts`, arte em `ui/public/community-art/discord-invite.webp`, apresentacao em `ui/src/components/community-invite-dialog.ts`, owner de cohort em `ui/src/app/app-host.ts` e scheduler/tombstone em `ui/src/app/community-invite.runtime.ts`.
- Mapeei a sidebar: `.sidebar-shell__body` e o scroller em `ui/src/components/app-sidebar.ts`; `.sidebar-shell__footer` e a barra de usuario no mesmo arquivo; geometria em `ui/src/styles/layout.css`.
- Atualizei o detached HEAD para a cabeca atual da PR 123351, `fa0cb853`, e reli as revisoes mais novas de cohort, elegibilidade ao vivo e dismiss permanente.

## Decidido

- O card sera ancorado como overlay absoluto acima de `.sidebar-shell__footer`, fora do scroller, para nao alterar `scrollHeight` nem sofrer a mascara de fade do body.
- Sidebar colapsada: nao mostrar. O app esconde a sidebar inteira nesse estado, portanto o card acompanha o mesmo contrato sem criar um floater alternativo.
- Drawer/mobile: mostrar dentro da mesma instancia persistente da sidebar, porque o shell move o proprio `openclaw-app-sidebar` para o drawer.
- Dismiss/join e cohort permanecem com o runtime da PR; apenas o mount target e a apresentacao mudam.
- A fixture local vai armar o convite apenas no mock e ficara explicitamente fora de eventual commit.
- O caminho canonico agora e `ui/src/components/community-invite-card.ts`; o antigo nome/tag `dialog` sai por completo.
- O scheduler observa apenas mudancas da classe `.shell` enquanto esta armado, para tentar novamente quando collapse, drawer ou settings devolverem uma sidebar visivel; nao ha polling nem observacao da arvore de sessoes.
- A fixture de `scripts/control-ui-mock-dev.ts` arma o registro, acelera somente o dwell exato do convite e inicia uma execucao local elegivel; isso contorna os runs ativos do mock geral sem mudar fixtures de produto e deve sair antes de qualquer commit.
- O `node_modules` compartilhado tem `markdown-it@15`, mas este checkout fixa `14.3.0`; para a bancada apenas, `scripts/control-ui-mock-dev.ts` aponta os imports ao tarball oficial 14.3.0 e dependencias exatas extraidos em `.artifacts/`. Esses aliases locais tambem devem sair antes de qualquer commit.

## Proximo

- Atualizar o checkout para a cabeca atual da PR, reler dialog/runtime/cohort e implementar o caminho canonico na sidebar.
- Adaptar os testes sem executar suites locais nesta fase de iteracao.
- Subir `http://127.0.0.1:5284/chat`, verificar desktop/drawer/colapsada/dismiss e criar o marker.
