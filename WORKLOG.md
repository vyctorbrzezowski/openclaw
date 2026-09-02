# inbox-icon-settings closeout

## Done

- Confirmed PR #135722 head and current `origin/main`; main still contains the Settings/onboarding floating-host branch.
- Read the latest ClawSweeper review and its rank-up moves.
- Verified direct consumers on current `origin/main`:
  - `floatingSidebarAttentionVisible`: `ui/src/app/app-shell-view.ts` preloads the lazy element only when the predicate allows it; `renderFloatingUpdateCard` uses the same predicate to mount it.
  - `renderFloatingUpdateCard`: `ui/src/app/app-shell-view.ts` is the sole production caller.
  - `sidebar-attention-floating.css`: imported in production by `ui/src/components/sidebar-attention.ts`; directly exercised by `ui/src/components/sidebar-attention-layout.browser.test.ts`.
  - Result: one canonical floating visibility owner and one shell renderer; CSS remains required for collapsed desktop, while onboarding uses an unclassed presenter in the Custodian header.
- Captured and inspected current-main/head screenshots for Settings after expanded-sidebar, collapsed-sidebar, and native-web-chrome entry, plus head chat with expanded and collapsed navigation.
- Visual result: current main shows the forbidden floating button in all three Settings cases; the head shows none. Chat retains exactly one visible Inbox in the footer when expanded and exactly one in the top chrome cluster when collapsed.
- Post-rebase proof passed: 28 owner/browser tests, 28 focused E2E tests, UI typecheck, targeted stylelint, and diff check.
- Fresh branch autoreview completed with no accepted/actionable findings.
- Uploaded the eight inspected screenshots for the PR body.
- Rewrote PR #135722 with the current template, scope gate, consumer audit, inspected before/after proof, and `Closes #135720`.
- Force-with-lease pushed the rebased single commit `3897aa1fdc8911a962b3e59d741e5b6f34f953d5`; remote head matches and GitHub reports mergeable.
- Marked PR #135722 ready for review. No land action was run.

## Scope Gate

- `ui/src/app/navigation-surface.ts`: floating-host owner. Removes Settings as a positive host, leaves collapsed desktop as the only floating host, and accepts the retained presenter instance.
- `ui/src/app/app-shell-view.ts`: sole shell renderer. Stops passing Settings as a floating input, preloads the shared component for onboarding, and mounts the retained floating instance only when allowed.
- `ui/src/app/app-host.ts`: lifecycle owner. Retains one floating presenter identity so committed cron/model-auth state survives the Settings surface gap.
- `ui/src/components/sidebar-attention.ts`: state owner. Preserves the committed scope/Gateway facts through view-only disconnects while clearing health state for a different Gateway owner.
- `ui/src/pages/custodian/custodian-page.ts`: onboarding owner. Mounts one unclassed Inbox in its existing header actions so limited users keep `Request admin` without creating another floating host.
- `ui/src/styles/sidebar-attention-floating.css`: removes the positioning rule for the forbidden Settings and old onboarding floating host; retains collapsed desktop and native titlebar geometry.
- `ui/src/app/app-host-native-shell.test.ts`: protects collapsed desktop presence and absence of the shell floating presenter during onboarding.
- `ui/src/app/navigation-surface.browser.test.ts`: protects retained-element rendering through the real browser layout boundary.
- `ui/src/components/sidebar-attention.test.ts`: owner-level regression proving the local health badge survives a view-only remount.
- `ui/src/e2e/sidebar-settings.e2e.test.ts`: primary browser regressions. Proves Settings remains empty in three entry modes and loaded cron/model-auth attention survives collapsed chat -> Settings -> chat while reload RPCs are deferred.
- `ui/src/e2e/device-scope-upgrade.e2e.test.ts`: lifecycle proof. Settings has no presenter while pending scope state survives; onboarding's own bare presenter exposes `Request admin`.
- `ui/src/e2e/lazy-custom-element-recovery.e2e.test.ts`: lazy-boundary sibling proof. Moves the hashed Inbox chunk failure/recovery scenario away from the removed Settings fallback to the sole valid floating host, collapsed desktop navigation, so deleting the fallback does not silently delete recovery coverage.

## Decisions

- Adversarial findings supersede the earlier onboarding interpretation: floating Inbox remains only in collapsed desktop navigation; Settings mounts none; onboarding keeps the shipped Inbox in its own Custodian header host without the floating class.
- The collapsed floating presenter is retained by the shell, matching the resident sidebar pattern, so its local cron/model-auth snapshot survives the Settings surface gap while a different Gateway owner still clears it.
- No CSS hiding and no replacement fallback. Fix remains at the canonical visibility predicate.
- Fixture/harness and this worklog stay untracked and outside the commit.

## Adversarial Reproductions

- Onboarding regression failed before the repair because `.custodian__header-actions` contained no Inbox presenter and `Request admin` was unreachable.
- Remount regression failed before the repair because `chat collapsed -> Settings -> chat` produced a different floating element with no committed local health badge while cron/auth reloads were deferred.
- Repaired boundary proof: onboarding uses a bare presenter with `Request admin`; the collapsed presenter retains badge `2` through Settings and refreshes after deferred RPCs resume.
- Regression tests failed on the prior PR head for the intended reasons: missing onboarding host and replaced floating element identity.
- Production repair uses the existing lazy custom-element loader for onboarding and retains one shell-owned floating presenter; no static boot import, cache, or alternate Inbox implementation was added.
- Rebased both conventional commits cleanly onto `origin/main` at `aca70c7d277`.
- Final focused proof after rebase: 94 owner/component tests passed; 29 Settings/onboarding/lazy-boundary E2E passed; UI typecheck, stylelint, and diff check passed.
- Inspected visual proof: onboarding shows one bare header Inbox with `Request admin`; collapsed chat returns from Settings with the same `4 inbox items` badge and Settings has zero hosts.
- Uploaded both adversarial-finding proof screenshots for the PR body.
- Updated PR #135722 body with corrected onboarding contract, remount-state owner repair, scope gate, failing pre-fix proof, and inspected screenshots.
- Force-with-lease pushed remote head `199ef22ae601bf982ef0213ec308c6c1fd70201c`; GitHub reports mergeable and the PR remains ready, not landed.
- Fresh exact-head branch autoreview completed with no accepted/actionable findings.
- Owner-leak regression: the retained badge was keyed only by the Gateway object; Settings reconnects the same capability with a new `connectionRevision`, so the old owner badge reappeared. The retained snapshot is now keyed by Gateway capability + connection revision + canonical `selfUser.id`, then agent/cron scope.
- Native-update regression: `postNativeUpdate` records the confirmed handoff fact at the WebKit boundary; the app-lifetime native routing owner consumes the matching macOS decline and delegates to `overlays.runUpdate`, independent of route-mounted presenters. Duplicate or uncorrelated declines are ignored.
- Both new E2E tests failed on the prior head for the intended reasons: stale badge present after credential switch; zero `update.run` after native decline in Settings.
- The update-failure sibling now verifies the recorded result on `/settings/updates`, its canonical visible owner, instead of trying to reopen the intentionally absent Settings Inbox.
- Rebased the three conventional commits onto `origin/main` at `8a8bf9cbfe6`.
- Final owner key: Gateway capability identity + `connectionRevision` + canonical `snapshot.selfUser.id`, with selected-agent and cron scope checks retained.
- Final native flow: `postNativeUpdate` emits a private posted fact after the WebKit message succeeds; app-lifetime `startNativeLinkRouting` consumes one matching macOS decline and calls the bootstrap-owned update overlay. Route cards no longer duplicate decline policy.
- Post-rebase proof: owner/component suites, 35 focused E2E tests, UI typecheck, stylelint, and diff check passed.
- Final branch autoreview completed clean after the owner-key/native-fallback repair.
- Rewrote PR #135722 with both new findings, producer/consumer evidence, updated scope gate, and focused proof.
- Force-with-lease pushed `a42a0e0ee526e5d2dd745ce8dcc4d227dc0c0c0f`; remote head matches, PR remains ready and mergeable, and no land action ran.

## Next

- Write the closeout marker with the exact remote head SHA; leave CI to run without landing.
