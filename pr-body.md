Closes #132788

## What Problem This Solves

Fixes an issue where users viewing a completed progress-note tool call in the Control UI transcript would see its icon sit above the vertical center of the “Progress note updated” label.

## Why This Change Was Made

Tool-call summary rows now own their shared inline-flex layout and centered cross-axis alignment. This covers the progress receipt and every canonical tool-call row without changing icon size, typography, or disclosure behavior.

The progress receipt previously omitted the disclosure class that happened to provide flex alignment to ordinary tool calls. Moving that invariant to the shared summary owner avoids a one-off progress-card adjustment.

This formatting-context change intentionally activates the summary’s existing `gap: 7px` for the progress receipt. Its icon-to-label spacing therefore changes from inline typographic whitespace to the same explicit 7 px gap already used by the other tool-call summaries; no compensating receipt-specific rule is added.

## User Impact

Tool-call icons and labels are vertically centered consistently across command, read, edit, write, search, fetch, generic, and progress-note rows in both themes.

## Evidence

Canonical mock harness: `http://127.0.0.1:6005/chat`

Measured progress receipt before: `display: block`, `align-items: normal`, icon/label center delta `-3px`.

Measured after across all seven canonical tool-call kinds, a progress receipt in the list, and a standalone progress receipt: `display: inline-flex`, `align-items: center`, center delta `0px` for every row.

No movement behavior changed, so video evidence is not applicable.

| Theme | Before | After |
| --- | --- | --- |
| Light | ![Before in light theme](https://github.com/user-attachments/assets/3cde6754-3c91-40cc-a059-4207c3acf741) | ![After in light theme](https://github.com/user-attachments/assets/ccefb80d-fbef-479e-bfcb-e5c219cd5db3) |
| Dark | ![Before in dark theme](https://github.com/user-attachments/assets/4347ee60-ac75-4b23-87c8-2e42cc6bf34f) | ![After in dark theme](https://github.com/user-attachments/assets/bcf36e0b-2704-45e3-9b21-538143edb317) |

Long `Progress updated — 1/3` step at an equivalent 520×900 narrow viewport:

| Before | After |
| --- | --- |
| ![Long updated progress step before at narrow width](https://github.com/user-attachments/assets/ec36bc7e-43aa-4a8f-b6e2-cceb0049747e) | ![Long updated progress step after at narrow width](https://github.com/user-attachments/assets/f0cb01e2-61d9-4ff1-8e3d-b307b58cb92c) |

The long step is truncated in both states at the pre-existing narrow transcript boundary (`ui/src/styles/chat/layout.css:625-643`). Before the fix, the block formatting context also lets the icon wrap onto its own line; after the fix, the same long text remains truncated while the icon and label stay centered on one row. No new horizontal overflow was observed.

Local validation was limited to the canonical mock harness per maintainer lane policy; CI owns automated suites.

Codex autoreview against `origin/main`: clean, with no accepted or actionable findings.

### Scope gate

- `ui/src/styles/chat/tool-cards.css`: shared owner of collapsed tool-call row layout; the only production file changed.
- Production LOC: +2/−0. No test, fixture, generated, lockfile, or snapshot changes.

### Shared consumers checked

- Progress receipt (`renderProgressCardReceipt`): **changes** from block/baseline flow to inline-flex/center; the existing 7 px summary gap now governs icon-to-label spacing. Verified for note-only, updated-with-steps, normal-flow, standalone, and narrow long-step states.
- File tool card host (`renderToolCard`, file branch): **unchanged** visually and behaviorally because `.chat-inline-disclosure` already supplied inline-flex/center; read, edit, and write rows remained centered and their file disclosures expanded.
- Non-file tool card host (`renderToolCard`, button branch): **unchanged** visually and behaviorally because `.chat-inline-disclosure` already supplied inline-flex/center; command, search, fetch, and generic rows remained centered and their disclosures expanded.
- Tool-row contents (`renderToolRowContent` and `renderFileToolRowContent`): **unchanged**; command/read/edit/write/search/fetch/generic text, targets, and diff stats retain their existing inner layout inside the already-flex card hosts.
- Standalone shell/tool message (`chat-message-bubble.ts`): **unchanged** visually and behaviorally because its summary button already uses `.chat-inline-disclosure`; the disclosure still expands.

All seven interactive consumers produced visible expanded detail bodies in the harness.

### ClawSweeper rank-up moves

- **Resolve the +2 production LOC merge risk — applied.** The alignment invariant remains on `.chat-tool-msg-summary`, the shared owner used by the neutral progress receipt. Reusing `.chat-inline-disclosure` was rejected because it would import cursor, hover, focus, and disclosure presentation into a non-interactive status row. The two declarations are the smallest owner-boundary expression of the behavior, and the production delta remains +2/−0.
