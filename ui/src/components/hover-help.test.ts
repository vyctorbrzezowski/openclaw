/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./hover-help.ts";
import "./tooltip.ts";

type HoverHelpElement = HTMLElement & {
  delay: number;
  disabled: boolean;
  openOnClick: boolean;
  readonly updateComplete: Promise<boolean>;
};

function createHoverHelp() {
  const surface = document.createElement("openclaw-hover-help") as HoverHelpElement;
  const trigger = document.createElement("button");
  trigger.textContent = "Details";
  const content = document.createElement("div");
  content.slot = "content";
  content.textContent = "Rich contextual details";
  surface.append(trigger, content);
  document.body.append(surface);
  return { content, surface, trigger };
}

function pointer(target: EventTarget, type: string, pointerType = "mouse") {
  const event = new MouseEvent(type, { bubbles: true, composed: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
}

describe("openclaw-hover-help", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it("uses the rich hover-help timing, card, and accessibility contract", async () => {
    const { content, surface, trigger } = createHoverHelp();
    await surface.updateComplete;

    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-describedby")).toBe(content.id);
    expect(document.getElementById(content.id)?.textContent).toBe(content.textContent);
    const styles = [...(surface.shadowRoot?.querySelectorAll("style") ?? [])]
      .map((style) => style.textContent)
      .join("\n");
    expect(styles).toContain("border-radius: var(--radius-lg)");
    expect(styles).toContain("box-shadow: var(--overlay-shadow)");
    expect(styles).toContain("transition-duration: 160ms");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");

    pointer(trigger, "pointerenter");
    vi.advanceTimersByTime(449);
    expect(surface.hasAttribute("open")).toBe(false);
    vi.advanceTimersByTime(1);
    await surface.updateComplete;
    vi.runOnlyPendingTimers();
    expect(surface.hasAttribute("open")).toBe(true);

    pointer(trigger, "pointerleave");
    vi.advanceTimersByTime(119);
    expect(surface.hasAttribute("open")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(surface.hasAttribute("open")).toBe(false);
  });

  it("pins click help until Escape and restores focus", async () => {
    const { surface, trigger } = createHoverHelp();
    surface.openOnClick = true;
    await surface.updateComplete;

    pointer(trigger, "pointerdown", "touch");
    trigger.click();
    await surface.updateComplete;
    vi.runOnlyPendingTimers();
    expect(surface.hasAttribute("open")).toBe(true);

    trigger.blur();
    const escape = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(surface.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("ignores coarse-pointer hover and stays closed while disabled", async () => {
    const { surface, trigger } = createHoverHelp();
    await surface.updateComplete;

    pointer(trigger, "pointerenter", "touch");
    vi.advanceTimersByTime(450);
    expect(surface.hasAttribute("open")).toBe(false);

    surface.disabled = true;
    await surface.updateComplete;
    pointer(trigger, "pointerenter");
    vi.advanceTimersByTime(450);
    expect(surface.hasAttribute("open")).toBe(false);
  });

  it("yields to a textual tooltip", async () => {
    const { surface, trigger } = createHoverHelp();
    surface.openOnClick = true;
    const tooltip = document.createElement("openclaw-tooltip") as HTMLElement & {
      content: string;
      readonly updateComplete: Promise<boolean>;
    };
    tooltip.content = "Text hint";
    const textTrigger = document.createElement("button");
    tooltip.append(textTrigger);
    document.body.append(tooltip);
    await Promise.all([surface.updateComplete, tooltip.updateComplete]);

    trigger.click();
    await surface.updateComplete;
    vi.runOnlyPendingTimers();
    expect(surface.hasAttribute("open")).toBe(true);

    textTrigger.dispatchEvent(new FocusEvent("focusin", { bubbles: true, composed: true }));
    await tooltip.updateComplete;
    expect(surface.hasAttribute("open")).toBe(false);
    expect(tooltip.shadowRoot?.querySelector("wa-tooltip")?.hasAttribute("open")).toBe(true);
  });

  it("closes after focus returns from content to the trigger and then leaves", async () => {
    const { content, surface, trigger } = createHoverHelp();
    const contentButton = document.createElement("button");
    content.append(contentButton);
    const outside = document.createElement("button");
    document.body.append(outside);
    await surface.updateComplete;

    trigger.dispatchEvent(new FocusEvent("focusin", { bubbles: true, composed: true }));
    await surface.updateComplete;
    vi.runOnlyPendingTimers();
    contentButton.dispatchEvent(new FocusEvent("focusin", { bubbles: true, composed: true }));
    contentButton.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: trigger }),
    );
    trigger.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: outside }),
    );
    vi.advanceTimersByTime(120);

    expect(surface.hasAttribute("open")).toBe(false);
  });
});
