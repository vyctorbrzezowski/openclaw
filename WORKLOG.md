# perm-icon-build closeout

## Thesis

- Fix the macOS/WebKit permission SVG collapsing inside its 16x16 wrapper.
- Show a selected permission mode optimistically, with its icon and label immediately.
- Remove the transient `Applying permissions...` copy, spinner, busy state, and visual dimming.
- Preserve request serialization, the send barrier, authoritative rejection reconciliation, and visible errors.

## Scope Gate

- `ui/src/styles/chat/layout.css`: permission selector icon. Gives permission and lock SVGs explicit wrapper-relative dimensions on desktop as well as mobile.
- `ui/src/e2e/chat-model-controls.e2e.test.ts`: permission selector icon. Regression coverage for a desktop SVG without intrinsic dimensions.
- `ui/src/pages/chat/chat-pane-session-controls.ts`: optimism, applying-state removal, and lifecycle ownership. Projects the selected mode immediately while retaining duplicate rejection and the shared settings tail; binds mutations to the observed session incarnation and reconciles failures from the authoritative list.
- `ui/src/pages/chat/chat-settings-patches.ts`: lifecycle ownership. Forwards the canonical `expectedSessionId` CAS field to `sessions.patch`.
- `ui/src/pages/chat/components/chat-permission-picker.ts`: applying-state removal. Deletes the applying prop, loader, copy, busy ARIA, and transient disabled styling; always renders the selected mode icon and label.
- `ui/src/i18n/locales/en.ts`: applying-state removal. Deletes the now-unreachable English applying copy; the keyless i18n baseline stays clean.
- `ui/src/pages/chat/chat-pane-session-controls.test.ts`: optimistic selection and lifecycle ownership. Protects duplicate blocking, post-commit rejection reconciliation, stale-incarnation rejection, refresh-unavailable retention, and visible errors.
- `ui/src/e2e/chat-flow.models-reasoning.e2e.test.ts`: optimistic selection and lifecycle ownership. Protects patch ordering, CAS transmission, replacement reconciliation, default reset, and the send barrier.
- `ui/src/test-helpers/control-ui-e2e.ts`: mock Gateway contract. Enforces `expectedSessionId` before applying `sessions.patch`.
- `ui/src/test-helpers/control-ui-e2e.sessions.test.ts`: mock Gateway contract. Proves a stale-incarnation patch cannot mutate the replacement row.
- `ui/src/test-helpers/control-ui-session-fixtures.ts`: mock Gateway ownership. Tracks the current list incarnation separately from mutable metadata so a replacement accepts its own CAS without teaching stale wire reads to the canonical overlay.
- No file in the committed diff is outside the thesis. Gateway state, screenshots, dependency links, build products, and this worklog remain ignored or untracked and outside commits.

## Named Consumers

- Permission picker: consumes the optimistic `mode`; always renders that mode's glyph and label, without applying UI. Pending requests disable interaction without adding the disabled-opacity class.
- Chat composer: mounts the picker as its leading control; receives the optimistic props immediately and preserves layout.
- Session mutation owner: sends `sessions.patch` with the observed session incarnation, rejects duplicate in-flight permission choices, reconciles failures from the authoritative list, and exposes the existing visible failure message.
- Chat send submission and delivery queues: consume `getPendingChatPickerPatch`; sends remain behind the exact permission patch even though the picker no longer flashes a pending state.
- Gateway session rows: `permissionModePending` still blocks conflicting local selection, but no longer replaces the selected icon/label with transient UI.

## Verification

- `node scripts/run-vitest.mjs ui/src/pages/chat/chat-pane-session-controls.test.ts ui/src/e2e/chat-flow.models-reasoning.e2e.test.ts ui/src/test-helpers/control-ui-e2e.sessions.test.ts`
- `pnpm ui:i18n:baseline`
- `node scripts/check-changed.mjs -- <five changed follow-up files>`
- Autoreview: scoped clean, no actionable findings.
- ClawSweeper P2 resolved: pending local/remote updates now disable interaction without changing the optimistic icon/label; focused rollback and duplicate-choice coverage added.
- Incremental autoreview after the P2 repair: scoped clean, no actionable findings.
- Signed macOS app and isolated Gateway proof are captured under `.artifacts/perm-icon-build/` and inspected before publication.

## Adversarial Repair

- Permission patches now carry the exact observed `sessionId` as the existing canonical `expectedSessionId` CAS field.
- Pending ownership is keyed and revalidated by session key, agent, Gateway client/epoch, and session incarnation across every await.
- A rejected patch forces an authoritative session-list replacement before releasing the optimistic projection. If that refresh is unavailable, the optimistic mode remains visible until a later canonical list instead of restoring a stale snapshot; the error remains visible.
- The shared mock Gateway now enforces `expectedSessionId` and proves a stale generation cannot mutate a replacement under the same key.
- Pre-fix proof on `942f6d3192d441e7a8cbf2b93defb10441003e4f`: four focused failures. Three showed missing `expectedSessionId`; one showed the UI restoring `Workspace` instead of retaining/reconciling the selected persisted mode after a post-commit rejection.
- Post-fix focused proof: 46 unit/mock tests, 20 permission/model browser E2E tests, and 3 sibling stale-rename browser E2E tests passed (`69` total).
- Final changed gate passed after the lifecycle repair.
- Final autoreview: scoped clean, no accepted/actionable findings.
- Exact-head CI: run `33588883015` passed on retry for `ec31f7ccf71d35fa407fe598500d5af499bdaaa2`; the first attempt's unrelated Chrome extension reconnect failure passed unchanged on targeted retry. The repaired stale-rename shard passed on the exact head.
- Final development app: `dist/OpenClaw.app` is signed, passes deep/strict code-signature verification, contains Control UI assets, and embeds `OpenClawGitCommit=ec31f7ccf71d35fa407fe598500d5af499bdaaa2`. Packaging skipped dependency reconciliation and the unrelated MLX voice helper; the app was not installed or launched.
- Full PR LOC against `origin/main`: production `+75/-34` (net `+41`), tests `+228/-155`, test support `+47/-1`. Positive production growth owns the previously missing session-incarnation CAS and authoritative failure reconciliation; it does not add a second mutation path or visual state.

## Re-audit Finish

- A monotonic outcome owner now binds the visible error slot to the newest admitted permission mutation. An older incarnation may reconcile its own failure only while it still owns that outcome; it cannot publish over a newer successful choice.
- The mock Gateway now has one canonical session row for CAS, describe, history, and startup. Generic `setMethodResponse` remains wire-only; explicit `setSessionsListResponse` advances canonical authority and installs the corresponding list response.
- Authoritative replacement siblings for permission, rename, group assignment, and bulk delete use the explicit canonical operation. Stale sequences, cases, deferred responses, and direct wire injections remain non-authoritative.
- `docs/gateway/permission-modes.md` now describes immediate optimistic icon/label selection, duplicate blocking, authoritative failure reconciliation, and refresh-unavailable retention. No shipped docs promise `Applying permissions…`.
- Pre-fix proof on `ec31f7ccf71d35fa407fe598500d5af499bdaaa2`: 2 focused failures. The older mutation published `Failed to update permissions` after the replacement mutation succeeded, and a stale wire-only `sessionId` was accepted by mock CAS.
- Post-fix focused proof: 47 unit/helper tests and 24 browser E2E tests passed.
- Docs proof: `pnpm docs:list`, `pnpm docs:check-mdx`, `pnpm docs:check-links`, and `pnpm docs:check-i18n-glossary` passed (`docs:list` reported only its existing repository diagnostics while completing the inventory).
- Final changed gate passed across UI, core tests, and docs. Final autoreview: scoped clean, no accepted/actionable findings.
- Full helper audit: 32 current-state transitions now use `setSessionsListResponse`; 23 future, stale, filtered, paginated, sequenced, or error responses remain wire-only through `setMethodResponse`. The CI-exposed `session-color` sibling and 19 other migrated E2E files passed (`123` tests), plus `23` helper-owner tests and `4` focused color tests.
- Final PR LOC against `origin/main`: production `+84/-34` (net `+50`), tests `+341/-205`, test support `+48/-9`, docs `+1/-1`. The re-audit production delta is the newest-outcome ownership boundary; the fixture repair removes its parallel identity map and the sibling migration is net-negative test code.
- Exact-head CI: run `33595628898` passed on the first attempt for `58feaf444ccc355b5f4f0a1c44aa042d9b006742`, including all UI E2E shards and `openclaw/ci-gate`.
- Final development app: `dist/OpenClaw.app` passes deep/strict signature verification, contains Control UI assets, and embeds `OpenClawGitCommit=58feaf444ccc355b5f4f0a1c44aa042d9b006742`. Packaging skipped dependency reconciliation and the unrelated MLX voice helper; the app was not installed or launched.

## Re-audit 3

- A successful `sessions.patch` response now records its persisted `permissionMode` and `updatedAt` directly into the matching session incarnation before attempting the fallible list refresh. Dropped events and a failed refresh therefore cannot make the UI silently display the old mode.
- The session refresh owner returns a closed local outcome to mutation callers while preserving the existing public `Promise<void>` refresh surface. A committed patch plus failed refresh returns `listRefreshError`; the picker keeps the confirmed mode and shows `Permissions were saved, but refreshing the session failed`.
- Pre-fix proof on `58feaf444ccc355b5f4f0a1c44aa042d9b006742`: the capability result lacked refresh failure metadata and retained `guarded`; the operator E2E reverted from selected `workspace` to `guarded`; the canonical fixture retained omitted fields and rows.
- `replaceCanonicalList` now validates then replaces the complete roster, rows, mutation overlays, and materialized membership. Its explicit snapshot persists separately from wire responses and is restored exactly after reload; list, describe, history, startup, and CAS share it.
- E2E snapshots that intended to preserve identity, active status, icon, or full cloud placement now state those fields explicitly. A stale `sessionInfo` overlay was removed from model-picker reload coverage.
- Post-fix proof: 88 owner/unit tests, 151 authoritative-caller E2E tests, and 38 focused exact-snapshot/permission E2E tests passed. `pnpm check:changed` passed after the final fixture audit. Final autoreview: scoped clean, no accepted/actionable findings.
- Exact-head CI run `33605293495` on `482ffc4927ac398da3460f4306d5cfecd14bf126` exposed two send-barrier ordering regressions in `chat-send.test.ts`. The detailed refresh outcome had unintentionally changed every patch caller's completion semantics instead of remaining permission-specific.
- The repair restores the canonical `Promise<void>` scheduler/completion contract for existing model, pin, and archive patches. Only permission mutations consume the separate refresh outcome needed to report a committed patch plus failed list refresh. The two CI regressions, 385 sibling/owner tests, and the focused permission E2E passed (`387` tests total); `pnpm check:changed` and final autoreview passed.
- Final candidate: `dfca64a233e091aa79b5896626a13f12bd6e5d76`, rebased onto `origin/main` at `1b57356df64`. The repair restores the canonical `Promise<void>` scheduler/completion contract for existing model, pin, and archive patches. Only permission mutations consume the separate refresh outcome needed to report a committed patch plus failed list refresh.
- Post-rebase proof: the two CI regressions, 385 sibling/owner tests, and the focused permission E2E passed (`387` tests total); `pnpm check:changed` and complete-candidate autoreview passed.
- Final PR LOC against `origin/main`: production `+169/-70` (net `+99`), tests `+495/-215`, test support `+157/-14`, docs `+1/-1`. Production growth owns the optimistic mutation lifecycle, incarnation CAS, newest-outcome ownership, confirmed patch-response projection, and permission-specific refresh outcome without changing other patch completion semantics.
- Exact-head CI run `33609569907` passed on the first attempt for `dfca64a233e091aa79b5896626a13f12bd6e5d76`.
- Final development app: `dist/OpenClaw.app` passes deep/strict signature verification, contains Control UI assets, omits the explicitly skipped MLX helper, and embeds `OpenClawGitCommit=dfca64a233e091aa79b5896626a13f12bd6e5d76`. Packaging skipped dependency reconciliation and used the required hoisted packer shim; the app was not installed or launched.

## Final Monotonic Round

- 2026-09-02: resumed the interrupted final round in the dedicated `perm-icon-build` worktree at `dfca64a233e091aa79b5896626a13f12bd6e5d76`; preserved the unrelated `sidebar-header-buttons` worktree unchanged.
- 2026-09-02: inspected the six surviving local edits from the aborted run. The draft rejects an older permission patch response and its refresh after a newer session projection, but it currently uses row `updatedAt` rather than the session capability's canonical admission order; consolidation is in progress before tests.
- 2026-09-02: maintainer approved the complete production growth with a required PR-body justification and authorized the final gate-to-land trail.
- 2026-09-02: captured the required pre-fix failure on `dfca64a233e091aa79b5896626a13f12bd6e5d76` production with the new owner test only: `node scripts/run-vitest.mjs ui/src/lib/sessions/session-permission-mutations.test.ts` failed because delayed patch A overwrote newer event B (`1 failed, 1 passed`); the obsolete refresh path was therefore still reachable.
- 2026-09-02: replaced the draft `updatedAt` comparison with a mutation-owner admission sequence shared by permission patch responses and permission-bearing session events. The focused owner test now passes the exact A-slow/B-fast ordering and proves A performs no refresh (`2 passed`).
- 2026-09-02: formatted the seven touched UI files and ran the focused owner/component/browser set: `session-permission-mutations`, `chat-pane-session-controls`, and `chat-permission-refresh` passed (`29` tests). The browser case observes B in the rendered picker after delayed A resolves.
- 2026-09-02: added the inverse ordering regression: patch A commits and starts its list refresh, then event B applies before A's refresh fails. It failed locally because A still returned `listRefreshError`; the final owner fix retires A's refresh before it can publish or return that stale failure. All three owner regressions pass.
- 2026-09-02: moved stale-refresh rejection to the roster's canonical foreground publication generation. Event B now retires A's whole pending list response before it can publish rows or errors; both failed and successful stale refreshes are discarded. This reduced the final-round production delta from `+72/-21` to `+35/-8` while keeping the session-scoped response sequence.
- 2026-09-02: post-compression scope passed: six session owner/sibling files (`130` tests) and the permission browser E2E (`2` tests).
- 2026-09-02: final formatting and the complete touched-scope rerun passed again (`130` session/component tests plus `2` bundled browser E2E tests). `git diff --check` is clean.
- 2026-09-02: `node scripts/check-changed.mjs -- <eight touched files>` passed. Two intermediate attempts exposed and fixed a stale helper rename and the roster owner's 700-line lint boundary; no suppression or baseline change was added.
- 2026-09-02: fresh final autoreview with `--mode uncommitted` completed `scoped-clean` with zero accepted/actionable findings. Per the round ceiling, no further audit cycle will be started.
- 2026-09-02: committed only the eight final-round source/test files as `717598555d1` (`fix(ui): order permission projections monotonically`). `WORKLOG.md` remains local and uncommitted by design.
- 2026-09-02: pushed `717598555d1939373058744632eb6b526a30f02f` to `prhead/fix/macos-composer-default-icon`; PR #134413 now targets that exact head.
- 2026-09-02: corrected the recorded full SHA to `717598555d166121e865834091c14dab89b9b7e0` and updated the PR body. Final classified LOC is production `+202/-79` (net `+123`), tests/test support `+879/-213`, docs `+1/-1`; the body separates roughly `+30` icon/optimistic presentation lines from the four tested state-integrity capabilities.
- 2026-09-02: exact-head CI could not attach because GitHub reported `mergeable=CONFLICTING`. Merged current `origin/main` (`1623683f478`) without force-push; resolved the sole conflict in `cloud-workspace-conflict.e2e.test.ts` by retaining main's unified page lifecycle and the PR's authoritative `setSessionsListResponse` fixture operation. The conflict file plus both permission ordering suites passed (`10` tests).
- 2026-09-02: pushed merge head `493af63025629c686583f4acb8807b7389fe78d6`; GitHub reports the PR mergeable. Recomputed classified LOC against current `origin/main`: production `+202/-79`, tests/test support `+879/-214`, docs `+1/-1`; updated the PR body for the one-line conflict-resolution deletion.
- 2026-09-02: exact-head CI run `33657849866` found two infrastructure fetch failures after passing their checks and one reproducible `main` startup-recovery test failure. Fixed the test's stale disjoint-count assertion to count unique queue identities across overlapping `items`/`inFlight`; the focused Gateway test now passes. No production code changed.
- 2026-09-02: changed gate for the Gateway test passed; committed and pushed the test-only main repair as `d2db47c095ffae3ccc830ba8826083e5045977ac`. Updated PR-body tests/test-support LOC to `+880/-216`; production remains `+202/-79`.
- 2026-09-02: exact-head CI run `33659009084` completed with every product/test lane green; `check-docs`, `checks-fast-bundled-protocol`, and `check-guards` failed only on credential-less Git fetches after their work, which made the aggregate gate fail. Dispatched `gh run rerun 33659009084 --failed` for those exact failed jobs on the same SHA.
- 2026-09-02: exact-head CI run `33659009084`, attempt 2, completed green for `d2db47c095ffae3ccc830ba8826083e5045977ac`; all rerun fetch jobs and `openclaw/ci-gate` passed. PR rollup has no pending/failing checks (CodeQL is terminal neutral).
- 2026-09-02: rebased the PR linearly onto current `origin/main` `aef65cc57490a5c67ca8dc934ac24225c6d1069c`, which includes #135863. Skipped only the historical merge, the now-upstream icon CSS commit (main already owns explicit wrapper/SVG dimensions and coverage), and the removed startup-recovery assertion commit superseded by #136473. New local head `0651f9036d3991c99ebe174674a6fbeb93450ae8` retains all nine permission optimism/identity/reconciliation/monotonic-order commits; `origin/main` is verified as its ancestor.
- 2026-09-02: fetched `origin/main` again before push and verified merge commits `1b535dd2f4fb2d4cd63a2fdb80339d122f3d562b` (#136388) and `90392795cff9dc6c730a0ca712f5a8ac2e9fb03f` (#136419) as ancestors. Rebasing the same nine functional commits onto the subsequently advanced main produced `5e66c80de98dc44e5d8010c86ef7e3be6ae1becf` without conflicts; current `origin/main` is a verified ancestor.
- 2026-09-02: post-rebase focused proof passed (`130` session/component tests and `13` browser E2E tests, including permissions, conflict fixture, and inherited icon). The first changed gate exceeded the executor limit during core-test typechecking and left its owned lock; after verifying no owner/descendant remained, removed only that empty orphan lock. A fresh `check:changed` then passed all UI/core-test typecheck, lint, formatting, i18n, dead-code, and guard lanes.
- 2026-09-02: updated the PR body's rebased LOC to production `+196/-73` (net `+123`), tests/test support `+860/-214`, docs `+1/-1`. Force-pushed with an exact lease from remote `d2db47c095ffae3ccc830ba8826083e5045977ac` to new head `5e66c80de98dc44e5d8010c86ef7e3be6ae1becf`.
- 2026-09-02: live `gh pr view` confirms PR #134413 head `5e66c80de98dc44e5d8010c86ef7e3be6ae1becf` is `MERGEABLE`.
- 2026-09-02: required watcher command `node scripts/watch-pr-ci.mjs 134413 5e66c80de98dc44e5d8010c86ef7e3be6ae1becf` attached run `33679577516` and reached terminal `GREEN` with zero pending or superseded checks.
