import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Locator } from "playwright";
import { expect, it } from "vitest";
import { waitForControlUiSettingsTakeover } from "../test-helpers/control-ui-e2e.ts";
import {
  controlUiSessionUrl,
  installMockGateway,
  sessionRow,
  sessionsListResponse,
} from "./session-management.test-support.ts";
import { createSidebarCustomizationSuite } from "./sidebar-customization.test-support.ts";

const suite = createSidebarCustomizationSuite(
  "Control UI transient surface tokens mocked Gateway E2E",
);
const captureProof = process.env.OPENCLAW_CAPTURE_UI_PROOF === "1";
const proofDir = path.resolve(".artifacts/control-ui-e2e/transient-surfaces");

const themes = [
  { colorScheme: "light", resolvedTheme: "light", theme: "claw" },
  { colorScheme: "dark", resolvedTheme: "dark", theme: "claw" },
  { colorScheme: "light", resolvedTheme: "openknot-light", theme: "knot" },
  { colorScheme: "dark", resolvedTheme: "openknot", theme: "knot" },
  { colorScheme: "light", resolvedTheme: "dash-light", theme: "dash" },
  { colorScheme: "dark", resolvedTheme: "dash", theme: "dash" },
] as const;

function configResponse(theme: "claw" | "knot" | "dash", colorScheme: "light" | "dark") {
  const config = { ui: { prefs: { locale: "en", theme, themeMode: colorScheme } } };
  const hash = `transient-surfaces-${theme}-${colorScheme}`;
  return {
    appliedConfigHash: hash,
    config,
    configRevisionHash: hash,
    hash,
    issues: [],
    raw: JSON.stringify(config),
    valid: true,
  };
}

async function surfaceTokens(surface: Locator) {
  return surface.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
}

suite.define(() => {
  it("keeps the shared picker operable across dismissal, disabled, and input modes", async () => {
    const context = await suite.newBrowserContext({
      colorScheme: "light",
      hasTouch: true,
      locale: "en-US",
      reducedMotion: "reduce",
      serviceWorkers: "block",
      viewport: { height: 900, width: 1440 },
    });
    const page = await context.newPage();
    await installMockGateway(page);

    try {
      await page.goto(`${suite.server.baseUrl}settings/appearance`);
      await waitForControlUiSettingsTakeover(page);
      const select = page.locator("#settings-language wa-select");
      const combobox = select.getByRole("combobox");
      const listbox = select.locator('[part="listbox"]');

      expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
      await combobox.click();
      await listbox.waitFor({ state: "visible" });
      const contract = await select
        .locator("wa-option")
        .first()
        .evaluate((option) => ({
          height: option.getBoundingClientRect().height,
          hideDuration: getComputedStyle(option.parentElement!).getPropertyValue("--hide-duration"),
          showDuration: getComputedStyle(option.parentElement!).getPropertyValue("--show-duration"),
        }));
      expect(contract.height).toBe(44);
      expect(Number.parseFloat(contract.hideDuration)).toBeCloseTo(0.01);
      expect(Number.parseFloat(contract.showDuration)).toBeCloseTo(0.01);

      await page.keyboard.press("Escape");
      await expect.poll(() => select.getAttribute("open")).toBeNull();
      expect(await combobox.evaluate((element) => element.matches(":focus"))).toBe(true);

      await combobox.click();
      await listbox.waitFor({ state: "visible" });
      await page.locator(".settings-sidebar__title").click({ position: { x: 1, y: 1 } });
      await expect.poll(() => select.getAttribute("open")).toBeNull();

      await select.evaluate((element) => {
        (element as HTMLElement & { disabled: boolean }).disabled = true;
      });
      await combobox.click({ force: true });
      await expect.poll(() => select.getAttribute("open")).toBeNull();
    } finally {
      await suite.closeBrowserContext(context);
    }
  });

  it.each(themes)(
    "uses one transient surface contract in $theme $colorScheme",
    async ({ colorScheme, resolvedTheme, theme }) => {
      const context = await suite.newBrowserContext({
        colorScheme,
        locale: "en-US",
        serviceWorkers: "block",
        viewport: { height: 900, width: 1440 },
      });
      const page = await context.newPage();
      const sessionKey = "agent:main:release-notes";
      await installMockGateway(page, {
        featureMethods: ["sessions.patch"],
        methodResponses: {
          "config.get": configResponse(theme, colorScheme),
          "sessions.list": sessionsListResponse([
            sessionRow(sessionKey, "Release notes", Date.parse("2026-08-14T15:59:00.000Z")),
          ]),
        },
        sessionKey,
      });

      try {
        await page.goto(controlUiSessionUrl(suite.server.baseUrl, sessionKey));
        const root = page.locator("html");
        await expect.poll(() => root.getAttribute("data-theme")).toBe(resolvedTheme);

        const session = page.locator(`openclaw-app-sidebar [data-session-key="${sessionKey}"]`);
        await session.waitFor();
        await session.hover();
        await session.locator("[data-session-menu]").click();
        const menuSurface = page.getByRole("menu", {
          name: "Actions for Release notes",
          exact: true,
        });
        await menuSurface.waitFor({ state: "visible" });
        const menuTokens = await surfaceTokens(menuSurface);
        if (captureProof && theme === "claw") {
          await mkdir(proofDir, { recursive: true });
          await page.screenshot({
            animations: "disabled",
            fullPage: true,
            path: path.join(proofDir, `session-menu-${colorScheme}.png`),
          });
        }

        await page.goto(`${suite.server.baseUrl}settings/appearance`);
        await waitForControlUiSettingsTakeover(page);
        const languageSelect = page.locator("#settings-language wa-select");
        await languageSelect.click();
        const listbox = languageSelect.locator('[part="listbox"]');
        await listbox.waitFor({ state: "visible" });
        if (captureProof && theme === "claw") {
          await page.screenshot({
            animations: "disabled",
            fullPage: true,
            path: path.join(proofDir, `settings-listbox-${colorScheme}.png`),
          });
        }

        expect(await surfaceTokens(listbox)).toEqual(menuTokens);
      } finally {
        await suite.closeBrowserContext(context);
      }
    },
  );
});
