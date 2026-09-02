# file-open-panel investigation

## Status

- Done: read `.lanes/file-open-panel-prompt.md` and `.lanes/PLAYBOOK.md` in full; the repo-local paths supersede the earlier home-directory copies.
- Done: fetched `origin/main` and created detached worktree at `8a2f6c3c770`.
- Done: linked root, `ui/`, and available `packages/*/node_modules` from `~/veredito-mine/repo`; no install was run.
- Done: added a bench-only default fixture with clickable code, text, and diff references in `scripts/control-ui-mock-dev.ts:1361`, backed by session-file responses in `scripts/control-ui-mock-dev.ts:1495` and `scripts/control-ui-mock-dev.ts:1638`.
- Done: started the canonical mock command on port 6002 and inspected the real interaction at 1440×900 and 390×844.
- Done: visually inspected desktop and mobile screenshots under `.artifacts/file-open-panel/`; all three controls open visible file content in Review.
- Decided: investigation only; preserve current behavior and make no product-design changes.
- Decided: no custom UI or library proposal. Existing Lit, sidebar-layout, and panel-tab primitives already own this flow; the bench reuses them unchanged.
- Done: maintainer closeout order identified a design-independent overflow invariant and authorized the minimum repair.
- Done: reproduced the defect before editing: at 390×844, Review was 381 px while `.sidebar-panel-host--fill` grew to 576 px and `.file-view` to 542 px; the outer panel clipped content before CodeMirror could own horizontal scroll.
- Done: repaired the shared fill-wrapper boundary with `min-width: 0` at `ui/src/styles/chat/sidebar.css:1563`.
- Done: post-fix browser measurement: fill host 381 px, file view 347 px, CodeMirror scroller `clientWidth=347`, `scrollWidth=542`, `overflow-x=auto`.
- Done: visually inspected equivalent light/dark before/after captures in `.artifacts/file-open-panel/overflow-proof/`; before clips the path-bar actions, after keeps them visible and truncates the path while the editor scrolls.
- Done: created issue #132797, assigned to `vyctorbrzezowski`.
- Next: commit production + regression test only, open draft PR, attach evidence, autoreview, and leave draft operationally ready.

## Constraints

- No `pnpm install`, local test/build/typecheck/suite, `open`, commit, push, or writes outside this worktree except the required final marker.
- Bench command: `node --import ./scripts/tsx.mjs scripts/control-ui-mock-dev.ts -- --host 127.0.0.1 --port 6002`.
- Final state: local URL plus concise click-to-tab map in `.lanes/markers/file-open-panel.done`, or exact blocker in `.blocked`.

## Evidence map

- Link creation: `ui/src/components/markdown-parser.ts:353` decorates path-looking markdown; inline code renders as an actionable `a.markdown-file-link` at `ui/src/components/markdown-parser.ts:615`.
- Target extraction: `ui/src/components/markdown-file-links.ts:76` reads `data-file-path` and optional line; keyboard Enter/Space shares the same target at `ui/src/components/markdown-file-links.ts:92`.
- Click/keyboard handler: delegated transcript handlers call `onOpenWorkspaceFile` at `ui/src/pages/chat/components/chat-thread.ts:133` and `ui/src/pages/chat/components/chat-thread.ts:159`.
- Pane bridge: `ui/src/pages/chat/chat-pane-render.ts:526` routes the target to `openSessionWorkspaceFile`.
- Load owner: `ui/src/pages/chat/components/chat-session-workspace.ts:186` records the active request, calls `handleOpenSidebar(null)` immediately at line 199, awaits `sessions.files.get` at lines 226-240, builds file content at lines 350-367, then publishes it at lines 210-212. Stale opens are rejected by the request identity checks at lines 180-183 and 204-211.
- Slot/tab owner: `ui/src/pages/chat/chat-state-page.ts:408` maps non-attachments to the `detail` slot, calls `openSlot`, activates it, fits desktop width, stores `sidebarContent`, and updates layout. `ui/src/pages/chat/sidebar-layout.ts:17` defines 480×360 defaults; `ui/src/pages/chat/sidebar-layout.ts:93` creates or reactivates the slot and opens the region.
- Review label/content: `ui/src/pages/chat/chat-pane-embedded-panels.ts:186` projects the `detail` slot as `review`; lines 202-205 switch between skeleton and rendered content. `ui/src/pages/chat/components/chat-sidebar-region.runtime.ts:140` builds the tab strip and lines 277-295 mount the active panel.
- Geometry: `ui/src/pages/chat/components/chat-sidebar-region.runtime.ts:343` applies stored width/height. Desktop is a right flex sibling (`ui/src/styles/chat/sidebar.css:126`, `ui/src/styles/chat/sidebar.css:297`); narrow layout puts primary in grid row 1 and Review in row 2 (`ui/src/styles/chat/sidebar.css:288`, `ui/src/styles/chat/sidebar.css:800`).
- File presentation: `ui/src/pages/chat/components/chat-detail-slot.ts:52` mounts `openclaw-chat-detail-panel`; file content routes to the file renderer in `ui/src/pages/chat/components/chat-sidebar-content.ts:250`.

## Observed current behavior

- Desktop 1440×900: Review appears at x=960, y=0, width=480, height=900. Chat becomes x=258, width=696. The change is immediate; no transform or authored transition animates the panel entrance.
- Mobile 390×844: chat becomes a 382×331 top row; Review appears at x=4, y=424, width=382, height=420. This is an in-flow two-row re-layout, not an overlay/modal.
- Tab: exactly one active `Review` tab is created on first open; subsequent code/text/diff clicks reuse it and replace its content.
- Focus: after mouse click, `document.activeElement` remains the transcript link on desktop and mobile; focus is not moved into Review.
- Timing: `handleOpenSidebar(null)` makes Review visible before the file request resolves. The visible skeleton then changes to the editor; even with an immediate mock response, the screenshot can catch the editor shell still skeletonized before CodeMirror paints.
- Line target: the code link `ui/src/ui/views/chat.ts:2` carries line 2 through the same target object into the file view.
- Screenshots: `.artifacts/file-open-panel/desktop-before.png`, `desktop-chat.ts.png`, `desktop-file-open-panel.txt.png`, `desktop-file-open-panel.diff.png`, plus matching `mobile-*` captures. Measured DOM facts: `.artifacts/file-open-panel/observations.json`.

## Design hypotheses

- Transition hypothesis: the abrupt flex/grid insertion may read as a jump because the primary area shrinks/reflows in one frame and no spatial transition explains where Review came from.
- Timing hypothesis: opening an empty Review immediately, then skeleton, then editor paint can feel like two or three successive states for a single click.
- Layout-shift hypothesis: desktop content narrows by the full 480 px; mobile moves the composer upward and inserts a 420 px lower row. The clicked link stays visible but the surrounding composition changes substantially.
- Focus hypothesis: retaining focus on a control in the now-smaller transcript is keyboard-safe, but offers no focus/announcement cue that the new Review region is ready; conversely, auto-moving focus could be disruptive. Needs maintainer judgment.
- Mobile-position hypothesis: the lower-half split preserves transcript context but can resemble a drawer that opened too low, especially because it is neither an overlay nor full-screen.
- Tab hypothesis: the generic `Review` label does not identify the selected file; the filename only appears inside the panel body, so the relationship between click and tab may momentarily be unclear during loading.
- These are hypotheses only. No product behavior, animation, focus policy, sizing, or tab semantics were changed.

## Repair closeout

- Root cause: `.sidebar-panel-host--fill` is the flex item that owns the boundary between the fixed Review slot and content-sized descendants. Its documented contract says descendants must shrink and scroll, but the wrapper retained the flex default `min-width: auto`, so CodeMirror's max-content width became the wrapper's minimum width.
- Architectural owner: the shared fill-wrapper CSS in `ui/src/styles/chat/sidebar.css`, used by file, markdown, attachment, and session-diff Review content.
- Canonical fix: add `min-width: 0` beside the existing `min-height: 0`; no consumer guard, alternate flow, animation, focus, or geometry change.
- Test-audit gate: the browser regression protects the observable boundary that long lines stay inside Review and the CodeMirror scroller owns horizontal overflow. It fails on pre-fix CSS because `.file-view.scrollWidth > .file-view.clientWidth`. Existing tests cover rendering/editing but not constrained-width ownership. It adds no production seam.
- Scope gate:
  - `ui/src/styles/chat/sidebar.css`: owns the violated shared shrink/scroll invariant; +1 production line.
  - `ui/src/pages/chat/components/chat-sidebar-file-view.browser.test.ts`: focused real-browser regression for the reported file-preview consumer; test-only growth.
  - `scripts/control-ui-mock-dev.ts`, `WORKLOG.md`, and `.artifacts/**`: bench/investigation only; explicitly excluded from commit.
- Shared producer consumers checked nominally from `renderSidebarPanel`: file editor, markdown preview, attachment preview, and session diff all use `.sidebar-panel-host--fill` (`ui/src/pages/chat/components/chat-sidebar-content.ts:394`). The generic shrink constraint preserves their vertical sizing and only prevents horizontal min-content expansion.
## Adversarial audit follow-up for PR #132800

- F1 fixed without design change: `chat-sidebar-file-view.browser.test.ts` now imports the production chat stylesheet and mounts the constrained case as `openclaw-chat-detail-panel.chat-sidebar` under the canonical flex owner `.side-panel__panel` at 320 px. Existing editor tests retain their prior direct fixture.
- Focused red proof: with only `sidebar-panel-host--fill { min-width: 0 }` removed, the target Chromium case failed because the file view expanded to 7905 px inside a 320 px panel.
- Focused green proof: restoring the production rule made the target pass; the complete file then passed 10/10 Chromium tests.
- Test-audit gate: protects the observable Review containment/scroll-owner invariant; credible regression is removal of the horizontal flex minimum; previous coverage did not load `styles/chat.css` or mount the flex owner; no production-only test seam was added.
- F2 declaration: the shared fill wrapper also serves the Files attachment preview. Checked variants are audio player, video player, scaled image, compact document/download card, and visible unavailable-source state; all retain their existing presentation while gaining the same horizontal containment boundary.
- Scope remains two committed files: one production CSS line and the focused browser regression. Harness, evidence artifacts, and this worklog remain outside the commit.
