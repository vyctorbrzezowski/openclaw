import type { Locator, Page } from "playwright";
import { expect, it } from "vitest";
import {
  chatSessionListResponse,
  controlUiSessionUrl,
  installMockGateway,
} from "./chat-flow.test-support.ts";
import { createControlUiE2eSuite } from "./control-ui-e2e-suite.test-support.ts";

const suite = createControlUiE2eSuite({
  name: "Control UI Chat keyboard routing",
});

const CONTEXT_MESSAGE = "Keyboard routing context-menu reply.";
const RETAINED_SESSION_A = "agent:main:keyboard-routing-a";
const RETAINED_SESSION_B = "agent:main:keyboard-routing-b";
const RETAINED_MESSAGE_A = "Retained keyboard routing session A.";
const RETAINED_MESSAGE_B = "Presented keyboard routing session B.";

type ContextMenuCase = {
  id: "CTX-L" | "CTX-S" | "CTX-E" | "CTX-X" | "CTX-A";
  key: "x" | "Space" | "Enter" | "Escape" | "ArrowDown";
  outcome: "composer" | "reply" | "dismiss" | "ignored";
};

const contextMenuCases: readonly ContextMenuCase[] = [
  { id: "CTX-L", key: "x", outcome: "composer" },
  { id: "CTX-S", key: "Space", outcome: "reply" },
  { id: "CTX-E", key: "Enter", outcome: "reply" },
  { id: "CTX-X", key: "Escape", outcome: "dismiss" },
  { id: "CTX-A", key: "ArrowDown", outcome: "ignored" },
];

type RetainedPaneCase = {
  id: "RET-L" | "RET-S" | "RET-E" | "RET-X" | "RET-A";
  key: "w" | "Space" | "Enter" | "Escape" | "ArrowDown";
  text?: string;
};

const retainedPaneCases: readonly RetainedPaneCase[] = [
  { id: "RET-L", key: "w", text: "w" },
  { id: "RET-S", key: "Space", text: " " },
  { id: "RET-E", key: "Enter" },
  { id: "RET-X", key: "Escape" },
  { id: "RET-A", key: "ArrowDown" },
];

function activePane(page: Page): Locator {
  return page.locator("openclaw-chat-pane.chat-pane-cache__pane--active:not([inert])");
}

function activeComposer(page: Page): Locator {
  return activePane(page).locator(".agent-chat__composer-combobox > textarea");
}

function contextBubble(page: Page): Locator {
  return activePane(page).locator(".chat-bubble").filter({ hasText: CONTEXT_MESSAGE });
}

function replyContextMenu(page: Page): Locator {
  return page.locator(".chat-reply-context-menu");
}

function replyContextMenuItem(page: Page): Locator {
  return replyContextMenu(page).getByRole("menuitem", { name: "Reply to message" });
}

async function isFocused(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => document.activeElement === element);
}

async function settleContextMenuOwner(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

async function prepareReplyContextMenu(page: Page) {
  const gateway = await installMockGateway(page, {
    historyMessages: [
      {
        role: "assistant",
        content: [{ type: "text", text: CONTEXT_MESSAGE }],
        timestamp: 1,
        __openclaw: { id: "keyboard-routing-context", seq: 1 },
      },
    ],
  });
  await page.goto(`${suite.server.baseUrl}chat`);
  await gateway.waitForRequest("chat.startup");
  await contextBubble(page).waitFor({ state: "visible" });
  await contextBubble(page).hover();
  await contextBubble(page).click({ button: "right" });
  await replyContextMenu(page).waitFor({ state: "visible" });
  await settleContextMenuOwner(page);
  await expect.poll(() => isFocused(replyContextMenuItem(page))).toBe(true);
  expect(await activeComposer(page).inputValue()).toBe("");
  return gateway;
}

function sessionLink(page: Page, sessionKey: string): Locator {
  return page.locator(
    `.sidebar-recent-session[data-session-key="${sessionKey}"] a.sidebar-recent-session__link`,
  );
}

async function retainedPaneSnapshot(page: Page) {
  return page.evaluate(
    ({ sessionA, sessionB }) => {
      type PaneElement = HTMLElement & { sessionKey?: string };
      type DropdownElement = HTMLElement & { open?: boolean };
      const panes = [...document.querySelectorAll<PaneElement>("openclaw-chat-pane")];
      const paneA = panes.find((pane) => pane.sessionKey === sessionA);
      const paneB = panes.find((pane) => pane.sessionKey === sessionB);
      if (!paneA || !paneB) {
        throw new Error(`Expected retained panes for ${sessionA} and ${sessionB}`);
      }
      const composerA = paneA.querySelector<HTMLTextAreaElement>(
        ".agent-chat__composer-combobox > textarea",
      );
      const composerB = paneB.querySelector<HTMLTextAreaElement>(
        ".agent-chat__composer-combobox > textarea",
      );
      const threadB = paneB.querySelector<HTMLElement>(".chat-thread");
      const dropdownA = paneA.querySelector<DropdownElement>(
        ".chat-controls__permission-picker",
      );
      const active = document.activeElement;
      return {
        activeInsideA: active instanceof Node && paneA.contains(active),
        ariaHiddenA: paneA.getAttribute("aria-hidden"),
        composerA: composerA?.value ?? null,
        composerB: composerB?.value ?? null,
        dropdownOpenA: dropdownA?.open === true || dropdownA?.hasAttribute("open") === true,
        dropdownPresentA: dropdownA !== null,
        focusedOwner:
          active === composerB
            ? "presented-composer"
            : active === threadB
              ? "presented-thread"
              : "other",
        inertA: paneA.inert,
        pathname: window.location.pathname,
        presentedB: !paneB.inert && paneB.getAttribute("aria-hidden") === "false",
      };
    },
    { sessionA: RETAINED_SESSION_A, sessionB: RETAINED_SESSION_B },
  );
}

async function prepareRetainedPaneRouting(page: Page, navigate = true) {
  const historyCases = {
    cases: [
      {
        match: { sessionKey: RETAINED_SESSION_A },
        response: {
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: RETAINED_MESSAGE_A }],
              timestamp: 1,
              __openclaw: { id: "keyboard-routing-a", seq: 1 },
            },
          ],
          sessionId: "keyboard-routing-a",
        },
      },
      {
        match: { sessionKey: RETAINED_SESSION_B },
        response: {
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: RETAINED_MESSAGE_B }],
              timestamp: 1,
              __openclaw: { id: "keyboard-routing-b", seq: 1 },
            },
          ],
          sessionId: "keyboard-routing-b",
        },
      },
    ],
  };
  const gateway = await installMockGateway(page, {
    methodResponses: {
      "chat.history": historyCases,
      "chat.startup": historyCases,
      "sessions.list": chatSessionListResponse([
        {
          key: RETAINED_SESSION_A,
          sessionId: "keyboard-routing-a",
          kind: "direct",
          label: "Keyboard routing A",
          permissionMode: "guarded",
          updatedAt: 2,
        },
        {
          key: RETAINED_SESSION_B,
          sessionId: "keyboard-routing-b",
          kind: "direct",
          label: "Keyboard routing B",
          permissionMode: "guarded",
          updatedAt: 1,
        },
      ]),
    },
    sessionKey: RETAINED_SESSION_A,
  });

  await page.goto(controlUiSessionUrl(suite.server.baseUrl, RETAINED_SESSION_A));
  await activePane(page).getByText(RETAINED_MESSAGE_A, { exact: true }).waitFor();
  await sessionLink(page, RETAINED_SESSION_B).waitFor({ state: "visible" });

  const permissionTrigger = () =>
    activePane(page).locator(".chat-controls__permission-trigger");
  const permissionDropdown = () =>
    activePane(page).locator(".chat-controls__permission-picker");
  const firstPermissionOption = () =>
    activePane(page).locator(".chat-controls__permission-option:not([disabled])").first();

  await permissionTrigger().focus();
  await expect.poll(() => isFocused(permissionTrigger())).toBe(true);
  await page.keyboard.press("Enter");
  await firstPermissionOption().waitFor({ state: "visible" });
  await expect
    .poll(() => permissionDropdown().evaluate((dropdown) => dropdown.hasAttribute("open")))
    .toBe(true);
  await expect.poll(() => isFocused(firstPermissionOption())).toBe(true);

  if (!navigate) {
    return gateway;
  }

  await sessionLink(page, RETAINED_SESSION_B).hover();
  await sessionLink(page, RETAINED_SESSION_B).focus();
  await expect.poll(() => isFocused(sessionLink(page, RETAINED_SESSION_B))).toBe(true);
  await page.keyboard.press("Enter");
  await activePane(page).getByText(RETAINED_MESSAGE_B, { exact: true }).waitFor();

  const presentedThread = () => activePane(page).locator(".chat-thread");
  await presentedThread().hover();
  await presentedThread().click({ position: { x: 12, y: 12 } });
  await expect.poll(() => isFocused(presentedThread())).toBe(true);
  await expect.poll(() => retainedPaneSnapshot(page)).toMatchObject({
    activeInsideA: false,
    ariaHiddenA: "true",
    composerA: "",
    composerB: "",
    dropdownOpenA: false,
    dropdownPresentA: true,
    focusedOwner: "presented-thread",
    inertA: true,
    presentedB: true,
  });
  return gateway;
}

suite.define(() => {
  it("[CHAT-WA-S] leaves Space ownership with a focused Chat dropdown item", async () => {
    await suite.withPage(
      {
        locale: "en-US",
        serviceWorkers: "block",
        viewport: { height: 900, width: 1440 },
      },
      async ({ page }) => {
        const gateway = await prepareRetainedPaneRouting(page, false);
        const dropdown = () => activePane(page).locator(".chat-controls__permission-picker");
        const trigger = () => activePane(page).locator(".chat-controls__permission-trigger");

        await page.keyboard.press("Space");

        await expect.poll(() => dropdown().getAttribute("open")).toBeNull();
        await expect.poll(() => isFocused(trigger())).toBe(true);
        expect(await activeComposer(page).inputValue()).toBe("");
        expect(await gateway.getRequests("chat.send")).toHaveLength(0);
      },
    );
  });

  for (const testCase of contextMenuCases) {
    it(`${testCase.id} routes ${testCase.key} from the real reply context menu`, async () => {
      await suite.withPage(
        {
          locale: "en-US",
          serviceWorkers: "block",
          viewport: { height: 900, width: 1440 },
        },
        async ({ page }) => {
          const gateway = await prepareReplyContextMenu(page);
          await page.keyboard.press(testCase.key);

          if (testCase.outcome === "composer") {
            await expect.poll(() => activeComposer(page).inputValue()).toBe("x");
            await expect.poll(() => isFocused(activeComposer(page))).toBe(true);
            await expect.poll(() => replyContextMenu(page).count()).toBe(1);
            expect(await page.locator(".chat-reply-preview").count()).toBe(0);
          } else if (testCase.outcome === "reply") {
            await expect.poll(() => replyContextMenu(page).count()).toBe(0);
            const preview = page.locator(".chat-reply-preview");
            await preview.waitFor({ state: "visible" });
            await expect
              .poll(() => preview.locator(".chat-reply-preview__text").textContent())
              .toBe(CONTEXT_MESSAGE);
            await expect.poll(() => isFocused(activeComposer(page))).toBe(true);
            expect(await activeComposer(page).inputValue()).toBe("");
          } else if (testCase.outcome === "dismiss") {
            await expect.poll(() => replyContextMenu(page).count()).toBe(0);
            await expect.poll(() => isFocused(activeComposer(page))).toBe(true);
            expect(await activeComposer(page).inputValue()).toBe("");
            expect(await page.locator(".chat-reply-preview").count()).toBe(0);
          } else {
            await expect.poll(() => replyContextMenu(page).count()).toBe(1);
            await expect.poll(() => isFocused(replyContextMenuItem(page))).toBe(true);
            expect(await activeComposer(page).inputValue()).toBe("");
            expect(await page.locator(".chat-reply-preview").count()).toBe(0);
          }

          expect(await gateway.getRequests("chat.send")).toHaveLength(0);
        },
      );
    });
  }

  for (const testCase of retainedPaneCases) {
    it(`${testCase.id} routes ${testCase.key} after a real permission dropdown is retained`, async () => {
      await suite.withPage(
        {
          locale: "en-US",
          serviceWorkers: "block",
          viewport: { height: 900, width: 1440 },
        },
        async ({ page }) => {
          const gateway = await prepareRetainedPaneRouting(page);
          const before = await retainedPaneSnapshot(page);
          const patchCount = (await gateway.getRequests("sessions.patch")).length;
          const sendCount = (await gateway.getRequests("chat.send")).length;

          await page.keyboard.press(testCase.key);

          if (testCase.text !== undefined) {
            await expect.poll(() => retainedPaneSnapshot(page)).toMatchObject({
              activeInsideA: false,
              ariaHiddenA: "true",
              composerA: "",
              composerB: testCase.text,
              dropdownOpenA: false,
              dropdownPresentA: true,
              focusedOwner: "presented-composer",
              inertA: true,
              pathname: before.pathname,
              presentedB: true,
            });
          } else {
            await expect.poll(() => retainedPaneSnapshot(page)).toEqual(before);
          }
          expect(await gateway.getRequests("sessions.patch")).toHaveLength(patchCount);
          expect(await gateway.getRequests("chat.send")).toHaveLength(sendCount);
        },
      );
    });
  }
});
