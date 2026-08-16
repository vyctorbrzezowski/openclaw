// Control UI tests cover the collapsed toast stack's shared width and depth order.
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
const describeToastStack = canRunPlaywrightChromium(chromiumExecutablePath)
  ? describe
  : describe.skip;

function readToastCss(): string {
  return ["ui/src/styles/base.css", "ui/src/styles/components.css"]
    .map((file) => readStyleSheet(file))
    .join("\n");
}

function fixtureDocument(css: string): string {
  const cards = [0, 1, 2, 3, 4]
    .map(
      (depth) =>
        `<div class="app-toast" data-depth="${depth}" style="--app-toast-depth: ${depth}">Card ${depth}</div>`,
    )
    .join("");
  return `<!doctype html><html data-theme-mode="light"><head><style>${css}</style></head><body>
    <div class="app-toast-stack">${cards}</div>
  </body></html>`;
}

let fixtureDirectory: string;
let fixtureFile: string;
let browser: Browser;

beforeAll(async () => {
  if (!canRunPlaywrightChromium(chromiumExecutablePath)) {
    return;
  }
  fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "toast-stack-"));
  fixtureFile = path.join(fixtureDirectory, "fixture.html");
  fs.writeFileSync(fixtureFile, fixtureDocument(readToastCss()), "utf8");
  browser = await chromium.launch({ executablePath: chromiumExecutablePath, headless: true });
});

afterAll(async () => {
  await browser?.close().catch(() => {});
  if (fixtureDirectory) {
    fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});

describeToastStack("Control UI collapsed toast stack", () => {
  it("keeps every card on the shared measure and orders z-depth newest first", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`file://${fixtureFile}`);
      const cards = await page.locator(".app-toast").evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return { width: style.width, zIndex: style.zIndex };
        }),
      );

      expect(cards.map((card) => card.width)).toEqual([
        "400px",
        "400px",
        "400px",
        "400px",
        "400px",
      ]);
      expect(cards.map((card) => card.zIndex)).toEqual(["2000", "1999", "1998", "1997", "1996"]);
    } finally {
      await page.close().catch(() => {});
    }
  });
});
