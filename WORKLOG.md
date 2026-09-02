# split-fade-color

## Done

- Reproduced the light-theme split-only fade band and inspected the supplied full/cropped captures.
- Traced the surface contract through `ui/src/styles/chat/sidebar.css:88`, `ui/src/styles/chat/split-view.css:37`, and `ui/src/pages/chat/chat-page-pane-render.ts:59`.
- Confirmed that `.chat-split-view__cell--active` is emitted only in split mode; normal mode has no active-cell marker.
- Scoped the panel-colored fade to split mode in `ui/src/styles/chat/split-view.css:53`.
- Added split/normal computed-style coverage in `ui/src/pages/chat/chat-responsive.browser.test.ts:1234`.
- Formatted the two changed files, ran `git diff --check`, classified changed gates, and inspected final before/after captures.
- Searched GitHub for duplicate issues/PRs; related #122137, #122220, and #123308 cover the original fade and scrollbar gutter, not this split-only surface mismatch.
- Opened issue #134155 assigned to `vyctorbrzezowski`.
- Committed and pushed `5fd9bd9502e63018c265deec80c4c1e1a37fe08f` on `fix/split-pane-transcript-fade`.
- Opened draft PR #134161 assigned to `vyctorbrzezowski`; verified draft state, base/head, body attachments, and queued CI.
- Maintainer order received after PR creation: create no further PRs; record the preexisting PR URL in the closeout marker.

## Decisions

- Reuse the existing split-mode active-cell marker; add no runtime state or configuration.
- Override only the split transcript overlay background; preserve normal chat's `--bg-content` fade.
- Keep visual fixture/capture files outside the commit.
- Do not cite an external standard: the repair rests on repository-owned surface tokens and DOM state.

## Validation

- Visual before: `.lane-evidence/split-fade-before-final-proof.png` — inspected; darker rectangular band visible.
- Visual after: `.lane-evidence/split-fade-after-final-proof.png` — inspected; continuous panel surface and fade preserved.
- Formatter: pass on the two changed files.
- `git diff --check`: pass.
- `check-changed --dry-run`: `coreTests, ui` lanes.
- Local Vitest/build/typecheck intentionally not run under lane playbook; exact-head CI owns executable gates.
- Vite mock startup blocked before app boot because the shared worktree dependencies provide `pako@1.0.11`, which lacks the current named `gzip` export. Static Playwright proof used the real owner styles instead.

## Next

- Leave PR #134161 in draft for maintainer iteration.
