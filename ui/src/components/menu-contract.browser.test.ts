import { afterEach, describe, expect, it } from "vitest";
import "../styles.css";
import "../styles/board.css";
import "../styles/chat.css";
import "../styles/chat/composer-queue.css";
import "../styles/cron.css";
import "../styles/usage.css";
import "./web-awesome.ts";

const hasBrowserLayout = !navigator.userAgent.toLowerCase().includes("jsdom");

type DropdownElement = HTMLElement & {
  open: boolean;
  updateComplete: Promise<unknown>;
};

afterEach(() => {
  document.body.replaceChildren();
});

async function mountDropdown(className: string, itemClassName?: string) {
  const dropdown = document.createElement("wa-dropdown") as DropdownElement;
  dropdown.className = className;
  const trigger = document.createElement("button");
  trigger.slot = "trigger";
  trigger.textContent = "Open";
  const item = document.createElement("wa-dropdown-item") as HTMLElement & {
    updateComplete: Promise<unknown>;
  };
  item.className = itemClassName ?? "";
  item.textContent = "Action";
  dropdown.append(trigger, item);
  document.body.append(dropdown);
  dropdown.open = true;
  await Promise.all([dropdown.updateComplete, item.updateComplete]);
  const menu = dropdown.shadowRoot?.querySelector<HTMLElement>('[part="menu"]');
  expect(menu).not.toBeNull();
  return { dropdown, item, menu: menu! };
}

function px(value: string): number {
  return Number.parseFloat(value);
}

describe.skipIf(!hasBrowserLayout)("menu design contract", () => {
  it("keeps standard menus on one panel, row, and state contract", async () => {
    const surfaces = [
      await mountDropdown("sidebar-customize-menu", "sidebar-customize-menu__item"),
      await mountDropdown("usage-filter-select", "usage-filter-option"),
      await mountDropdown("cron-job-menu", "cron-job-menu__item"),
      await mountDropdown("board-widget__menu"),
      await mountDropdown("chat-pane__gateway-menu", "chat-pane__gateway-menu-item"),
      await mountDropdown("chat-queue__overflow"),
    ];
    const root = getComputedStyle(document.documentElement);
    const canonicalSurface = surfaces[0]!;
    const canonicalMenu = getComputedStyle(canonicalSurface.menu);
    const canonicalItem = getComputedStyle(canonicalSurface.item);
    const canonicalMotion = {
      duration: canonicalMenu.animationDuration,
      name: canonicalMenu.animationName,
    };

    for (const { item, menu } of surfaces) {
      const itemStyle = getComputedStyle(item);
      const menuStyle = getComputedStyle(menu);
      expect(menuStyle.borderRadius).toBe(canonicalMenu.borderRadius);
      expect(menuStyle.borderColor).toBe(canonicalMenu.borderColor);
      expect(menuStyle.backgroundColor).toBe(canonicalMenu.backgroundColor);
      expect(menuStyle.boxShadow).toBe(canonicalMenu.boxShadow);
      expect({ duration: menuStyle.animationDuration, name: menuStyle.animationName }).toEqual(
        canonicalMotion,
      );
      expect(itemStyle.borderRadius).toBe(canonicalItem.borderRadius);
      expect(px(itemStyle.minHeight)).toBe(px(canonicalItem.minHeight));
      item.setAttribute("disabled", "");
      expect(getComputedStyle(item).opacity).toBe(
        root.getPropertyValue("--menu-disabled-opacity").trim(),
      );
    }

    expect(px(getComputedStyle(surfaces.at(-1)!.menu).width)).toBe(132);
  });

  it("uses the touch row height for coarse pointers", async () => {
    const { item } = await mountDropdown("cron-job-menu", "cron-job-menu__item");
    if (matchMedia("(pointer: coarse)").matches) {
      expect(px(getComputedStyle(item).minHeight)).toBe(44);
    } else {
      expect(px(getComputedStyle(item).minHeight)).toBe(28);
    }
  });

  it("keeps the composer menu as the rich-density variant", async () => {
    const { dropdown, item, menu } = await mountDropdown(
      "agent-chat__capability-menu",
      "agent-chat__capability-menu-item",
    );
    dropdown.classList.add("agent-chat__input");
    const style = getComputedStyle(dropdown);
    const radiusScale = px(
      getComputedStyle(document.documentElement).getPropertyValue("--openclaw-corner-radius-scale"),
    );
    expect(px(getComputedStyle(menu).borderRadius)).toBe(14 * radiusScale);
    expect(px(getComputedStyle(item).minHeight)).toBe(
      px(style.getPropertyValue("--chat-composer-menu-row-height")),
    );
  });
});
