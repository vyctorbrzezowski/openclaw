# new-type-focus worklog

## Done

- Read `~/lanes/new-type-focus-prompt.md`, `~/lanes/PLAYBOOK.md`, root instructions, and `ui/AGENTS.md` in full.
- Re-read the authoritative in-repo `.lanes/new-type-focus-prompt.md` and `.lanes/PLAYBOOK.md` after the path update; markers now belong in `.lanes/markers/`.
- Fetched `origin/main`; created detached worktree at `origin/main` (`8a2f6c3c770`).
- Linked available dependency directories from `~/veredito-mine/repo`; did not run `pnpm install`.
- Existing-solution preflight found the canonical chat type-to-focus policy in `ui/src/pages/chat/chat-pane-lifecycle.ts:351-374`, with shared selectors/path matching owned by `ui/src/pages/chat/chat-pane-shared.ts:251-264`.
- History confirms the exemption contract was tightened in `9f263b2b190` (`fix(ui): keep remote input out of chat composer`); the shared extraction preserves that exact policy.
- Pre-fix mock reproduction at `http://127.0.0.1:6009/new?agent=roboclaw`: typing `x` with `<main>` focused left `<main>` active and the composer value empty.
- Post-fix mock proof at the same URL: typing `x` with `<main>` focused moved focus to the composer and produced value `x`.
- Post-fix exclusions on the same page: Ctrl/Meta shortcuts, Tab, Escape, IME composition, and a focused input all left the composer unfocused.
- Shared-consumer proof at `http://127.0.0.1:6009/chat`: typing `q` with `<main>` focused preserved chat's existing behavior (composer focused, value `q`).
- Scope-gated commit `97fc61b6c7827fefae836d90a11a6143ddf95725` created and pushed as `fix/new-session-type-focus`.
- Draft PR opened and assigned to `vyctorbrzezowski`: `https://github.com/openclaw/openclaw/pull/132773`.
- Issue created from the bug-report template and assigned to `vyctorbrzezowski`: `https://github.com/openclaw/openclaw/issues/132783`.
- Inspected equivalent 1440x900 light-theme before/after captures and start/end frames from the 2.28s typing recording; no clipped or incorrect state found.
- Uploaded `before.png`, `after.png`, and the Playwright `.webm` through GitHub user-attachments; updated PR evidence and added `Closes #132783`.
- Ran the project `autoreview` skill with Codex against refreshed `origin/main`; result clean with zero accepted/actionable findings, so no follow-up code change or second pass was needed.
- Adversarial audit verdict `PROVAVEL-REGRESSAO`: capture-phase type-to-focus stole Space from focused Web Awesome menu items because the exemption policy enumerated tags instead of interactive focus semantics.
- Pre-repair browser reproduction with the real `openclaw-agent-select`: `research` was focused with `role=menuitemradio`; Space kept `main` selected, inserted `" "` in the composer, left the menu open, and moved focus to the textarea.
- Canonical repair in `ui/src/pages/chat/chat-pane-shared.ts`: composed-path targets are exempt when contenteditable, explicitly exempt, natively/explicitly focusable, an interactive ARIA role, or inside an open overlay component.
- Post-repair keyboard proof: Enter opened the agent picker, ArrowDown focused/activated `research`, Space selected `research`, closed the menu, and left the composer empty.
- Re-proved the primary flow after the repair: typing `x` from non-interactive page chrome focused the composer and preserved `x`.
- Inspected corrected menu screenshots and the 4.04s recording frames. Rejected an earlier capture taken during the close animation; the retained v2 screenshots show the focused open option and fully closed selected state.
- Audit repair commits pushed: `c82dbbb24cdb31a4b330bf4b1fb8c6d2953d16a0` plus compact owner-policy follow-up `57d3cc7a6babec61d96dc230a88be8882804431a`.
- Final head `57d3cc7a6babec61d96dc230a88be8882804431a` passed Codex autoreview against `origin/main` with zero accepted/actionable findings.
- Uploaded the inspected agent-picker before-Space, after-Space, and readable video evidence through user-attachments; PR body now documents the audit regression, semantic repair, scope, consumers, and final proof.
- Re-audit verdict `PROVAVEL-REGRESSAO`: generic `tabindex` exemption blocked `<main tabindex=-1>` and changed the Chat contract for letters typed with a button/link focused.
- Verified `origin/main` directly: editors/combobox/listbox/textbox are always exempt, while button/link are exempt only for Space; ordinary letters still redirect to the Chat composer.
- Pre-repair live proof on the prior head: focused `#control-ui-main` kept `x` out of the New Session composer; focused Chat `Add attachment` kept `q` out of the Chat composer.
- Owner repair removes all generic `tabindex`/focusability inference. Always-exempt targets are text editors and key-consuming menu/option/listbox/combobox/radio roles; open overlays remain exempt; button/link keep the existing Space-only exemption.
- Post-repair isolated browser proof: (a) focused main produced composer `x`; (b) Enter/ArrowDown/Space selected `research`, closed the picker, and kept the composer empty; (c) focused Chat attachment button produced composer `q`.
- Added unit regressions at the owning boundaries for structural main focus, agent-menu Space consumption, and Chat button-focused letter routing. Existing tests did not cover either structural tabindex or the pre-existing button contract; no production test seam was added.
- Re-audit repair committed and pushed as `acdd237ae51a8e11880419a1dc42a832f6baa751`.
- Final Codex autoreview for `acdd237ae51a8e11880419a1dc42a832f6baa751` against refreshed `origin/main` returned zero accepted/actionable findings.
- Updated the PR body with the exact `origin/main` contract, all three isolated browser results, unit-test ownership, revised scope, and revised LOC split.
- Re-audit round 3 isolated one remaining over-broad branch: generic `.open === true` treated an open `<details>` disclosure as an overlay and blocked Chat's summary-focused letter routing.
- Round-4 owner repair narrows overlay semantics to `dialog[open]`, open Web Awesome/native popovers, and the existing menu/listbox roles; it never infers overlay state from a generic `open` property.
- Live mock proof at `/chat`: typing `x` with a real `<details open>` summary focused produced composer value `x` and focused the textarea; typing inside a real `<dialog open>` left focus on its button and did not route the new key to the composer.
- Round-4 commit `cd0334c38b9bc2563bfbcffa6f4bf29e9655b185` pushed to the draft PR; final Codex autoreview against refreshed `origin/main` returned zero accepted/actionable findings.
- Round-5 audit evidence identified both new failures on the prior head: a printable letter focused on a real Chat reply-context-menu item did not reach the composer, and an open dropdown could miss activation keys before its item gained focus.
- Intermediate live browser proof exposed the exact dropdown window: setting a real `wa-dropdown.open = true` before attribute reflection let Space focus the New Session textarea.
- Round-5 live browser proof after the owner repair: the real Chat context-menu letter produced composer value `x` and focused the textarea; a real `wa-dropdown` with `open === true` but no reflected `[open]` attribute kept Space on `<main>` and left the draft empty.
- Round-5 implementation encodes the matrix directly: printable-input consumers are separate from Space activation targets, menu/listbox roles no longer swallow letters, and the complete dropdown activation/navigation key set reads the synchronous `open` property rather than waiting for attribute reflection.
- Round-5 commit `97fd245cc32d9a7f32017698c5392f2e0ff29b77` passed Codex autoreview against `origin/main` with zero accepted/actionable findings.
- Pushed round 5 and updated the draft PR body with the invariant, exact 40-cell routing table, scope/consumer gate, live browser proof, revised LOC split, and validation limitation.

## Decided

### Round 5 routing invariant (written before code)

No printable key may disappear silently. A printable key routes to the composer/draft unless the focused element or an open overlay owns that key class. Menu/listbox options have no typeahead contract, so printable characters route to the composer even while their overlay is open. An open `wa-dropdown` owns activation/navigation keys immediately when `open` becomes true, including the interval before an item receives focus. Non-printable keys that neither the composer policy nor the focused surface owns remain unchanged with an explicit “no product binding” reason.

Destinations: **composer/draft** means focus moves before browser input delivery; **element** means the focused native/editor control receives the event; **overlay** means the open popup/dialog owns it; **nothing (no binding)** means this policy leaves the non-printable key untouched because that surface has no product action for it.

| Real surface | Printable (for example `x`) | Space | Enter | Arrows | Esc |
| --- | --- | --- | --- | --- | --- |
| `<main tabindex="-1">` | composer/draft | composer/draft | nothing (no binding) | nothing (no binding) | nothing (no binding) |
| composer `<textarea>` | element | element | element | element | element |
| `<button>` / `<a href>` | composer/draft | element | element | nothing (no binding) | nothing (no binding) |
| `<wa-dropdown-item role="menuitemradio">` | composer/draft | overlay | overlay | overlay | overlay |
| open `<wa-dropdown>` before item focus | composer/draft | overlay | overlay | overlay | overlay |
| `<dialog open>` | overlay | overlay | overlay | overlay | overlay |
| `<details open>` / `<summary>` | composer/draft | element | element | nothing (no binding) | nothing (no binding) |
| `<input>` / `[contenteditable="true"]` | element | element | element | element | element |

Test reflection requirement: one table-driven owner test will instantiate every listed native/custom element and exercise all five columns. It will assert composer routing for composer/draft cells and non-routing plus the real focused/overlay target for every other cell. The existing browser test remains the real Web Awesome selection proof; it will add printable-menu and just-open-dropdown scenarios. The obsolete synthetic `div.open=true` expectation will be removed.

- Use the canonical Control UI mock harness on `127.0.0.1:6009`.
- No local test/build/typecheck suite, per playbook invariant I.1.
- Existing-solution preflight is limited to the current UI and its dependencies; this is a small interaction repair and should reuse the chat owner if present.
- Reuse the chat policy by extracting its complete focus decision into `chat-pane-shared.ts`; both chat and `/new` will call the same owner.
- Regression coverage: real browser flow in `ui/src/e2e/chat-composer-focus.e2e.test.ts:11-26` proves the first character survives; `ui/src/pages/new-session/new-session-page.test.ts:57-89` covers shortcut, composition, input, select, textarea, and contenteditable exclusions.
- Test-audit gate for the audit repair: the new E2E protects user-visible keyboard selection and fails on the audited branch because Space reaches the composer; existing coverage only protected text controls and could not detect menu focus theft. It uses the production agent picker and requires no test-only seam.
- Round-4 test-audit gate: real `<details open>`/`<summary>` protects Chat's observable letter-to-composer contract, while real `<dialog open>` protects the overlay exemption. The generic `.open` regression makes the first assertion fail; prior button/menu tests cannot distinguish disclosures from overlays; no production-only seam is needed.
- Round-5 test-audit gate: the table-driven owner test protects all 40 routing cells using native elements plus real `wa-dropdown`/`wa-dropdown-item` elements. The audited head fails the printable-menu cell and the property-before-reflection dropdown cell. Existing isolated tests did not encode the full key-class contract; the synthetic `div.open=true` assertion was invalid and is removed rather than preserved. Browser coverage separately exercises the rendered agent picker and rendered Chat reply context menu; no production test seam is added.

## Next

- Await the next adversarial audit; keep PR draft.

## Scope gate

- `ui/src/pages/chat/chat-pane-shared.ts`: owns the canonical printable-key focus policy reused by both surfaces.
- `ui/src/pages/chat/chat-pane-lifecycle.ts`: migrates the existing chat consumer to the shared owner; no behavior change intended or observed.
- `ui/src/pages/new-session/new-session-page.ts`: applies that policy to `/new` through its existing capture-phase document listener.
- `ui/src/e2e/chat-composer-focus.e2e.test.ts`: regression proof that `/new` retains the first typed character through the browser input pipeline.
- `ui/src/pages/new-session/new-session-page.test.ts`: regression proof for shortcut, composition, and focused-editable exclusions.
- `ui/src/pages/chat/chat-pane.test.ts`: unit proof that Chat preserves its existing button-focused letter routing.
- Round 4 touches only `ui/src/pages/chat/chat-pane-shared.ts` (the owning overlay predicate) and `ui/src/pages/chat/chat-pane.test.ts` (real disclosure/overlay regression coverage); both are directly required by the audited Chat contract.
- `WORKLOG.md`: lane-only process record; remains untracked and outside the commit.

Final production delta: +62/-29 = net +33 lines. The growth is the new `/new` capability plus the explicit shared routing invariant and synchronous dropdown ownership boundary; the existing Chat-only branch was removed rather than duplicated. Tests: +339/-0 lines, including the required 40-cell real-element routing matrix and rendered browser flows.
