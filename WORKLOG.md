# Composer Default Icon Worklog

## Scope

- Investigate the missing icon before the `Default` model chip in the native macOS chat composer.
- Identify the owning render/data path and compare the native app with the mocked Control UI.
- Avoid duplicating PR #130829 or the `chat-model-fix` lane.
- Deliver an English issue, a draft PR, before/after visual proof, and the lane marker.

## Progress

- Read the lane brief, root policy, Control UI policy, and product direction.
- Corrected the initial chip identification from the screenshots: `Default` is the permission picker rendered by `renderChatPermissionPicker`; the model picker is the separate control on the right.
- Reproduced the reported empty icon in Playwright WebKit while Chromium renders the same DOM correctly.
- Moved the existing permission SVG sizing contract from the mobile-only breakpoint to the base permission-icon rule.
- Added a browser regression that injects the WebKit zero-intrinsic-size condition; it failed against the pre-fix CSS with a `0x0` glyph and passed with the base sizing rule.
- Installed the local Playwright WebKit runtime dependencies and captured the real engine behavior. Post-fix Chromium and WebKit both report a `16x16` permission SVG.
- Inspected all three retained composer captures: WebKit before has the empty reserved slot; Chromium and WebKit after both visibly render the shield.
- Focused tests passed: 23 permission/session-control tests and 5 model/control E2E tests.
- The repository changed-file gate passed after one retry with a larger command window; the first attempt was terminated by the tool timeout during test typechecking, not by a code failure.
- `pnpm ui:build` passed and produced the Control UI bundle within its JS/CSS budgets.
- The mandatory structured review returned `scoped-clean` with no actionable findings.
- Created issue #134409 with the bug-report template and attached WebKit before evidence.
- Committed the code/test repair as `8d7123c4ebd66dc8c6a53a04fd8ed2b3baffa70c` and pushed `fix/macos-composer-default-icon` to the `fork` remote.
- Opened draft PR #134413 with before/after WebKit screenshots, validation commands, and the production/test LOC split. GitHub reports the fork head at the exact local SHA and maintainer edits enabled.

## Evidence

- Reported app: macOS native build from 2026-08-27, commit `87d7d890dd88`, version `2026.8.1`.
- Trigger owner: `ui/src/pages/chat/components/chat-permission-picker.ts`.
- Icon owner: `ui/src/components/icons.ts` through the shared `strokeIcon()` shell.
- Layout owner: `ui/src/styles/chat/layout.css`.
- Chromium pre-fix: permission SVG `16x16`, 103 non-background pixels in a 16x16 crop.
- WebKit pre-fix: permission SVG `0x0`, zero non-background pixels while the 16x16 wrapper remained in layout.
- The published `OpenClaw-2026.8.1.zip` contains both the Control UI SVG provider assets and the compiled CSS, ruling out a missing app bundle asset. The permission icon is inline SVG and does not use those assets.
- PR #130829 and the `chat-model-fix` lane own an unrelated hidden effort-picker geometry gap; neither owns this icon.

## Next

- Monitor the draft PR CI separately; the requested lane delivery is complete.
