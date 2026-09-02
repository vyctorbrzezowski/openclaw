# tasks-panel-order worklog

## Done

- Addressed ClawSweeper's missing-`endedAt` finding without changing the approved panel design or Refresh placement.
- Made terminal completion time a registry-owned invariant: new active-to-terminal transitions record the transition instant, while legacy terminal rows normalize with `endedAt ?? lastEventAt ?? createdAt` at restore and SQLite boundaries.
- Added regressions for all terminal statuses, stale active timestamps, generic transitions, bounded FINISHED membership, snapshot restore, SQLite writes, and real SQLite rows with `ended_at NULL`.
- Rebased cleanly onto `origin/main` at `ebd79690f26`; range-diff preserved the prior four commits and added only the terminal timestamp repair.
- Re-ran 240 focused tests and the complete scoped changed-file gate on the rebased head; all passed.
- Fresh autoreview was scoped-clean with no accepted/actionable P0 findings.
- Exact-head CI exposed one cron fixture whose supposed invalid row retained valid fallback timestamps; changed the fixture to corrupt the full timestamp envelope, reran its 71 tests plus the 240 focused task/Gateway tests, and received a clean two-pass autoreview.
- Pushed final candidate head `941e72b828afe731a3d39b2101c81150f61330a0`.
- Exact-head CI run 33600209155 passed the repaired cron shard and the PR's four Tasks-panel E2E scenarios. Two unchanged UI animation/timing tests failed but passed locally 7/7; job-specific reruns are blocked until the umbrella run becomes terminal.
- CI remains non-terminal because `ios-build` and `ios-screenshots-ipad-13` are queued for unavailable `blacksmith-12vcpu-macos-26` capacity. Do not write the closeout marker until they finish and the failed UI jobs rerun green.
- Closed the adversarial audit findings on final head `e960f73009477311e83c008a0d24137897c0473c`.
- Exact-head required CI passed in run 33580611104; PR #135499 remains open and ready for review.
- Addressed the adversarial audit findings without changing the approved lifecycle ordering or Refresh placement.
- Added `tasks.list.sortBy` as an additive protocol field. Omitted/default remains last-activity order; terminal web consumers request `"endedAt"` so the registry selects the correct bounded page before the UI receives it.
- Captured both regressions before implementation: terminal page membership excluded the newest completion, and the panel started a retry pair while the first pair's recent RPC remained pending.
- Removed the registry's nested three-attempt loop. The Gateway now owns the only three-scan consistency budget across registry and access revisions.
- Reduced the panel to two total attempts and changed each attempt to `Promise.allSettled`, so a retry cannot start before both sibling RPCs finish.
- Added immediate Refresh loading feedback with the existing canonical button spinner; the approved header position and action are unchanged.
- Updated protocol docs, task behavior docs, SDK forwarding coverage, standalone Tasks terminal requests, and the generated Swift protocol model.
- Ran 246 focused tests and eight web E2E scenarios after the repair. Protocol generation/checks, docs MDX/links, typecheck, format, lint, and repository guards passed.
- The changed-file gate's only failure is the unrelated `package-mac-app` missing-pnpm diagnostic test; it reproduces identically on current `origin/main`.
- Final autoreview completed clean with no accepted/actionable findings.
- Completed closeout on rebased `origin/main` (`eaed23a29231934ae4b288128cf9d39466d7fd46`) without changing the approved design.
- Removed the shared E2E harness extension from the final diff; the session-panel E2E now uses the existing retryable error contract.
- Preserved Refresh in the shared Tasks header and aligned its disabled state with the existing disconnected/loading behavior.
- Re-ran 120 focused tests, four session-panel browser scenarios, and all changed-file gates on final head `0333f2ea6fe5f4efc2d59929dcfd20751921e81e`.
- Inspected all final closeout captures under `.artifacts/control-ui-e2e/chat-tasks-panel-stable-order-GpeaIX/` and replaced the PR's after-fix media with those exact-head assets.
- Marked PR #135499 ready for review. Exact-head required CI `openclaw/ci-gate` passed in run 33572531063.
- Corrected the target after maintainer feedback: the affected surface is the Tasks side panel inside a chat session, not the standalone `/tasks` route.
- Confirmed the side panel renderer shares `partitionTasks`, so the lifecycle ordering fix already reaches RUNNING, FINISHED, and the session Tasks status preview.
- Removed the new standalone `/tasks` E2E from the branch and replaced it with a browser E2E that opens the Tasks tab inside a session.
- Added panel-owned retry for a retryable error that crosses the Gateway wire. It retries the complete active+recent snapshot pair three times, honors bounded retry delay metadata, and revalidates the exact session/client state after the delay.
- Added Refresh to the embedded Tasks tab header and alert semantics for exhausted retry errors.
- Added unit coverage for transient retry success, exhausted retry visibility, manual recovery, and session switching during retry delay.
- Captured and inspected a new baseline in `.artifacts/control-ui-e2e/chat-tasks-panel-before/`: task 5 moves from bottom to top, FINISHED follows activity instead of completion, and the internal retry text remains visible.
- Captured and inspected the final session-panel proof in `.artifacts/control-ui-e2e/chat-tasks-panel-stable-order-kgRDYB/`: RUNNING and FINISHED remain lifecycle-ordered, transient retry stays hidden, exhaustion is actionable, and Refresh recovers.
- Updated issue #135498 and PR #135499 titles, bodies, screenshots, and videos to use only the session Tasks side panel.
- Committed and pushed corrective head `7b38cb4338e4150b5aab9348281829396b5fb344`.
- Read the full lane brief and scoped repository guidance.
- Traced `tasks.list` from the session Tasks side panel through the Gateway to the task registry query.
- Reproduced the pre-fix behavior on base `d17027cfdc5e1be1d8fcabc50aa13e6a13b83e4c` with five mocked running tasks: an activity event moved task 5 from the bottom to the top, and the registry conflict text appeared in a red banner.
- Changed `ui/src/lib/tasks/data.ts` so active sections use immutable creation order, oldest first, and terminal sections use completion order, newest first.
- Changed `src/gateway/server-methods/tasks.ts` so exhausted inner registry scans continue through the existing outer retry budget; only total exhaustion returns retryable, actionable `UNAVAILABLE` guidance.
- Added focused data tests, real registry-churn Gateway coverage, and a mocked-browser session-panel E2E with five running tasks, two finished tasks, activity mutation, transient retry, exhausted retry, and recovery.
- Inspected every retained side-panel screenshot and video contact sheet. Before proof shows task 5 moving to the top, wrong FINISHED order, and the internal retry banner. After proof shows stable lifecycle order, silent transient retry, actionable exhaustion, and successful recovery.
- Ran focused owner/sibling tests, session Tasks side-panel browser E2E, `check:changed`, formatting, and `git diff --check` successfully.
- Autoreview attempted three times. Codex could not authenticate because its token is expired; Claude CLI is not installed. No clean autoreview verdict is claimed.
- Created issue https://github.com/openclaw/openclaw/issues/135498.
- Committed `9e6cef040ad11ffd03a8babef4a75c795ead3aaa`, pushed `fix/tasks-panel-stable-order` to the fork, and opened draft PR https://github.com/openclaw/openclaw/pull/135499 assigned to `vyctorbrzezowski` with maintainer edits enabled.

## Decisions

- RUNNING/queued order: creation time ascending. The oldest watched task stays anchored; newly created work appears at the end; mutable activity and queued-to-running transitions cannot reorder cards.
- FINISHED order: end time descending. `updatedAt` and `createdAt` remain fallbacks only for records without canonical `endedAt`.
- Retry owner: Gateway `tasks.list`, because it owns the idempotent list scan and final access revalidation. The generic client must not retry arbitrary RPCs, and UI-level retries would duplicate policy across consumers.
- Keep generic `sortTasks` activity ordering unchanged because snapshot freshness, inline subagent activity, Workboard linking, SDK, and CLI have different semantics.
- Terminal page membership is producer-owned: `tasks.list.sortBy="endedAt"` selects before pagination; omission preserves activity ordering.
- Retry budget is one registry scan per Gateway attempt, three Gateway attempts total, and at most one settled retry of the panel's active+terminal pair.

## Scope

### File Gate

- `src/gateway/server-methods/tasks.ts` — retry gateway: transient registry scan conflicts consume the existing bounded handler attempts; only exhaustion returns retryable actionable guidance. Keep.
- `src/gateway/server.tasks-list-performance.test.ts` — retry gateway: proves registry churn converges silently and sustained churn returns bounded retry metadata. Keep.
- `ui/src/lib/tasks/data.ts` — order by lifecycle: RUNNING/queued uses creation ascending; FINISHED uses end descending with canonical fallbacks; generic `sortTasks` remains untouched. Keep.
- `ui/src/lib/tasks/data.test.ts` — order by lifecycle: protects stable active order during activity updates and terminal completion order. Keep.
- `ui/src/pages/chat/components/chat-background-tasks.ts` — retry panel: retries the complete active+recent session snapshot, bounds delay, and fences session/client identity before reuse. Keep.
- `ui/src/pages/chat/components/chat-background-tasks.test.ts` — retry panel: proves transient success stays silent, exhaustion becomes visible, and manual Refresh recovers. Keep.
- `ui/src/pages/chat/components/chat-background-tasks-concurrency.test.ts` — retry panel: proves a delayed retry cannot cross a session switch. Keep.
- `ui/src/pages/chat/components/chat-background-tasks-render.ts` — retry panel: gives exhausted errors alert semantics in the Tasks rail. Keep.
- `ui/src/pages/chat/chat-pane-embedded-panels.ts` — Refresh: exposes the approved Refresh control in the shared embedded-panel header and disables it while disconnected/loading. Keep.
- `ui/src/pages/chat/chat-pane-layout-render.ts` — Refresh: wires the current Tasks panel callback and loading state into the shared header owner. Keep.
- `ui/src/pages/chat/chat-pane-embedded-panels.test.ts` — Refresh: proves click dispatch and disconnected/loading disabled states. Keep.
- `ui/src/pages/chat/background-tasks.e2e.test.ts` — all four thesis parts: real session side-panel proof for lifecycle order, activity stability, silent retry, exhausted error, and Refresh recovery. Keep.
- No fixture, tuner, mock-dev source, or shared test harness remains in the final diff.

### Audit Repair Additions

- `packages/gateway-protocol/src/schema/tasks.ts` — additive `sortBy` contract with activity-order default and `endedAt` option.
- `packages/gateway-protocol/src/tasks-validators.test.ts` — accepts current sort selectors and rejects unknown values; split from `index.test.ts` to stay under the file-size gate.
- `packages/gateway-protocol/src/index.test.ts` — moves task-validator cases to their focused owner; no behavior removed.
- `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` — generated projection of the additive protocol field.
- `packages/sdk/src/index.test.ts` — proves SDK params forward `sortBy` unchanged.
- `docs/gateway/protocol.md` — documents enum, default direction, and completion-order usage.
- `docs/automation/tasks.md` — documents stable Running, completion-ordered Finished, retry, and Refresh behavior.
- `src/tasks/task-registry-query.ts` — selects the bounded heap window with the requested comparator and performs one scan per Gateway attempt.
- `src/tasks/task-registry-query.test.ts` — regression for newest completion membership despite conflicting activity.
- `src/gateway/server-methods/tasks.test.ts` — Gateway boundary regression for bounded completion-selected pages.
- `ui/src/pages/tasks/tasks-page.ts` — terminal page consumer requests `sortBy: "endedAt"`.
- `ui/src/pages/tasks/tasks-page.test.ts` and `ui/src/pages/tasks/tasks.e2e.test.ts` — prove the shared terminal query contract.

### Adversarial Findings Resolved

- Wrong source data: reproduced with conflicting `endedAt` and activity timestamps, then fixed by selecting the bounded terminal page with `sortBy: "endedAt"` inside the registry heap owner.
- Stacked retry: removed the registry retry loop; Gateway owns three scans. Panel attempts fell from three to two and use `Promise.allSettled`, so both RPCs finish before the only retry starts.
- Refresh feedback: `loadBackgroundTasks` publishes loading synchronously; the approved header control becomes a canonical spinner and remains disabled until the pair settles.

## Consumers Checked

- Standalone Tasks page: changed shared partition result.
- Chat Tasks rail: changed shared partition result; focused tests pass.
- Chat status preview: changed shared partition result.
- Inline subagent activity: separate latest-activity owner, intentionally unchanged.
- Workboard task linking: separate freshness owner, intentionally unchanged.
- SDK and CLI `tasks.list`: activity-ordered pagination unchanged; only transient retry behavior changes.
- Sessions, questions/inbox, and Workboard refresh: separate retry owners, intentionally unchanged.

## Proof

- Before: `.artifacts/control-ui-e2e/chat-tasks-panel-before/`
- After: `.artifacts/control-ui-e2e/chat-tasks-panel-stable-order-sToNoM/`
- Focused tests: 246 tests passed across protocol, SDK, Gateway, registry, and UI owners.
- Browser E2E: 8 passed across the session Tasks panel and standalone shared consumer.
- Changed gate: format, typecheck, lint, protocol, docs, and repository guards passed; one unrelated macOS packaging test fails identically on `origin/main`.
- Final autoreview: clean, no accepted/actionable findings.
- Exact-head CI: green, run 33580611104.

## Next

- Wait for exact-head required CI to become terminal, rerun the two unrelated failed UI jobs, refresh the closeout marker only after green, and do not land in this phase.
