import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRenderedModalDialog } from "../test-helpers/modal-dialog.ts";
import type { OpenClawModalDialog } from "./modal-dialog.ts";
import "./modal-dialog.ts";

const browserMode = "__vitest_browser__" in globalThis;
let container: HTMLDivElement;

beforeEach(() => {
  document.documentElement.style.cssText = `
    --border: rgb(50 50 50);
    --border-strong: rgb(80 80 80);
    --card: rgb(30 30 30);
    --popover: rgb(32 32 32);
    --panel: rgb(28 28 28);
    --text: rgb(240 240 240);
    --radius-lg: 14px;
    --radius-xl: 20px;
    --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.4);
    --shadow-xl: 0 24px 48px rgb(0 0 0 / 0.5);
  `;
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(() => {
  container.remove();
  document.documentElement.removeAttribute("style");
});

async function mountModal(
  host = container,
  variant: OpenClawModalDialog["variant"] = "standard",
  autofocus = true,
) {
  const modal = document.createElement("openclaw-modal-dialog");
  modal.label = "Edit details";
  modal.variant = variant;
  modal.style.setProperty("--wa-transition-normal", "150ms");
  const name = document.createElement("input");
  name.autofocus = autofocus;
  name.value = "Original name";
  name.setAttribute("aria-label", "Name");
  const notes = document.createElement("textarea");
  notes.setAttribute("aria-label", "Notes");
  modal.append(name, notes);
  modal.addEventListener("modal-cancel", (event) => {
    if (event.target === modal) {
      modal.hide();
    }
  });
  host.append(modal);
  const rendered = await getRenderedModalDialog(host);
  await Promise.all(rendered.dialog.getAnimations().map((animation) => animation.finished));
  return { ...rendered, name, notes };
}

describe.runIf(browserMode)("modal native focus ownership", () => {
  it("owns the visible frame for every dialog variant", async () => {
    const { page } = await import("vitest/browser");
    await page.viewport(1280, 844);
    const cases = [
      { variant: "standard", width: 540, radius: "14px", shadow: true },
      { variant: "large", width: 680, radius: "20px", shadow: true },
      { variant: "reader", width: 1100, radius: "20px", shadow: true },
      { variant: "palette", width: 640, radius: "14px", shadow: true },
      { variant: "media", width: 1280, radius: "0px", shadow: false },
      { variant: "drawer", width: 460, radius: "0px", shadow: false },
    ] as const satisfies ReadonlyArray<{
      variant: OpenClawModalDialog["variant"];
      width: number;
      radius: string;
      shadow: boolean;
    }>;

    for (const contract of cases) {
      const { modal, dialog } = await mountModal(container, contract.variant);
      const style = getComputedStyle(dialog);
      expect(dialog.getBoundingClientRect().width).toBeCloseTo(contract.width, 0);
      expect(style.borderRadius).toBe(contract.radius);
      expect(style.boxShadow === "none").toBe(!contract.shadow);
      if (contract.variant === "palette") {
        expect(dialog.getBoundingClientRect().top).toBeCloseTo(160, 0);
      }
      if (contract.variant === "drawer") {
        expect(dialog.getBoundingClientRect().right).toBeCloseTo(1280, 0);
      }
      modal.remove();
    }
  });

  it("keeps standard content scrollable in a short viewport", async () => {
    const { page } = await import("vitest/browser");
    await page.viewport(800, 400);
    const { modal, dialog } = await mountModal();
    modal.firstElementChild?.setAttribute("style", "display:block;height:700px");
    const body = dialog.querySelector<HTMLElement>(".body");

    expect(body).toBeInstanceOf(HTMLElement);
    expect(body!.scrollHeight).toBeGreaterThan(body!.clientHeight);
    expect(getComputedStyle(body!).overflowY).toBe("auto");
  });

  it.each(["standard", "palette", "drawer"] as const)(
    "preserves selected content through chrome focus and retained reopen (%s)",
    async (variant) => {
      const { userEvent } = await import("vitest/browser");
      const trigger = document.createElement("button");
      trigger.textContent = "Open editor";
      container.append(trigger);
      trigger.focus();
      const { modal, dialog, name, notes } = await mountModal(container, variant);
      expect(document.activeElement).toBe(name);

      notes.focus();
      // Web Awesome's opening frame calls this real native method. It must not
      // redirect text after the operator has already selected slotted content.
      dialog.focus();
      expect(document.activeElement).toBe(notes);
      await userEvent.keyboard("First draft");
      expect(notes.value).toBe("First draft");
      expect(name.value).toBe("Original name");

      await userEvent.keyboard("{Escape}");
      await expect.poll(() => dialog.open).toBe(false);
      await expect.poll(() => document.activeElement).toBe(trigger);
      expect(modal.isConnected).toBe(true);

      modal.show();
      await expect.poll(() => dialog.open).toBe(true);
      await expect.poll(() => document.activeElement).toBe(name);
      notes.focus();
      dialog.focus();
      expect(document.activeElement).toBe(notes);
      await userEvent.keyboard(" continued");
      expect(notes.value).toBe("First draft continued");
      expect(name.value).toBe("Original name");
      expect(
        modal.shadowRoot?.querySelector("wa-dialog")?.shadowRoot?.querySelector("dialog"),
      ).toBe(dialog);
    },
  );

  it("keeps nested modal focus and dismissal inside the owning layer", async () => {
    const { userEvent } = await import("vitest/browser");
    const outer = await mountModal();
    outer.notes.focus();
    const nestedHost = document.createElement("div");
    outer.modal.append(nestedHost);
    const inner = await mountModal(nestedHost);
    expect(document.activeElement).toBe(inner.name);

    inner.notes.focus();
    inner.dialog.focus();
    expect(document.activeElement).toBe(inner.notes);
    await userEvent.keyboard("Nested draft");
    expect(inner.notes.value).toBe("Nested draft");
    expect(outer.notes.value).toBe("");

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => inner.dialog.open).toBe(false);
    await expect.poll(() => document.activeElement).toBe(outer.notes);
    expect(outer.dialog.open).toBe(true);
    outer.dialog.focus();
    expect(document.activeElement).toBe(outer.notes);
  });

  it("preserves selected content after showing inside a shadow root", async () => {
    const { userEvent } = await import("vitest/browser");
    const shadow = container.attachShadow({ mode: "open" });
    const host = document.createElement("div");
    shadow.append(host);
    const { dialog, webAwesomeDialog, name, notes } = await mountModal(host);
    expect(shadow.activeElement).toBe(name);

    notes.focus();
    dialog.focus();
    expect(shadow.activeElement).toBe(notes);
    webAwesomeDialog.dispatchEvent(new CustomEvent("wa-after-show", { bubbles: true }));
    expect(shadow.activeElement).toBe(notes);
    await userEvent.keyboard("Shadow draft");
    expect(notes.value).toBe("Shadow draft");
    expect(name.value).toBe("Original name");
  });

  it("leaves native chrome focused when there is no autofocus target or displaced field", async () => {
    const { modal, dialog } = await mountModal(container, "standard", false);
    expect(dialog.matches(":focus")).toBe(true);
    expect(document.activeElement).toBe(modal);
    expect(dialog.getAttribute("aria-label")).toBe("Edit details");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
