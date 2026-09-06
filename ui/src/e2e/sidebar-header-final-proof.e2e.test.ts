import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { expect, it } from "vitest";
import { CONTROL_UI_BOOTSTRAP_CONFIG_PATH } from "../../../src/gateway/control-ui-bootstrap-contract.js";
import {
  createControlUiMockBootstrapConfig,
  installMockGateway,
} from "../test-helpers/control-ui-e2e.ts";
import { createControlUiE2eSuite } from "./control-ui-e2e-suite.test-support.ts";
import { installNativeWebChrome } from "./native-nav.test-support.ts";

const suite = createControlUiE2eSuite({
  name: "Sidebar header final-head PR proof",
  startServerBeforeBrowser: true,
  unavailableMessage: (executablePath) => `Playwright Chromium unavailable at ${executablePath}`,
});

const proofRoot = process.env.OPENCLAW_UI_RAIL_PROOF_DIR?.trim();

type ProofState = {
  environment?: { color: "amber"; label: string };
  fileName: string;
  guides?: boolean;
  hover?: "collapse" | "new-session" | "search";
  menuOpen?: boolean;
  name: string;
  nativeWebChrome?: boolean;
  theme: "dark" | "light";
  unread?: boolean;
  width?: 240 | 258;
};

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((mode) => {
    const root = document.documentElement;
    root.dataset.themeMode = mode;
    root.dataset.themeResolved = mode;
    root.classList.toggle("wa-light", mode === "light");
    root.classList.toggle("wa-dark", mode === "dark");
    root.style.colorScheme = mode;
  }, theme);
  await expect.poll(() => page.locator("html").getAttribute("data-theme-mode")).toBe(theme);
}

async function installGuides(page: Page) {
  const [avatarBox, textBox, navBox] = await Promise.all([
    page.locator(".sidebar-agent-card__avatar").boundingBox(),
    page.locator(".sidebar-agent-card__text").boundingBox(),
    page.locator(".shell-nav").boundingBox(),
  ]);
  if (!avatarBox || !textBox || !navBox) {
    throw new Error("sidebar guide anchors unavailable");
  }
  await page.evaluate(
    ({ avatarLeft, avatarRight, navLeft, navTop, textLeft }) => {
      if (document.querySelector("[data-proof-guides]")) {
        return;
      }
      const overlay = document.createElement("div");
      overlay.dataset.proofGuides = "true";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
      for (const x of [navLeft + 10, avatarLeft, avatarRight, textLeft]) {
        const line = document.createElement("i");
        line.style.cssText = `position:absolute;left:${Math.round(x)}px;top:0;bottom:0;width:1px;background:#ef476f`;
        overlay.append(line);
      }
      const topLine = document.createElement("i");
      topLine.style.cssText = `position:absolute;left:0;right:0;top:${Math.round(navTop + 10)}px;height:1px;background:#ef476f`;
      overlay.append(topLine);
      document.body.append(overlay);
    },
    {
      avatarLeft: avatarBox.x,
      avatarRight: avatarBox.x + avatarBox.width,
      navLeft: navBox.x,
      navTop: navBox.y,
      textLeft: textBox.x,
    },
  );
}

async function openProofState(state: ProofState) {
  const context = await suite.browser.newContext({
    colorScheme: state.theme,
    locale: "en-US",
    serviceWorkers: "block",
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  if (state.nativeWebChrome) {
    await installNativeWebChrome(page);
    await page.addInitScript(() => {
      const install = () => {
        const style = document.createElement("style");
        style.textContent = `
          html.openclaw-native-macos { --openclaw-native-titlebar-height: 52px; }
          @media (min-width: 700px) {
            html.openclaw-native-macos .sidebar-shell {
              padding-top: max(14px, var(--openclaw-native-titlebar-height)) !important;
            }
          }
        `;
        document.head.append(style);
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, { once: true });
      } else {
        install();
      }
    });
  }
  const scenario = { assistantName: state.name };
  await installMockGateway(page, scenario);
  await page.route(`**${CONTROL_UI_BOOTSTRAP_CONFIG_PATH}`, (route) =>
    route.fulfill({
      json: {
        ...createControlUiMockBootstrapConfig(scenario),
        ...(state.environment ? { environment: state.environment, seamColor: "#f59e0b" } : {}),
      },
    }),
  );
  await page.goto(`${suite.server.baseUrl}chat`);
  const sidebar = page.locator("openclaw-app-sidebar");
  const card = sidebar.locator("openclaw-sidebar-agent-card");
  await card.waitFor();
  await expect
    .poll(() => card.locator(".sidebar-agent-card__name-text").textContent())
    .toBe(state.name);
  await setTheme(page, state.theme);

  if (state.width === 240) {
    const resizer = page.getByRole("separator", { name: "Resize sidebar" });
    await resizer.focus();
    await page.keyboard.press("Home");
    await expect
      .poll(async () => Math.round((await page.locator(".shell-nav").boundingBox())?.width ?? 0))
      .toBe(240);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  }

  if (state.environment) {
    const pill = card.locator(".control-ui-environment-pill");
    await pill.waitFor();
    await expect
      .poll(() =>
        page
          .locator("html")
          .evaluate((root) => root.style.getPropertyValue("--control-ui-environment-color")),
      )
      .toBe("var(--control-ui-environment-amber)");
    const presentation = await pill.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color };
    });
    expect(presentation.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(presentation.backgroundColor).not.toBe("transparent");
    await expect
      .poll(() => card.locator(".sidebar-agent-card__avatar--environment").count())
      .toBe(1);
  }

  if (state.unread) {
    await card.evaluate(async (element) => {
      const target = element as HTMLElement & {
        menuUnread: boolean;
        switcherAvailable: boolean;
        updateComplete: Promise<boolean>;
      };
      target.menuUnread = true;
      target.switcherAvailable = true;
      await target.updateComplete;
    });
    await card.locator(".sidebar-agent-card__menu-unread").waitFor();
  }

  if (state.menuOpen) {
    await card.locator(".sidebar-agent-card__main").click();
    await sidebar
      .locator('wa-dropdown.sidebar-agent-menu wa-dropdown-item[value="command:capabilities"]')
      .waitFor();
  }

  const hoverSelector = {
    collapse: ".sidebar-brand__collapse",
    "new-session": ".sidebar-brand__new-thread",
    search: ".sidebar-brand__search",
  } as const;
  if (state.hover) {
    await sidebar.locator(hoverSelector[state.hover]).hover();
  }
  if (state.guides) {
    await installGuides(page);
  }
  return { context, page };
}

suite.define(() => {
  it("captures the final-head sidebar header states", async () => {
    if (!proofRoot) {
      throw new Error("OPENCLAW_UI_RAIL_PROOF_DIR is required");
    }
    const output = path.join(proofRoot, "sidebar-header-final-head");
    await mkdir(output, { recursive: true });
    const longName = "Molty, assistant for production incident response";
    const states: ProofState[] = [
      {
        fileName: "01-light-short-unread-collapse-hover.png",
        hover: "collapse",
        name: "Molty",
        theme: "light",
        unread: true,
      },
      {
        environment: { color: "amber", label: "Development" },
        fileName: "02-light-long-environment-search-hover.png",
        hover: "search",
        name: longName,
        theme: "light",
      },
      {
        environment: { color: "amber", label: "Development" },
        fileName: "03-dark-long-environment-unread-new-session-hover.png",
        hover: "new-session",
        name: longName,
        theme: "dark",
        unread: true,
      },
      { fileName: "04-dark-short-menu-open.png", menuOpen: true, name: "Molty", theme: "dark" },
      {
        environment: { color: "amber", label: "Production — South America" },
        fileName: "05-light-240-environment-unread.png",
        name: longName,
        theme: "light",
        unread: true,
        width: 240,
      },
      {
        environment: { color: "amber", label: "Production — South America" },
        fileName: "06-dark-240-environment-unread.png",
        name: longName,
        theme: "dark",
        unread: true,
        width: 240,
      },
      {
        environment: { color: "amber", label: "Development" },
        fileName: "07-light-browser-comfortable.png",
        name: "Molty",
        theme: "light",
      },
      {
        fileName: "08-dark-native-host-plus-right.png",
        name: "Assistant",
        nativeWebChrome: true,
        theme: "dark",
      },
      {
        environment: { color: "amber", label: "Development" },
        fileName: "09-light-layout-guides.png",
        guides: true,
        name: "Molty",
        theme: "light",
      },
    ];

    for (const state of states) {
      const { context, page } = await openProofState(state);
      try {
        if (state.width === 240) {
          await page.screenshot({
            animations: "disabled",
            clip: { height: 190, width: 240, x: 0, y: 0 },
            path: path.join(output, state.fileName),
          });
        } else if (state.nativeWebChrome) {
          await page.screenshot({
            animations: "disabled",
            clip: { height: 300, width: 520, x: 0, y: 0 },
            path: path.join(output, state.fileName),
          });
        } else {
          await page.screenshot({
            animations: "disabled",
            path: path.join(output, state.fileName),
          });
        }
      } finally {
        await context.close();
      }
    }
  });
});
