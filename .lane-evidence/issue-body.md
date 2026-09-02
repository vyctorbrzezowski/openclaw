### Bug type

Behavior bug (incorrect output/state without crash)

### Beta release blocker

No

### Summary

In the Control UI split view, the transcript's top fade starts from the normal chat background color instead of the split pane surface, producing a darker horizontal band in light mode.

### Steps to reproduce

1. Open a Control UI chat in light mode.
2. Open split view so the chat transcript is rendered on the panel surface.
3. Scroll transcript content beneath the pane header.
4. Observe the top 24px fade region.

### Expected behavior

The transcript should fade beneath the header while preserving one continuous split-pane surface. Normal single-pane chat should retain its existing background and fade color.

### Actual behavior

The split transcript fade starts from `--bg-content`, which is darker than the exposed `--panel` surface in light mode, so the fade renders as a visible rectangular band.

### OpenClaw version

`main` at `d37f9a1ad68359e7f4256bf6e4ec4602eb32806d`

### Operating system

Ubuntu 24.04

### Install method

Source checkout with the Control UI browser fixture

### Model

Not applicable (Control UI presentation)

### Provider / routing chain

Not applicable (Control UI presentation)

### Additional provider/model setup details

Not applicable.

### Logs

No runtime error is emitted; this is a deterministic CSS presentation defect.

### Screenshots, recordings, and evidence

Both captures use the same light-theme split-pane fixture, viewport, content, and fade geometry.

| Before | Expected |
| --- | --- |
| ![Before: the split transcript fade paints a darker rectangular band](https://github.com/user-attachments/assets/d33f8267-ea65-4e86-81e4-e14187b07b3a) | ![Expected: the split transcript fades on the continuous panel surface](https://github.com/user-attachments/assets/8247ba6c-32a1-42a6-891c-c5d09c510b20) |

### Impact and severity

- Affected: Control UI users using split view in light themes.
- Severity: Low; visual defect with no interaction or data impact.
- Frequency: Always when the split-pane panel and normal chat background tokens differ.
- Consequence: The darker band breaks the intended continuous header-to-transcript surface.

### Additional information

The normal single-pane fade is correct and should remain on `--bg-content`. The defect is limited to split mode, which is already identified by the active split-cell marker.
