import type { Locator, Page } from "playwright";
import { expect, it } from "vitest";
import type { MockGatewayControls } from "../test-helpers/control-ui-e2e.ts";
import {
  createNewSessionPageE2eSuite,
  installMockGateway,
} from "./new-session-page.test-support.ts";

const suite = createNewSessionPageE2eSuite();
const browserContext = {
  locale: "en-US",
  serviceWorkers: "block" as const,
  viewport: { height: 900, width: 1280 },
};

const composer = (page: Page) => page.locator(".new-session-page__message");
const pageChromeFocusOwner = (page: Page) => page.locator("main.content");
const whereTrigger = (page: Page) => page.locator("#new-session-where-trigger");
const wherePopover = (page: Page) =>
  page.locator("wa-popover.new-session-page__where-popover");
const whereLocalButton = (page: Page) => wherePopover(page).locator('[data-value="gateway"]');
const agentDropdown = (page: Page) =>
  page.locator(".new-session-page__select--agent wa-dropdown");
const agentTrigger = (page: Page) => agentDropdown(page).locator('[slot="trigger"]');
const agentItems = (page: Page) =>
  agentDropdown(page).locator("wa-dropdown-item[data-agent-option]");
const researchAgentItem = (page: Page) => agentItems(page).filter({ hasText: "Research" });
const modelDetails = (page: Page) => page.locator("details.chat-controls__model-picker");
const modelSummary = (page: Page) => modelDetails(page).locator("summary");
const modelSearch = (page: Page) => modelDetails(page).locator('[data-chat-model-search="true"]');
const highlightedModel = (page: Page) =>
  modelDetails(page).locator("[data-chat-model-option][data-chat-model-highlighted]");
const connectModal = (page: Page) =>
  page.locator('openclaw-modal-dialog[label="Connect a machine"]');
const modalDismiss = (page: Page) => connectModal(page).getByRole("button", { name: "Dismiss" });

type KeyObservation = {
  defaultPrevented: boolean;
  key: string;
  reachedWindowBubble: boolean;
};

async function pressObserved(page: Page, key: string): Promise<KeyObservation> {
  await page.evaluate(() => {
    Reflect.set(window, "__newSessionRoutingKeyObservation", null);
    window.addEventListener(
      "keydown",
      (event) => {
        setTimeout(() => {
          if (Reflect.get(window, "__newSessionRoutingKeyObservation") === null) {
            Reflect.set(window, "__newSessionRoutingKeyObservation", {
              defaultPrevented: event.defaultPrevented,
              key: event.key,
              reachedWindowBubble: false,
            });
          }
        }, 0);
      },
      { capture: true, once: true },
    );
    window.addEventListener(
      "keydown",
      (event) => {
        Reflect.set(window, "__newSessionRoutingKeyObservation", {
          defaultPrevented: event.defaultPrevented,
          key: event.key,
          reachedWindowBubble: true,
        });
      },
      { once: true },
    );
  });
  await page.keyboard.press(key);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__newSessionRoutingKeyObservation")))
    .not.toBeNull();
  return page.evaluate(
    () => Reflect.get(window, "__newSessionRoutingKeyObservation") as KeyObservation,
  );
}

async function isFocused(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => element === document.activeElement);
}

async function expectFocused(locator: Locator): Promise<void> {
  await expect.poll(() => isFocused(locator)).toBe(true);
}

function expectUnconsumed(observation: KeyObservation): void {
  expect(observation).toMatchObject({
    defaultPrevented: false,
    reachedWindowBubble: true,
  });
}

async function openNewSessionPage(page: Page): Promise<MockGatewayControls> {
  const gateway = await installMockGateway(page, {
    agentModel: "openai/gpt-5.6-luna",
    defaultAgentId: "main",
    operatorScopes: ["operator.admin", "operator.read", "operator.write"],
    methodResponses: {
      "agents.list": {
        agents: [
          { id: "main", workspace: "/tmp/main" },
          { id: "research", workspace: "/tmp/research" },
        ],
        defaultId: "main",
        mainKey: "main",
        scope: "agent",
      },
      "device.pair.setupCode": {
        access: "node",
        auth: "token",
        expiresAtMs: Date.now() + 600_000,
        gatewayUrl: "wss://gateway.example.com",
        joinUrl: "https://gateway.example.com/j/keyboard-routing",
        setupCode: "KEYBOARD",
        urlSource: "test",
      },
      "sessions.create": { key: "agent:main:keyboard-routing", runStarted: true },
    },
    models: [
      {
        available: true,
        id: "gpt-5.6-luna",
        name: "GPT-5.6 Luna",
        provider: "openai",
        reasoning: true,
      },
      {
        available: true,
        id: "gpt-5.6-sol",
        name: "GPT-5.6 Sol",
        provider: "openai",
        reasoning: true,
      },
    ],
  });
  await page.goto(`${suite.server.baseUrl}new?agent=main`);
  await composer(page).waitFor({ state: "visible" });
  await agentTrigger(page).waitFor({ state: "visible" });
  await modelSummary(page).waitFor({ state: "visible" });
  return gateway;
}

function routingCell(
  id: string,
  title: string,
  run: (page: Page, gateway: MockGatewayControls) => Promise<void>,
): void {
  it(`[${id}] ${title}`, async () => {
    await suite.withPage(browserContext, async ({ page }) => {
      const gateway = await openNewSessionPage(page);
      await run(page, gateway);
    });
  });
}

async function focusNonInteractiveChrome(page: Page): Promise<void> {
  const chrome = page.locator(".agent-chat__welcome-identity");
  await chrome.hover();
  await chrome.click();
  await expect.poll(() => isFocused(composer(page))).toBe(false);
  await expectFocused(pageChromeFocusOwner(page));
}

async function expectChromeFocusStable(page: Page): Promise<void> {
  await expectFocused(pageChromeFocusOwner(page));
}

async function focusComposer(page: Page): Promise<void> {
  await composer(page).hover();
  await composer(page).focus();
  await expectFocused(composer(page));
}

async function openWhereMenu(page: Page): Promise<void> {
  await whereTrigger(page).hover();
  await whereTrigger(page).click();
  await expect.poll(() => wherePopover(page).isVisible()).toBe(true);
  await whereLocalButton(page).waitFor({ state: "visible" });
  await whereLocalButton(page).hover();
  await whereLocalButton(page).focus();
  await expectFocused(whereLocalButton(page));
}

async function expectWhereMenuClosed(page: Page): Promise<void> {
  await expect.poll(() => wherePopover(page).isHidden()).toBe(true);
  await expect.poll(() => whereTrigger(page).getAttribute("aria-expanded")).toBe("false");
}

async function openAgentMenu(page: Page): Promise<void> {
  await agentTrigger(page).hover();
  await agentTrigger(page).click();
  await expect.poll(() => agentDropdown(page).getAttribute("open")).not.toBeNull();
  await agentItems(page).first().waitFor({ state: "visible" });
  await expectFocused(agentItems(page).first());
}

async function expectAgentMenuClosed(page: Page): Promise<void> {
  await expect.poll(() => agentDropdown(page).getAttribute("open")).toBeNull();
  await expectFocused(agentTrigger(page));
}

async function openModelPicker(page: Page, focus: "search" | "summary"): Promise<void> {
  await modelSummary(page).hover();
  await modelSummary(page).click();
  await expect.poll(() => modelDetails(page).getAttribute("open")).not.toBeNull();
  if (focus === "search") {
    await modelSearch(page).waitFor({ state: "visible" });
    await modelSearch(page).hover();
    await modelSearch(page).focus();
    await expectFocused(modelSearch(page));
    await expect.poll(() => highlightedModel(page).count()).toBe(1);
    return;
  }
  await modelSummary(page).hover();
  await modelSummary(page).focus();
  await expectFocused(modelSummary(page));
}

async function openConnectMachineModal(page: Page): Promise<void> {
  await whereTrigger(page).hover();
  await whereTrigger(page).click();
  await expect.poll(() => wherePopover(page).isVisible()).toBe(true);
  const connect = wherePopover(page).getByRole("button", { name: "Connect a machine…" });
  await connect.waitFor({ state: "visible" });
  await connect.hover();
  await connect.click();
  await modalDismiss(page).waitFor({ state: "visible" });
  await modalDismiss(page).hover();
  await modalDismiss(page).focus();
  await expectFocused(modalDismiss(page));
}

suite.define(() => {
  routingCell(
    "NCH-L",
    "routes a letter from non-interactive chrome to the composer",
    async (page) => {
      await focusNonInteractiveChrome(page);
      await page.keyboard.press("x");
      await expect.poll(() => composer(page).inputValue()).toBe("x");
      await expectFocused(composer(page));
    },
  );

  routingCell("NCH-S", "routes Space from non-interactive chrome to the composer", async (page) => {
    await focusNonInteractiveChrome(page);
    await page.keyboard.press("Space");
    await expect.poll(() => composer(page).inputValue()).toBe(" ");
    await expectFocused(composer(page));
  });

  routingCell("NCH-E", "ignores Enter on non-interactive chrome", async (page, gateway) => {
    await focusNonInteractiveChrome(page);
    const route = page.url();
    const requests = (await gateway.getRequests("sessions.create")).length;
    const observation = await pressObserved(page, "Enter");
    expectUnconsumed(observation);
    expect(await composer(page).inputValue()).toBe("");
    expect(page.url()).toBe(route);
    expect(await gateway.getRequests("sessions.create")).toHaveLength(requests);
    await expectChromeFocusStable(page);
  });

  routingCell("NCH-X", "ignores Escape on non-interactive chrome", async (page) => {
    await focusNonInteractiveChrome(page);
    const observation = await pressObserved(page, "Escape");
    expectUnconsumed(observation);
    expect(await composer(page).inputValue()).toBe("");
    await expectChromeFocusStable(page);
  });

  routingCell("NCH-A", "ignores ArrowDown on non-interactive chrome", async (page) => {
    await focusNonInteractiveChrome(page);
    const observation = await pressObserved(page, "ArrowDown");
    expectUnconsumed(observation);
    expect(await composer(page).inputValue()).toBe("");
    await expectChromeFocusStable(page);
  });

  routingCell("NCO-L", "lets the focused textarea consume a letter", async (page) => {
    await focusComposer(page);
    await page.keyboard.press("x");
    await expect.poll(() => composer(page).inputValue()).toBe("x");
    await expectFocused(composer(page));
  });

  routingCell("NCO-S", "lets the focused textarea consume Space", async (page) => {
    await focusComposer(page);
    await page.keyboard.press("Space");
    await expect.poll(() => composer(page).inputValue()).toBe(" ");
    await expectFocused(composer(page));
  });

  routingCell("NCO-E", "applies the composer Enter submission policy", async (page, gateway) => {
    await composer(page).fill("start from keyboard");
    await composer(page).hover();
    await expectFocused(composer(page));
    const before = (await gateway.getRequests("sessions.create")).length;
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await gateway.getRequests("sessions.create")).length)
      .toBe(before + 1);
  });

  routingCell(
    "NCO-X",
    "ignores Escape in the focused textarea without a transient",
    async (page) => {
      await composer(page).fill("stable draft");
      await composer(page).hover();
      const observation = await pressObserved(page, "Escape");
      expectUnconsumed(observation);
      expect(await composer(page).inputValue()).toBe("stable draft");
      await expectFocused(composer(page));
    },
  );

  routingCell("NCO-A", "lets the textarea move its native caret with ArrowDown", async (page) => {
    await composer(page).fill("a\nb");
    await composer(page).evaluate((element) => {
      (element as HTMLTextAreaElement).setSelectionRange(0, 0);
    });
    await composer(page).hover();
    await composer(page).focus();
    const observation = await pressObserved(page, "ArrowDown");
    expectUnconsumed(observation);
    await expect
      .poll(() =>
        composer(page).evaluate((element) => (element as HTMLTextAreaElement).selectionStart),
      )
      .toBeGreaterThan(0);
    await expectFocused(composer(page));
  });

  routingCell(
    "NPH-L",
    "routes a letter while the closed popover trigger is only hovered",
    async (page) => {
      await focusNonInteractiveChrome(page);
      await whereTrigger(page).hover();
      await page.keyboard.press("x");
      await expect.poll(() => composer(page).inputValue()).toBe("x");
      await expectFocused(composer(page));
      expect(await wherePopover(page).isHidden()).toBe(true);
    },
  );

  routingCell(
    "NPH-S",
    "routes Space while the closed popover trigger is only hovered",
    async (page) => {
      await focusNonInteractiveChrome(page);
      await whereTrigger(page).hover();
      await page.keyboard.press("Space");
      await expect.poll(() => composer(page).inputValue()).toBe(" ");
      await expectFocused(composer(page));
      expect(await wherePopover(page).isHidden()).toBe(true);
    },
  );

  routingCell(
    "NPH-E",
    "does not activate a merely hovered popover trigger with Enter",
    async (page) => {
      await focusNonInteractiveChrome(page);
      await whereTrigger(page).hover();
      const observation = await pressObserved(page, "Enter");
      expectUnconsumed(observation);
      expect(await wherePopover(page).isHidden()).toBe(true);
      expect(await composer(page).inputValue()).toBe("");
      await expectChromeFocusStable(page);
    },
  );

  routingCell(
    "NPH-X",
    "ignores Escape while the popover is closed and only hovered",
    async (page) => {
      await focusNonInteractiveChrome(page);
      await whereTrigger(page).hover();
      const observation = await pressObserved(page, "Escape");
      expectUnconsumed(observation);
      expect(await wherePopover(page).isHidden()).toBe(true);
      expect(await composer(page).inputValue()).toBe("");
      await expectChromeFocusStable(page);
    },
  );

  routingCell(
    "NPH-A",
    "ignores ArrowDown while the popover trigger is only hovered",
    async (page) => {
      await focusNonInteractiveChrome(page);
      await whereTrigger(page).hover();
      const observation = await pressObserved(page, "ArrowDown");
      expectUnconsumed(observation);
      expect(await wherePopover(page).isHidden()).toBe(true);
      expect(await composer(page).inputValue()).toBe("");
      await expectChromeFocusStable(page);
    },
  );

  routingCell(
    "NPM-L",
    "routes a menu letter to the composer without closing the popover",
    async (page) => {
      await openWhereMenu(page);
      await page.keyboard.press("x");
      await expect.poll(() => composer(page).inputValue()).toBe("x");
      await expectFocused(composer(page));
      await expect.poll(() => wherePopover(page).isVisible()).toBe(true);
    },
  );

  routingCell("NPM-S", "lets the focused popover button consume Space", async (page) => {
    await openWhereMenu(page);
    await page.keyboard.press("Space");
    await expectWhereMenuClosed(page);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("NPM-E", "lets the focused popover button consume Enter", async (page) => {
    await openWhereMenu(page);
    await page.keyboard.press("Enter");
    await expectWhereMenuClosed(page);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell(
    "NPM-X",
    "lets the open popover consume Escape and restore its trigger",
    async (page) => {
      await openWhereMenu(page);
      await page.keyboard.press("Escape");
      await expectWhereMenuClosed(page);
      await expectFocused(whereTrigger(page));
      expect(await composer(page).inputValue()).toBe("");
    },
  );

  routingCell("NPM-A", "ignores ArrowDown on a focused popover menu button", async (page) => {
    await openWhereMenu(page);
    const observation = await pressObserved(page, "ArrowDown");
    expectUnconsumed(observation);
    await expect.poll(() => wherePopover(page).isVisible()).toBe(true);
    await expectFocused(whereLocalButton(page));
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("WAM-L", "lets matching dropdown typeahead consume a letter", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("r");
    await expectFocused(researchAgentItem(page));
    expect(await agentDropdown(page).getAttribute("open")).not.toBeNull();
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("WAM-S", "lets a freshly focused dropdown item consume Space", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("Space");
    await expectAgentMenuClosed(page);
    expect(await agentTrigger(page).textContent()).toContain("main");
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("WAM-E", "lets a freshly focused dropdown item consume Enter", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("Enter");
    await expectAgentMenuClosed(page);
    expect(await agentTrigger(page).textContent()).toContain("main");
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell(
    "WAM-X",
    "lets the dropdown consume Escape without changing selection",
    async (page) => {
      await openAgentMenu(page);
      await page.keyboard.press("Escape");
      await expectAgentMenuClosed(page);
      expect(await agentTrigger(page).textContent()).toContain("main");
      expect(await composer(page).inputValue()).toBe("");
    },
  );

  routingCell("WAM-A", "lets the dropdown navigate with ArrowDown", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("ArrowDown");
    await expectFocused(researchAgentItem(page));
    expect(await agentDropdown(page).getAttribute("open")).not.toBeNull();
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("WAU-L", "routes an unmatched dropdown letter to the composer", async (page) => {
    await openAgentMenu(page);
    const observation = await pressObserved(page, "x");
    expectUnconsumed(observation);
    await expect.poll(() => composer(page).inputValue()).toBe("x");
    await expectFocused(composer(page));
    await expect.poll(() => agentDropdown(page).getAttribute("open")).toBeNull();
  });

  routingCell("WAU-S", "lets a fresh empty-query dropdown consume Space", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("Space");
    await expectAgentMenuClosed(page);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("WAU-E", "lets a fresh empty-query dropdown consume Enter", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("Enter");
    await expectAgentMenuClosed(page);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("WAU-X", "lets a fresh empty-query dropdown consume Escape", async (page) => {
    await openAgentMenu(page);
    await page.keyboard.press("Escape");
    await expectAgentMenuClosed(page);
    expect(await agentTrigger(page).textContent()).toContain("main");
  });

  routingCell(
    "WAU-A",
    "lets a fresh empty-query dropdown navigate with ArrowDown",
    async (page) => {
      await openAgentMenu(page);
      await page.keyboard.press("ArrowDown");
      await expectFocused(researchAgentItem(page));
      expect(await agentDropdown(page).getAttribute("open")).not.toBeNull();
      expect(await composer(page).inputValue()).toBe("");
    },
  );

  routingCell(
    "DET-L",
    "routes a letter from the model summary while disclosure stays open",
    async (page) => {
      await openModelPicker(page, "summary");
      await page.keyboard.press("x");
      await expect.poll(() => composer(page).inputValue()).toBe("x");
      await expectFocused(composer(page));
      expect(await modelDetails(page).getAttribute("open")).not.toBeNull();
    },
  );

  routingCell("DET-S", "lets the native model summary consume Space", async (page) => {
    await openModelPicker(page, "summary");
    await page.keyboard.press("Space");
    await expect.poll(() => modelDetails(page).getAttribute("open")).toBeNull();
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("DET-E", "lets the native model summary consume Enter", async (page) => {
    await openModelPicker(page, "summary");
    await page.keyboard.press("Enter");
    await expect.poll(() => modelDetails(page).getAttribute("open")).toBeNull();
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("DET-X", "lets the page disclosure handler consume Escape", async (page) => {
    await openModelPicker(page, "summary");
    await page.keyboard.press("Escape");
    await expect.poll(() => modelDetails(page).getAttribute("open")).toBeNull();
    await expectFocused(modelSummary(page));
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("DET-A", "ignores ArrowDown on the native model summary", async (page) => {
    await openModelPicker(page, "summary");
    const observation = await pressObserved(page, "ArrowDown");
    expectUnconsumed(observation);
    expect(await modelDetails(page).getAttribute("open")).not.toBeNull();
    await expectFocused(modelSummary(page));
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("DES-L", "lets the focused model search consume a letter", async (page) => {
    await openModelPicker(page, "search");
    await page.keyboard.press("x");
    await expect.poll(() => modelSearch(page).inputValue()).toBe("x");
    await expectFocused(modelSearch(page));
    expect(await modelDetails(page).getAttribute("open")).not.toBeNull();
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("DES-S", "lets the focused model search consume Space", async (page) => {
    await openModelPicker(page, "search");
    await page.keyboard.press("Space");
    await expect.poll(() => modelSearch(page).inputValue()).toBe(" ");
    await expectFocused(modelSearch(page));
    expect(await modelDetails(page).getAttribute("open")).not.toBeNull();
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell(
    "DES-E",
    "lets the model picker select the highlighted row with Enter",
    async (page) => {
      await openModelPicker(page, "search");
      await modelSearch(page).fill("sol");
      await modelSearch(page).hover();
      await modelSearch(page).focus();
      const selectedValue = await highlightedModel(page).getAttribute("data-chat-model-option");
      expect(selectedValue).toBe("openai/gpt-5.6-sol");
      await page.keyboard.press("Enter");
      await expect.poll(() => modelDetails(page).getAttribute("open")).toBeNull();
      await expect
        .poll(() => modelSummary(page).getAttribute("data-chat-select-value"))
        .toBe(selectedValue);
      await expectFocused(modelSummary(page));
      expect(await composer(page).inputValue()).toBe("");
    },
  );

  routingCell(
    "DES-X",
    "lets Escape clear a nonempty model search without closing",
    async (page) => {
      await openModelPicker(page, "search");
      await modelSearch(page).fill("sol");
      await modelSearch(page).hover();
      await modelSearch(page).focus();
      await page.keyboard.press("Escape");
      await expect.poll(() => modelSearch(page).inputValue()).toBe("");
      expect(await modelDetails(page).getAttribute("open")).not.toBeNull();
      await expectFocused(modelSearch(page));
      expect(await composer(page).inputValue()).toBe("");
    },
  );

  routingCell("DES-A", "lets ArrowDown move the highlighted model row", async (page) => {
    await openModelPicker(page, "search");
    const before = await highlightedModel(page).getAttribute("data-chat-model-option");
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() => highlightedModel(page).getAttribute("data-chat-model-option"))
      .not.toBe(before);
    expect(await modelDetails(page).getAttribute("open")).not.toBeNull();
    await expectFocused(modelSearch(page));
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("MOD-L", "fences but does not consume a letter inside the modal", async (page) => {
    await openConnectMachineModal(page);
    const observation = await pressObserved(page, "x");
    expectUnconsumed(observation);
    await expect.poll(() => modalDismiss(page).isVisible()).toBe(true);
    await expectFocused(modalDismiss(page));
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("MOD-S", "lets the modal Dismiss control consume Space", async (page) => {
    await openConnectMachineModal(page);
    await page.keyboard.press("Space");
    await expect.poll(() => connectModal(page).count()).toBe(0);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("MOD-E", "lets the modal Dismiss control consume Enter", async (page) => {
    await openConnectMachineModal(page);
    await page.keyboard.press("Enter");
    await expect.poll(() => connectModal(page).count()).toBe(0);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("MOD-X", "lets the modal overlay consume Escape", async (page) => {
    await openConnectMachineModal(page);
    await page.keyboard.press("Escape");
    await expect.poll(() => connectModal(page).count()).toBe(0);
    expect(await composer(page).inputValue()).toBe("");
  });

  routingCell("MOD-A", "fences but does not consume ArrowDown inside the modal", async (page) => {
    await openConnectMachineModal(page);
    const observation = await pressObserved(page, "ArrowDown");
    expectUnconsumed(observation);
    await expect.poll(() => modalDismiss(page).isVisible()).toBe(true);
    await expectFocused(modalDismiss(page));
    expect(await composer(page).inputValue()).toBe("");
  });
});
