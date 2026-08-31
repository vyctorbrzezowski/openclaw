import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { expect, it } from "vitest";
import type { SecretStoreEntry } from "../../../packages/gateway-protocol/src/index.js";
import {
  waitForControlUiGatewayReady,
  waitForControlUiTerminalReady,
} from "../test-helpers/control-ui-e2e-readiness.ts";
import { installMockGateway } from "../test-helpers/control-ui-e2e.ts";
import { createControlUiE2eSuite } from "./control-ui-e2e-suite.test-support.ts";

const suite = createControlUiE2eSuite({
  name: "Control UI menu contract mocked Gateway E2E",
  startServerBeforeBrowser: true,
});
const artifactDir = path.resolve(".artifacts/control-ui-e2e/menu-contracts/after");

const secretEntry: SecretStoreEntry = {
  name: "SERVICE_API_KEY",
  kind: "secret",
  scopeKind: "team",
  scopeId: "",
  createdAtMs: 1_786_352_400_000,
  updatedAtMs: 1_786_352_400_000,
  updatedBy: "E2E Operator",
  allowedHosts: ["api.example.test"],
};

async function capture(page: Page, name: string) {
  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    path: path.join(artifactDir, name),
  });
}

suite.define(() => {
  it.each(["light", "dark"] as const)(
    "keeps Secrets and Terminal menus usable in %s mode",
    async (theme) => {
      const context = await suite.newBrowserContext({
        colorScheme: theme,
        locale: "en-US",
        serviceWorkers: "block",
        viewport: { height: 900, width: 1440 },
      });
      const page = await context.newPage();
      await installMockGateway(page, {
        featureMethods: [
          "secrets.store.list",
          "secrets.store.set",
          "secrets.store.delete",
          "terminal.open",
        ],
        methodResponses: {
          "secrets.store.list": { entries: [secretEntry] },
          "terminal.list": {
            sessions: [
              {
                sessionId: "terminal-detached",
                agentId: "main",
                cwd: "/workspace/openclaw",
                shell: "/bin/sh",
                owner: "connection:secondary",
                attached: false,
                createdAtMs: 1_786_352_400_000,
              },
            ],
          },
          "terminal.open": {
            sessionId: "terminal-current",
            agentId: "main",
            cwd: "/workspace/openclaw",
            shell: "/bin/sh",
            confined: false,
          },
        },
        terminalEnabled: true,
      });

      try {
        await page.goto(`${suite.server.baseUrl}settings/secrets`);
        const secretRow = page.getByRole("row", { name: /SERVICE_API_KEY/u });
        await secretRow.getByRole("button", { name: "Actions: SERVICE_API_KEY" }).click();
        const secretsDropdown = secretRow.locator("wa-dropdown.secrets-store__menu");
        const secretsMenu = secretsDropdown.locator('[part="menu"]');
        await secretsMenu.waitFor({ state: "visible" });
        await capture(page, `secrets-menu-${theme}.png`);
        await page.mouse.click(20, 200);
        await expect
          .poll(() =>
            secretsDropdown.evaluate(
              (element) => (element as HTMLElement & { open: boolean }).open,
            ),
          )
          .toBe(false);

        await page.goto(`${suite.server.baseUrl}activity`);
        await waitForControlUiGatewayReady(page);
        await waitForControlUiTerminalReady(page);
        await page.keyboard.press("Control+Backquote");
        const terminalPanel = page.locator("openclaw-terminal-panel");
        const terminalTrigger = terminalPanel.getByRole("button", { name: "Terminal sessions" });
        await terminalTrigger.waitFor({ state: "visible" });
        await terminalTrigger.click();
        const terminalMenu = terminalPanel.getByRole("dialog", { name: "Terminal sessions" });
        await terminalMenu.waitFor({ state: "visible" });
        await terminalMenu.getByText("/workspace/openclaw", { exact: true }).waitFor();
        await capture(page, `terminal-menu-${theme}.png`);
        await page.keyboard.press("Escape");
        await expect.poll(() => terminalMenu.count()).toBe(0);
      } finally {
        await suite.closeBrowserContext(context);
      }
    },
  );

  it.each(["light", "dark"] as const)(
    "keeps confirmation and queue menus usable in %s mode",
    async (theme) => {
      const context = await suite.newBrowserContext({
        colorScheme: theme,
        locale: "en-US",
        serviceWorkers: "block",
        viewport: { height: 900, width: 1280 },
      });
      const page = await context.newPage();
      const gateway = await installMockGateway(page, {
        featureMethods: ["sessions.rewind"],
        historyMessages: [
          {
            role: "user",
            content: "Menu contract confirmation.",
            timestamp: Date.now(),
            __openclaw: { id: "menu-contract-user", seq: 1 },
          },
        ],
      });

      try {
        await page.goto(`${suite.server.baseUrl}chat`);
        const bubble = page.locator(".chat-group.user .chat-bubble", {
          hasText: "Menu contract confirmation.",
        });
        await bubble.waitFor({ state: "visible" });
        await bubble.click({ button: "right" });
        await page.getByRole("menuitem", { name: "Rewind to here", exact: true }).click();
        const confirmation = page.locator(".chat-confirm-popover");
        await confirmation.waitFor({ state: "visible" });
        await capture(page, `confirmation-menu-${theme}.png`);
        await page.keyboard.press("Escape");
        await expect.poll(() => confirmation.count()).toBe(0);

        await gateway.setOnline(false);
        await gateway.closeLatest();
        const composer = page.locator(".agent-chat__composer-combobox textarea");
        await composer.fill("Queued menu contract message");
        await composer.press("Enter");
        const queueRow = page.locator(".chat-queue__item", {
          hasText: "Queued menu contract message",
        });
        await queueRow.waitFor({ state: "visible" });
        await queueRow.locator(".chat-queue__more").click();
        const queueMenu = queueRow.locator(".chat-queue__overflow");
        await expect
          .poll(() =>
            queueMenu.evaluate((element) => (element as HTMLElement & { open: boolean }).open),
          )
          .toBe(true);
        await capture(page, `queue-menu-${theme}.png`);
      } finally {
        await suite.closeBrowserContext(context);
      }
    },
  );

  it("honors coarse-pointer sizing and reduced motion", async () => {
    const context = await suite.newBrowserContext({
      colorScheme: "dark",
      hasTouch: true,
      locale: "en-US",
      reducedMotion: "reduce",
      serviceWorkers: "block",
      viewport: { height: 844, width: 390 },
    });
    const page = await context.newPage();

    try {
      await page.goto(`${suite.server.baseUrl}chat`);
      const result = await page.evaluate(async () => {
        const dropdown = document.createElement("wa-dropdown") as HTMLElement & {
          open: boolean;
          updateComplete: Promise<unknown>;
        };
        const trigger = document.createElement("button");
        trigger.slot = "trigger";
        trigger.textContent = "Open";
        const item = document.createElement("wa-dropdown-item") as HTMLElement & {
          updateComplete: Promise<unknown>;
        };
        item.textContent = "Action";
        dropdown.append(trigger, item);
        document.body.append(dropdown);
        dropdown.open = true;
        await Promise.all([dropdown.updateComplete, item.updateComplete]);
        const menu = dropdown.shadowRoot?.querySelector<HTMLElement>('[part="menu"]');
        if (!menu) {
          throw new Error("Menu part is missing");
        }
        return {
          animationDuration: getComputedStyle(menu).animationDuration,
          itemHeight: getComputedStyle(item).minHeight,
        };
      });
      expect(Number.parseFloat(result.animationDuration)).toBeLessThanOrEqual(0.000_01);
      expect(result.itemHeight).toBe("44px");
    } finally {
      await suite.closeBrowserContext(context);
    }
  });
});
