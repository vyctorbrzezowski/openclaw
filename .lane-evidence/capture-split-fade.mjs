import fs from "node:fs";
import { chromium } from "playwright";

const css = [
  "ui/src/styles/base.css",
  "ui/src/styles/layout.css",
  "ui/src/styles/chat/layout.css",
  "ui/src/styles/chat/sidebar.css",
  "ui/src/styles/chat/split-view.css",
]
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

const markup = (before) => `<!doctype html>
<html data-theme-mode="light">
  <head>
    <style>
      ${css}
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      *, *::before, *::after { animation: none !important; transition: none !important; }
      body { background: var(--panel); }
      .chat-split-view { height: 100%; }
      .chat-split-view__column { flex: 1; }
      .chat-split-view__cell { background: var(--panel); }
      .chat-pane__header { background: var(--panel); }
      .chat-main__conversation { flex: 1; }
      .chat-main__conversation::before {
        content: "";
        display: block;
        position: absolute;
        z-index: 2;
        inset: 0 18px auto;
        height: 48px;
      }
      .chat-thread { position: absolute; inset: 0; padding: 0 32px; overflow: hidden; }
      .chat-thread p { margin: 0 0 7px; color: var(--muted); font: 24px/1.5 system-ui; }
      ${
        before
          ? ".chat-main__conversation::before { background: linear-gradient(to bottom, var(--bg-content), transparent) !important; }"
          : ""
      }
    </style>
  </head>
  <body>
    <div class="chat-split-view">
      <div class="chat-split-view__column">
        <div class="chat-split-view__cell chat-split-view__cell--active">
          <header class="chat-pane__header">Board chat</header>
          <div class="chat-main__conversation">
            <div class="chat-thread">
              <p>pinned-only headless dashboard updates.</p>
              <p>Messages continue beneath the header fade.</p>
              <p>The split pane keeps one continuous surface.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

for (const state of ["after", "before"]) {
  const browser = await chromium.launch({
    executablePath:
      "/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1234/chrome-linux/headless_shell",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 920, height: 260 }, deviceScaleFactor: 2 });
  await page.setContent(markup(state === "before"));
  await page.locator(".chat-main__conversation").waitFor();
  await page.screenshot({ path: `.lane-evidence/split-fade-${state}-final-proof.png` });
  await page.close();
  await browser.close();
}
