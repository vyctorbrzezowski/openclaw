// Control UI tests cover the text-selection boundary of alert surfaces.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readStyleSheet } from "../../../test/helpers/ui-style-fixtures.js";
import {
  canRunPlaywrightChromium,
  resolvePlaywrightChromiumExecutablePath,
} from "../test-helpers/control-ui-e2e.ts";

const chromiumExecutablePath = resolvePlaywrightChromiumExecutablePath(chromium.executablePath());
const describeAlertSelection = canRunPlaywrightChromium(chromiumExecutablePath)
  ? describe
  : describe.skip;

function readAlertCss(): string {
  return ["ui/src/styles/base.css", "ui/src/styles/components.css"]
    .map((file) => readStyleSheet(file))
    .join("\n");
}

function fixtureDocument(css: string): string {
  return `<!doctype html><html data-theme-mode="light"><head><style>${css}</style></head><body>
    <div class="app-toast-stack">
      <div class="app-toast">
        <span class="app-toast__message">Copy this toast outcome</span>
        <button class="app-toast__action" type="button">Undo</button>
        <button class="app-toast__dismiss" type="button">Dismiss</button>
      </div>
    </div>
    <div class="callout callout--warn">
      <span class="callout__content">Copy this callout explanation</span>
      <button class="btn" type="button">Retry</button>
      <button class="callout__dismiss" type="button">Dismiss</button>
    </div>
  </body></html>`;
}

let fixtureDirectory: string;
let fixtureFile: string;
let browser: Browser;

beforeAll(async () => {
  if (!canRunPlaywrightChromium(chromiumExecutablePath)) {
    return;
  }
  fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "alert-selection-"));
  fixtureFile = path.join(fixtureDirectory, "fixture.html");
  fs.writeFileSync(fixtureFile, fixtureDocument(readAlertCss()), "utf8");
  browser = await chromium.launch({ executablePath: chromiumExecutablePath, headless: true });
});

afterAll(async () => {
  await browser?.close().catch(() => {});
  if (fixtureDirectory) {
    fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});

describeAlertSelection("Control UI alert text selection", () => {
  it("selects alert copy while keeping controls click-only", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`file://${fixtureFile}`);
      const result = await page.evaluate(() => {
        const toastMessage = document.querySelector<HTMLElement>(".app-toast__message");
        const callout = document.querySelector<HTMLElement>(".callout__content");
        if (!toastMessage || !callout) {
          throw new Error("Missing alert copy fixture");
        }
        const range = document.createRange();
        range.selectNodeContents(callout);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return {
          calloutSelection: selection?.toString(),
          calloutUserSelect: getComputedStyle(callout).userSelect,
          toastUserSelect: getComputedStyle(toastMessage).userSelect,
          controls: [
            ".app-toast__action",
            ".app-toast__dismiss",
            ".callout .btn",
            ".callout__dismiss",
          ].map((selector) => getComputedStyle(document.querySelector(selector)!).userSelect),
        };
      });

      expect(result.calloutSelection).toBe("Copy this callout explanation");
      expect(result.calloutUserSelect).toBe("text");
      expect(result.toastUserSelect).toBe("text");
      expect(result.controls).toEqual(["none", "none", "none", "none"]);
    } finally {
      await page.close().catch(() => {});
    }
  });
});
