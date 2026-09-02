# perm-icon-build

## Objetivo

- Verificar no app macOS o fix do icone de permissao do composer no PR #134413 / issue #134409.
- Worktree no SHA `8d7123c4ebd66dc8c6a53a04fd8ed2b3baffa70c` (`fork/fix/macos-composer-default-icon`).

## Receita Reproduzida

- Li a receita em `../sidebar-header-buttons/WORKLOG.md` e as regras de `ui/AGENTS.md`.
- Preservei as dependencias existentes e nao executei `pnpm install`.
- Substitui o link de `node_modules` para o checkout principal por uma arvore local clonada da lane de build anterior, cujo `pnpm-lock.yaml` e identico.
- Clonei os `node_modules` dos workspaces entrada a entrada e confirmei que os links relativos resolvem para esta worktree, incluindo `node_modules/@openclaw/ai -> packages/ai`, `ui/node_modules/openclaw -> esta worktree` e `extensions/discord/node_modules/openclaw -> esta worktree`.
- Como outro app de uma lane independente esta ativo, nao usei `scripts/restart-mac.sh --target-only`: esse owner abortaria ou tentaria trocar instancias existentes. Executei diretamente o mesmo empacotador usado por ele, sem tocar no app instalado: `OPENCLAW_BUILD_CACHE=0 SKIP_PNPM_INSTALL=1 OPENCLAW_SKIP_MLX_TTS=1 scripts/package-mac-app.sh`.

## Bloqueio

- A build JS chegou ao bundle completo da Control UI, mas `pnpm ui:build` falhou no gate de performance antes da build Swift.
- Medicao exata: startup JS gzip `348481 B`; baseline `346777 B` + tolerancia `512 B` + variancia `64 B`; limite de enforcement `347353 B`. Excesso: `1128 B`.
- Repeti `pnpm ui:build` uma vez; a segunda medicao reproduziu exatamente `348481 B`, portanto nao foi variacao do bundler.
- O diff de producao do fix altera somente `ui/src/styles/chat/layout.css`; nao alterei baseline, codigo ou scripts para mascarar o gate.
- `dist/OpenClaw.app` nao foi produzido. O gateway isolado `:18890` nao foi iniciado e nenhuma instancia parcial foi aberta.
- O gateway real, `~/.openclaw`, o app instalado e o app ja aberto por outra lane nao foram tocados.

## Estado

- `app=`
- `url=`
- `status=blocked: Control UI startup JS gzip 348481 B exceeds enforcement limit 347353 B`
