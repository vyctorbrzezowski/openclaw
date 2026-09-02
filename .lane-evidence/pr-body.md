Closes #134155

## What Problem This Solves

Fixes an issue where users reading a Control UI chat in split view would see a darker horizontal band at the top of the transcript in light themes. The fade used the normal chat background even though the transparent split transcript exposes the panel surface.

## Why This Change Was Made

Split mode now paints the existing transcript fade from the panel token, scoped through the active split-cell marker already emitted by the layout owner. The normal single-pane path keeps its existing `--bg-content` fade, and the change introduces no new runtime state or configuration.

## User Impact

Split-pane headers and transcripts now read as one continuous surface while scrolled content still fades beneath the header. Normal chat presentation remains unchanged.

## Evidence

Both captures use the same light-theme split-pane fixture, viewport, transcript content, and fade geometry. Each image was inspected before upload.

| Before | After |
| --- | --- |
| ![Before: the split transcript fade paints a darker rectangular band](https://github.com/user-attachments/assets/d33f8267-ea65-4e86-81e4-e14187b07b3a) | ![After: the split transcript fades on the continuous panel surface](https://github.com/user-attachments/assets/8247ba6c-32a1-42a6-891c-c5d09c510b20) |

Focused regression coverage now checks the computed fade color for both states:

- Split mode resolves the fade start to the panel surface.
- Normal mode continues to resolve the fade start to the normal chat surface.

Consumers checked:

- Active split pane: panel-colored fade.
- Inactive split pane: same split-container surface contract.
- Normal single-pane chat: existing fade color preserved.

Validation completed:

- Focused before/after browser rendering: pass.
- Formatting and whitespace validation: pass.
- Changed-gate classification: UI production plus UI browser test.
- Exact-head CI: pending on this draft.

The full mocked app could not boot in this worktree because its shared dependencies provide `pako@1.0.11`, which does not expose the named `gzip` export required by `ui/vite.config.ts`. The focused browser fixture loaded the production styles directly; the committed regression runs in CI.
