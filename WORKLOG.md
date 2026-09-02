# Codex Config Reload Worklog

## 2026-09-02 - Issue Intake

- Read issue #135618 and its full comment thread.
- Assigned the issue to `vyctorbrzezowski` as requested.
- Confirmed the branch is `fix/codex-plugin-config-reload` and was initially clean.

## 2026-09-02 - Reproduction Setup

- Created a temporary deterministic Codex app-server fixture under `/tmp/opencode`; no operator state was used.
- Built enough local runtime output to start the source CLI. The shared workspace dependency links are stale, so the repro uses a temporary Node loader for this worktree's `@openclaw/ai` build output.
- Started an isolated Gateway on port `19181` with its own state directory.
- Control run: a Codex turn succeeded, an external `codexPlugins` config mutation logged `config hot reload applied`, and the next turn succeeded because it acquired the replacement generation.
- Conclusion: the reported failure requires the config mutation to happen while the original turn still owns its host capability.
- Updated the temporary fixture to mutate `codexPlugins` after `turn/start` and before `turn/completed`. Exact pre-fix reproduction is the next step, using isolated port `19182`.

## 2026-09-02 - In-Turn Control

- Ran the adjusted fixture on isolated port `19182` and state directory `/tmp/opencode/codex-config-reload-repro/state-in-turn`.
- The Gateway logged `config hot reload applied` while the Codex turn remained active, but that CLI-originated turn completed successfully.
- This is a negative control, not the final reproduction: CLI RPC admissions acquire the current plugin generation. The reported persistent failure requires a channel runtime that remains bound to the retired generation and supplies that stale Gateway resolver to later ingress.
- Next: reproduce through the deterministic `qa-channel` plugin so the second message traverses the same channel runtime after the Codex config write.

## 2026-09-02 - Codex Hard Gate

- Personally inspected Codex checkout `343074d4207d572809bd8cea15f4be1d09d98e0b`.
- `../codex/codex-rs/app-server-protocol/src/protocol/v2/thread.rs:59-99` defines `ThreadStartParams.config` as thread-start input.
- `../codex/codex-rs/app-server-protocol/src/protocol/v2/thread.rs:318-388` documents running-thread resume/rejoin semantics and exposes resume overrides.
- `../codex/codex-rs/app-server/src/request_processors/thread_processor.rs:3990-4048` compares overrides with the loaded thread snapshot and preserves the loaded thread while warning that mismatched overrides were ignored unless an idle unsubscribed thread can be shut down.
- Contract conclusion: OpenClaw must rotate the bound Codex thread when effective app policy changes; reloading the entire OpenClaw plugin generation is the wrong owner boundary.
- Next: add and run a pre-fix regression for the exact planner classification and its unrelated-Codex negative control, then add the plugin-owned no-op prefix.

## 2026-09-02 - Regression And Fix

- Added an owner-boundary regression in `extensions/codex/index.test.ts` asserting that the Codex plugin declares exactly one dynamic reload prefix for `plugins.entries.codex.config.codexPlugins`.
- Pre-fix command: `node scripts/run-vitest.mjs extensions/codex/index.test.ts`.
- Pre-fix result: 1 failed, 29 passed; the new test observed `plugin.reload === undefined`.
- Applied the canonical fix in `extensions/codex/index.ts`: plugin-owned `noopPrefixes` for only the `codexPlugins` subtree.
- Other Codex settings remain governed by the generic plugin reload policy because the no-op prefix is segment-exact and narrow.

## 2026-09-02 - Focused Validation

- Ran `node scripts/run-vitest.mjs extensions/codex/index.test.ts extensions/codex/src/app-server/plugin-thread-config.test.ts extensions/codex/src/app-server/thread-lifecycle.test.ts src/gateway/config-reload.test.ts`.
- Result: all selected projects passed, covering 522 tests total (223 plus 299 across the routed projects).
- The existing lifecycle coverage verifies stale plugin-app fingerprints rotate the exact native Codex thread; generic planner coverage verifies narrow plugin rules override broad `plugins` reload fallback and preserve unrelated paths.
- Current diff before build: production +3/-0, tests +6/-0.

## 2026-09-02 - Isolated Post-Fix Flow

- `pnpm build` compiled the changed sources but its post-build control-plane check failed because this worktree's shared `node_modules/@openclaw/ai` symlink targets the canonical checkout's stale build output.
- Re-ran the post-build phases with a temporary `/tmp/opencode` loader resolving `@openclaw/ai/*` to this worktree. All 12 runtime post-build phases passed and verified 53 built plugin control-plane modules.
- Re-ran the deterministic Codex fixture with isolated state and Gateway port `19182`.
- The config mutation occurred during the first turn; both that turn and the following turn returned status `ok` with visible payloads.
- The app-server request log contains two `thread/start` requests, proving the effective `codexPlugins` fingerprint change rotated the native Codex thread for the next turn.
- No `agent harness host capability is no longer active` error occurred. The short fixture teardown happened before the reload evaluator emitted its final no-op log line, but the config change was detected and no plugin generation replacement interrupted either turn.

## 2026-09-02 - Checks And Review

- Ran `node scripts/check-changed.mjs`; all selected extension, test, lint, type, contract, and architecture lanes passed.
- Ran diff-scoped deslop; no cleanup was needed.
- Ran `.agents/skills/autoreview/scripts/autoreview --mode uncommitted`; result: `autoreview scoped-clean`, no accepted/actionable findings.
- Final code delta before publication: production +3/-0, tests +6/-0. The production growth is the plugin-owned lifecycle contract required to route dynamic policy changes to existing native thread rotation.
- `WORKLOG.md` is task-local continuity state and will not be committed.

## 2026-09-02 - Final Head Preparation

- Committed only `extensions/codex/index.ts` and `extensions/codex/index.test.ts` as `fix(codex): preserve harness across plugin config reloads`.
- Fetched and rebased onto current `origin/main`; no conflicts.
- Re-ran the focused 522 tests after rebase; all passed.
- Re-ran `node scripts/check-changed.mjs` after rebase; all selected lanes passed.
- Branch is one commit ahead of `origin/main`; next step is push and draft PR creation.

## 2026-09-02 - Publication

- Pushed `fix/codex-plugin-config-reload` at `e240d445deb634b3c1ad8ebcbbacfb8c8b9d71c6`.
- Created PR #135863 as draft, assigned to `vyctorbrzezowski`, with `Closes #135618`, before/after proof, Codex source citations, and LOC classification.
- Waited for GitHub mergeability projection and CI attachment, then marked the PR ready as required by the brief's anti-race flow.
- Final remote state: OPEN, ready for review, MERGEABLE, 100 checks attached to the exact head; 11 pending and 0 failed at handoff.
- No land or merge action was performed.
