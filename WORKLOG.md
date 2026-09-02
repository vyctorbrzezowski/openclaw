# automation-links

## Done

- Read `.lanes/automation-links-prompt.md` and `.lanes/PLAYBOOK.md` in full.
- Read required workflow skills: `openclaw-pr-maintainer`, `control-ui-e2e`, and `gitcrawl`.
- Fetched fresh `origin/main` and created this detached worktree at `0594a100d97`.
- `gitcrawl` preflight attempted; binary is unavailable, so the required fallback is live `gh`.
- Inspected live PR 128097 and issue 128082 with `gh pr view`, `gh issue view`, and `gh pr diff`.
- Read scoped `ui/AGENTS.md` and `scripts/AGENTS.md` in full.
- Verified current-main automation deep-link contract: `src/config/control-ui-link-base.ts:39-52` builds `/automations?job=<id>[&run=<id>]`; `ui/src/pages/cron/route-model.ts:1-8` parses it; `ui/src/pages/cron/cron-page.ts:171-202` consumes it after inventory load.
- Traced Inbox producer/consumer: failed and overdue items drop the known job id at `ui/src/components/sidebar-attention-items.ts:67-130`; the action type has no route options at `ui/src/components/sidebar-attention-entries.ts:27-39`; rendering hardcodes the list path at `ui/src/components/sidebar-issue-item.ts:272-303`; the navigation callbacks also drop options at `ui/src/components/sidebar-attention.ts:84-85,562-566,687-690`.
- Found an additional existing automation reference: Workboard already renders an automation chip when `automationJobId` exists, but links only to the list at `ui/src/pages/workboard/workboard-page.ts:371-380`.
- Verified PR opener identity and recent activity live: Vyctor H. Brzezowski (`@vyctorbrzezowski`, user account); 387 repository PRs, 269 repository issues, and 259 repository commits in the last 12 months. Both the issue and PR were self-assigned on 2026-08-23.
- Verified landed overlap: PR 130049 merged the current query deep-link contract on 2026-08-26 (`8bf8e80e1d6bcf631a84c6a85cc50590970c674d`), so PR 128097's path-route thesis is obsolete.
- Traced history provenance for the two retained origins: Inbox attention navigation came through `d26e097263c`; the Workboard automation chip came through `c4eb9078d97`.
- Read the focused Inbox, Workboard, and route-path tests plus the full relevant rendering/navigation modules.
- Confirmed the canonical `approval` mock fixture already supplies faithful failed and overdue automation incidents, including stable job ids; no fixture-only production imitation is needed.
- Attempted the canonical mock on port 6011. Vite failed before listening with `EMFILE` while creating a file watcher. The process soft/hard fd limits are already 1048576; host `fs.inotify.max_user_instances=128` is the constrained resource. No process is listening on 6011.
- Started the unchanged canonical `approval` mock on `127.0.0.1:6011` with Chokidar polling scoped to the process, avoiding the exhausted host inotify-instance pool.
- Captured the pre-fix browser reproduction: Inbox incidents rendered `href="/automations"`; clicking “Sync team calendar” ended at `/automations` with no job selected.
- Implemented one query-location owner at `ui/src/app-route-paths.ts:114`, carried standard navigation options on Inbox entries, delegated row opening back to the Inbox owner, and removed the app-sidebar callback wrapper that discarded navigation options.
- Updated the existing Workboard automation chip to use the same query-location owner.
- Extended focused tests at the observable boundaries: incident producers preserve each job id, the rendered anchor keeps base path plus query and delegates the item to its owner, and the existing Workboard chip renders the direct URL. No test-only production seam was added.
- Revalidated after the final refactor through HMR in the original browser session: the Inbox anchor is `/automations?job=mock-cron-calendar-sync`; clicking it leaves that URL intact and visibly opens “Sync team calendar”; no Vite error overlay appeared.
- Inspected the annotated before/after screenshots in `.artifacts/automation-links/`. The faithful mock has Workboard disabled, so its chip cannot be live-tested without altering product configuration; retained the existing DOM boundary test instead.
- Ran targeted `oxfmt` and `git diff --check`. Per lane policy, ran no local test, build, typecheck, or suite.
- Invoked the `test-audit`-required `autoreview` pass. Its Codex reviewer remained alive but produced no verdict within the documented 30-minute window; terminated only the reviewer and recorded it as unavailable, not clean.

## Decided

- Maintainer order (verbatim): "mudar ela para: onde houverem links para automações, linkar diretamente. exemplo: inbox. mas nao expandir demais isso."
- Scope remains contained to existing automation references; Inbox is the canonical target.
- No commit, push, PR rewrite, or landing action before explicit GATE 1 approval.
- Local machine is mock-only: no local test/build/typecheck/suite.
- Existing-solutions gate: current main already owns and consumes the query deep-link contract; reuse it. No new path grammar, package, router, platform, dependency, configuration, protocol, or persistence surface.
- PR thesis migration:
  - Keep: updating existing job-aware links/actions (Inbox failed/overdue incidents; Workboard automation chip) and focused tests/mock proof.
  - Drop: path-based `/automations/<jobId>` routes, route synchronization/recovery UI, shared URL-package changes, native route changes, docs for path URLs, tool-result `automationUrl`, notification buttons, unrelated macOS/test/config cleanup, and broad route refactors.
- Canonical fix: carry existing `ApplicationNavigationOptions` on the Inbox item, let the existing Inbox owner execute the action, forward the shell callback without laundering its arguments, and use one query-location helper owned beside the Control UI route table. Reuse that helper for the already-linked Workboard chip.
- Test-audit gate:
  - Observable contract: known automation references retain their exact job id through href rendering and in-app navigation.
  - Credible regression: a route-only action or one-argument callback silently drops the query, reproducing the original list-only result.
  - Existing coverage gap: tests asserted only route id and list href, never the job query or owner delegation.
  - Production seam: none; tests exercise existing producer and DOM boundaries.
- Maintainer order (2026-08-31): create no new PR, including drafts, unless that exact PR is explicitly approved. PR 128097 predates the order, so this lane may only continue that existing PR; never create a replacement. After GATE 1, final delivery records `pr=https://github.com/openclaw/openclaw/pull/128097`, `branch=`, and `sha40=` in the marker.

## Next

- Create the `.done` marker with the mock URL, evidence, scope, existing PR URL, and explicit pending branch/SHA fields.
- Stop at GATE 1. Do not commit, push, rewrite PR 128097, or create any PR until explicit approval.
