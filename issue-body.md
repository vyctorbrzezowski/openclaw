### Bug type

Behavior bug (incorrect output/state without crash)

### Beta release blocker

No

### Summary

The icon in a standalone “Progress note updated” tool-call receipt is vertically offset from its label in the Control UI transcript.

### Steps to reproduce

1. Start the canonical Control UI mock harness.
2. Render a completed `progress_card` tool call containing a Markdown progress note between two chat messages.
3. Compare the vertical center of the receipt icon with the vertical center of “Progress note updated”.

### Expected behavior

The tool-call icon and label share the same vertical center, matching other tool-call rows.

### Actual behavior

The progress receipt renders its summary as a block with normal baseline behavior. In the reproduced harness, the icon center was 3 px above the label center.

### OpenClaw version

`main` at `8a2f6c3c770`

### Operating system

Ubuntu 24.04

### Install method

Repository mock harness

### Model

Not applicable; this is deterministic Control UI rendering.

### Provider / routing chain

Not applicable; the canonical mock gateway reproduces the issue.

### Additional provider/model setup details

Not applicable.

### Logs

```shell
Before: display=block, align-items=normal, icon/label center delta=-3px
```

### Screenshots, recordings, and evidence

The associated draft PR includes equivalent before/after screenshots in light and dark themes.

### Impact and severity

Affected: Control UI users viewing progress-note tool calls in chat transcripts.

Severity: Minor visual defect.

Frequency: Always for the reproduced standalone progress-note receipt.

Consequence: Progress activity looks visibly less polished and inconsistent with other tool-call rows.

### Additional information

The receipt omits the disclosure class that supplies flex alignment to ordinary tool-call rows, while the shared summary class previously owned typography but not layout.
