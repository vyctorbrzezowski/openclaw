# Accent First Swatch Worklog

- Reproduced in the mocked Control UI Gateway flow: with Coral inherited from `ui.prefs.accent`, clicking the first accent circle sent a reset and Coral remained selected.
- Root cause: `ui/src/pages/config/view-appearance.ts` rendered Theme default as the first color swatch while its click value was `undefined`; `ui/src/pages/config/config-page.ts` correctly interpreted that sentinel as a preference reset, exposing the inherited Gateway accent.
- Fixed the presentation owner by keeping concrete colors in the swatch sequence and moving Theme default to a distinct reset action after the custom-color picker.
- Removed obsolete theme-preview selectors and the custom picker's positional dependency on the former second preset.
- Added `ui/src/e2e/appearance-accent-selection.e2e.test.ts` to verify first-position identity, `config.patch`, browser persistence, and selected render state.
- Verified component, appearance E2E, responsive layout, changed gates, and autoreview. Captured and inspected before/after screenshots.
- Issue: https://github.com/openclaw/openclaw/issues/135237
- Draft PR: https://github.com/openclaw/openclaw/pull/135238
- Commit: `3e8fbf233e0512e9be06cb3d7d697df5c2970f63`
