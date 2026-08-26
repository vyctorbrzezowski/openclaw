/* @vitest-environment jsdom */

import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boardProviderForSession } from "../../lib/board/provider.ts";
import { installBrowserHistoryIsolation } from "../../test-helpers/browser-history.ts";
import { renderBoardSessionSurface, renderBoardViewSwitch } from "./board-session-surface.ts";

const containers: HTMLElement[] = [];

installBrowserHistoryIsolation();

function createContainer() {
  const container = document.createElement("div");
  document.body.append(container);
  containers.push(container);
  return container;
}

afterEach(() => {
  for (const container of containers.splice(0)) {
    container.remove();
  }
});

beforeEach(() => {
  window.history.replaceState({}, "", "/?mockBoard=1");
});

describe("board session shell", () => {
  it("delegates the optional Workboard chip to its lazy element", () => {
    const linked = createContainer();
    const unlinked = createContainer();
    const provider = boardProviderForSession("agent:main:workboard-link");
    const client = {
      request: vi.fn(async () => ({ cards: [] })),
      addEventListener: vi.fn(() => () => {}),
    } as never;
    const props = {
      active: true,
      snapshot: provider.snapshot$.value,
      activeTabId: "main",
      dock: "right" as const,
      dockSize: { height: 300 },
      chat: html`<div>chat</div>`,
      divider: html`<div></div>`,
      canMutate: true,
      canGrant: true,
      callbacks: {
        applyOps: (ops: Parameters<typeof provider.applyOps>[0]) => provider.applyOps(ops),
        grant: (...args: Parameters<typeof provider.grant>) => provider.grant(...args),
        selectTab: () => {},
      },
      widgetFrameUrl: (name: string, revision: number) => provider.widgetFrameUrl(name, revision),
    };

    render(
      renderBoardSessionSurface({
        ...props,
        workboardCardChip: {
          active: true,
          basePath: "",
          client,
          sessionKey: "agent:main:workboard-link",
        },
      }),
      linked,
    );
    render(renderBoardSessionSurface(props), unlinked);

    const chip = linked.querySelector<HTMLElementTagNameMap["openclaw-workboard-card-chip"]>(
      "openclaw-workboard-card-chip",
    );
    expect(chip?.sessionKey).toBe("agent:main:workboard-link");
    expect(chip?.client).toBe(client);
    expect(chip?.active).toBe(true);
    expect(unlinked.querySelector("openclaw-workboard-card-chip")).toBeNull();
  });

  it("renders nothing without a board", () => {
    const container = createContainer();
    render(
      renderBoardViewSwitch({
        hasBoard: false,
        face: "chat",
        dock: "right",
        canChangeDock: true,
        onSelectMode: () => {},
        onDockSideChange: () => {},
      }),
      container,
    );

    expect(container.querySelector(".chat-pane__face-switch")).toBeNull();
    expect(container.querySelector("wa-radio-group")).toBeNull();
    expect(container.querySelector("wa-dropdown")).toBeNull();
  });

  it.each([
    ["chat", "left", ["true", "false"]],
    ["chat", "right", ["true", "false"]],
    ["chat", "bottom", ["true", "false"]],
    ["chat", "hidden", ["true", "false"]],
    ["dashboard", "left", ["true", "true"]],
    ["dashboard", "right", ["true", "true"]],
    ["dashboard", "bottom", ["true", "true"]],
    ["dashboard", "hidden", ["false", "true"]],
  ] as const)("maps %s with a %s dock to the two toggle states", (face, dock, pressed) => {
    const container = createContainer();
    render(
      renderBoardViewSwitch({
        hasBoard: true,
        face,
        dock,
        canChangeDock: true,
        onSelectMode: () => {},
        onDockSideChange: () => {},
      }),
      container,
    );

    const toggles = [...container.querySelectorAll<HTMLButtonElement>("[aria-pressed]")];
    expect(toggles.map((toggle) => toggle.textContent?.trim())).toEqual(["Chat", "Dashboard"]);
    expect(toggles.map((toggle) => toggle.getAttribute("aria-pressed"))).toEqual(pressed);
  });

  it("falls back to the two face options when dock changes are unavailable", () => {
    const container = createContainer();
    render(
      renderBoardViewSwitch({
        hasBoard: true,
        face: "dashboard",
        dock: "right",
        canChangeDock: false,
        onSelectMode: () => {},
        onDockSideChange: () => {},
      }),
      container,
    );

    expect(
      [...container.querySelectorAll<HTMLButtonElement>("[aria-pressed]")].map((toggle) => [
        toggle.textContent?.trim(),
        toggle.getAttribute("aria-pressed"),
      ]),
    ).toEqual([
      ["Chat", "false"],
      ["Dashboard", "true"],
    ]);
    expect(container.querySelector("wa-dropdown")).toBeNull();
  });

  it.each([
    ["chat", "right", true, []],
    ["dashboard", "right", true, ["left", "right", "bottom", "fullscreen"]],
    ["dashboard", "hidden", true, ["fullscreen"]],
    ["dashboard", "right", false, ["fullscreen"]],
  ] as const)(
    "renders the More actions for face=%s dock=%s canChangeDock=%s",
    (face, dock, canChangeDock, expectedItems) => {
      const container = createContainer();
      const onDockSideChange = vi.fn();
      const onFullscreen = vi.fn();
      render(
        renderBoardViewSwitch({
          hasBoard: true,
          face,
          dock,
          canChangeDock,
          fullscreenAction: {
            active: false,
            disabled: false,
            label: "Enter fullscreen",
            onActivate: onFullscreen,
          },
          onSelectMode: () => {},
          onDockSideChange,
        }),
        container,
      );

      const dropdown = container.querySelector("wa-dropdown.chat-pane__board-more");
      expect(dropdown !== null).toBe(expectedItems.length > 0);
      if (!dropdown) {
        return;
      }
      const items = [...dropdown.querySelectorAll("wa-dropdown-item")];
      expect(items.map((item) => item.getAttribute("value"))).toEqual(expectedItems);
      if (expectedItems.includes("right")) {
        expect(items.find((item) => item.hasAttribute("checked"))?.getAttribute("value")).toBe(
          "right",
        );
      }
      const left = dropdown.querySelector('wa-dropdown-item[value="left"]');
      if (left) {
        Reflect.set(left, "value", "left");
        dropdown.dispatchEvent(
          new CustomEvent("wa-select", { bubbles: true, detail: { item: left } }),
        );
        expect(onDockSideChange).toHaveBeenCalledWith("left");
      }
      const fullscreen = dropdown.querySelector('wa-dropdown-item[value="fullscreen"]');
      Reflect.set(fullscreen ?? {}, "value", "fullscreen");
      dropdown.dispatchEvent(
        new CustomEvent("wa-select", { bubbles: true, detail: { item: fullscreen } }),
      );
      expect(onFullscreen).toHaveBeenCalledOnce();
    },
  );

  it("uses the two toggles to enter split and keeps the last active face on", () => {
    const container = createContainer();
    const onSelectMode = vi.fn();
    render(
      renderBoardViewSwitch({
        hasBoard: true,
        face: "chat",
        dock: "right",
        canChangeDock: true,
        onSelectMode,
        onDockSideChange: () => {},
      }),
      container,
    );

    const [chat, dashboard] = container.querySelectorAll<HTMLButtonElement>("[aria-pressed]");
    chat?.click();
    expect(onSelectMode).not.toHaveBeenCalled();
    dashboard?.click();
    expect(onSelectMode).toHaveBeenCalledWith("split");
  });

  it.each([
    ["chat", "dashboard"],
    ["dashboard", "chat"],
  ] as const)("turns off %s from split by selecting %s-only", (toggle, expectedMode) => {
    const container = createContainer();
    const onSelectMode = vi.fn();
    render(
      renderBoardViewSwitch({
        hasBoard: true,
        face: "dashboard",
        dock: "right",
        canChangeDock: true,
        onSelectMode,
        onDockSideChange: () => {},
      }),
      container,
    );

    const button = [...container.querySelectorAll<HTMLButtonElement>("[aria-pressed]")].find(
      (candidate) => candidate.textContent?.trim().toLowerCase() === toggle,
    );
    button?.click();
    expect(onSelectMode).toHaveBeenCalledWith(expectedMode);
  });

  it.each(["left", "right", "bottom"] as const)("lays out the %s dock", (dock) => {
    const container = createContainer();
    const provider = boardProviderForSession("agent:main:main");
    render(
      renderBoardSessionSurface({
        active: true,
        snapshot: provider.snapshot$.value,
        activeTabId: "main",
        dock,
        dockSize: { height: 300 },
        chat: html`<div data-test-chat>chat</div>`,
        divider: html`<div class="board-session-surface__divider" data-test-divider></div>`,
        canMutate: true,
        canGrant: true,
        callbacks: {
          applyOps: (ops) => provider.applyOps(ops),
          grant: (name, decision) => provider.grant(name, decision),
          selectTab: () => {},
        },
        widgetFrameUrl: (name, revision) => provider.widgetFrameUrl(name, revision),
      }),
      container,
    );

    expect(container.querySelector(`.board-session-surface--dock-${dock}`)).not.toBeNull();
    expect(container.querySelector("[data-test-divider]") !== null).toBe(dock === "bottom");
    expect(container.querySelector("[data-test-chat]") !== null).toBe(dock === "bottom");
    expect(container.querySelector("openclaw-board-view")).not.toBeNull();
  });

  it("renders the hidden dock as board-only", () => {
    const container = createContainer();
    const provider = boardProviderForSession("agent:main:main");
    render(
      renderBoardSessionSurface({
        active: true,
        snapshot: provider.snapshot$.value,
        activeTabId: "main",
        dock: "hidden",
        dockSize: { height: 300 },
        chat: html`<div data-test-chat>chat</div>`,
        divider: html`<div class="board-session-surface__divider"></div>`,
        canMutate: true,
        canGrant: true,
        callbacks: {
          applyOps: (ops) => provider.applyOps(ops),
          grant: (name, decision) => provider.grant(name, decision),
          selectTab: () => {},
        },
        widgetFrameUrl: (name, revision) => provider.widgetFrameUrl(name, revision),
      }),
      container,
    );

    expect(container.querySelector("[data-test-chat]")).toBeNull();
    expect(container.querySelector(".board-session-surface--dock-hidden")).not.toBeNull();
    expect(container.querySelector("openclaw-board-view")).not.toBeNull();
  });

  it("preserves the board while the bottom chat mounts only for that dock", () => {
    const container = createContainer();
    const provider = boardProviderForSession("agent:main:main");
    const props = {
      active: true,
      snapshot: provider.snapshot$.value,
      activeTabId: "main",
      dockSize: { height: 300 },
      chat: html`<div data-test-chat>chat</div>`,
      divider: html`<div class="board-session-surface__divider"></div>`,
      canMutate: true,
      canGrant: true,
      callbacks: {
        applyOps: (ops: Parameters<typeof provider.applyOps>[0]) => provider.applyOps(ops),
        grant: (...args: Parameters<typeof provider.grant>) => provider.grant(...args),
        selectTab: () => {},
      },
      widgetFrameUrl: (name: string, revision: number) => provider.widgetFrameUrl(name, revision),
    };

    render(renderBoardSessionSurface({ ...props, dock: "right" }), container);
    const board = container.querySelector("openclaw-board-view");
    expect(container.querySelector("[data-test-chat]")).toBeNull();

    render(renderBoardSessionSurface({ ...props, dock: "left" }), container);
    expect(container.querySelector("openclaw-board-view")).toBe(board);
    expect(container.querySelector("[data-test-chat]")).toBeNull();

    render(renderBoardSessionSurface({ ...props, dock: "bottom" }), container);
    expect(container.querySelector("openclaw-board-view")).toBe(board);
    expect(container.querySelector("[data-test-chat]")).not.toBeNull();

    render(renderBoardSessionSurface({ ...props, dock: "hidden" }), container);
    expect(container.querySelector("openclaw-board-view")).toBe(board);
    expect(container.querySelector("[data-test-chat]")).toBeNull();

    render(renderBoardSessionSurface({ ...props, active: false, dock: "bottom" }), container);
    const hiddenSurface = container.querySelector<HTMLElement>(".board-session-surface");
    expect(hiddenSurface?.hidden).toBe(true);
    expect(hiddenSurface?.hasAttribute("inert")).toBe(true);
    expect(container.querySelector("openclaw-board-view")).toBe(board);
    expect(board?.active).toBe(false);
    expect(container.querySelector("[data-test-chat]")).toBeNull();

    render(renderBoardSessionSurface({ ...props, dock: "right" }), container);
    expect(container.querySelector("openclaw-board-view")).toBe(board);
    expect(container.querySelector<HTMLElement>(".board-session-surface")?.hidden).toBe(false);
    expect(board?.active).toBe(true);
  });
});
