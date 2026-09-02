# chat-model-gap

## Done

- Read `.lanes/PLAYBOOK.md` in full.
- Read required workflows: `openclaw-pr-maintainer`, `control-ui-e2e`, `autoreview`, `test-audit`, and `agent-browser`.
- Fetched `origin/main` and created this fresh detached worktree at `06c2dc7eb105cd0cc97c84dd9a433ca56901810d`.
- Read scoped `ui/AGENTS.md` and `scripts/AGENTS.md`.
- Maintainer confirmed the previous `.blocked` marker is superseded.

## Decided

- No production or test edits before visual GATE 1.
- Reproduce the current in-chat model-loading gap in the canonical mock harness on `127.0.0.1:6010`.
- Treat PR #130829 as the design/implementation precedent; preserve the `/new` fix and extend the same invariant to chat.
- Keep fixture/proof artifacts out of the commit.

## Next

- Inspect PR #130829, current chat/new-session render paths, siblings, tests, and history.
- Identify the exact producer of the in-chat gap with `file:line` evidence.
- Build and visually inspect the faithful before-state fixture on port 6010.
- Replace the stale marker when the bench is navigable; request explicit GATE 1 before implementation.
