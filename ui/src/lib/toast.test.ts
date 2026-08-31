/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import "../components/modal-dialog.ts";
import { showToast } from "./toast.ts";

async function mountHost() {
  const host = document.createElement("openclaw-toast-host");
  document.body.append(host);
  await host.updateComplete;
  return host;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("shared toast", () => {
  it("reports when no host can present the toast", () => {
    expect(showToast({ message: "Unavailable", severity: "danger" })).toBe(false);
  });

  it("shows and replaces the active toast", async () => {
    const host = await mountHost();

    showToast({ message: "First", severity: "neutral" });
    await host.updateComplete;
    expect(host.querySelector(".app-toast__message")?.textContent).toBe("First");

    showToast({ message: "Second", severity: "neutral" });
    await host.updateComplete;
    expect(host.querySelectorAll(".app-toast")).toHaveLength(1);
    expect(host.querySelector(".app-toast__message")?.textContent).toBe("Second");
  });

  it.each([
    ["neutral", "status", "polite"],
    ["info", "status", "polite"],
    ["success", "status", "polite"],
    ["warning", "status", "polite"],
    ["danger", "alert", "assertive"],
  ] as const)(
    "presents %s with its semantic live-region contract",
    async (severity, role, live) => {
      const host = await mountHost();

      showToast({ message: severity, severity });
      await host.updateComplete;

      const toast = host.querySelector(".app-toast");
      expect(toast?.classList.contains(`app-toast--${severity}`)).toBe(true);
      expect(toast?.getAttribute("role")).toBe(role);
      expect(toast?.getAttribute("aria-live")).toBe(live);
    },
  );

  it("uses the active modal's toast layer before the app layer", async () => {
    const appHost = await mountHost();
    const modal = document.createElement("openclaw-modal-dialog");
    modal.open = true;
    document.body.append(modal);
    await modal.updateComplete;
    const moveBefore = vi.spyOn(Element.prototype, "moveBefore");

    showToast({ message: "Above overlay", severity: "neutral" });
    await appHost.updateComplete;

    expect(moveBefore).toHaveBeenCalledWith(appHost, null);
    expect(moveBefore.mock.contexts).toContain(modal);
    expect(appHost.textContent).toContain("Above overlay");
  });

  it("routes through an active modal inside a shadow root", async () => {
    const appHost = await mountHost();
    const shadowOwner = document.createElement("div");
    const shadowRoot = shadowOwner.attachShadow({ mode: "open" });
    const modal = document.createElement("openclaw-modal-dialog");
    modal.open = true;
    shadowRoot.append(modal);
    document.body.append(shadowOwner);
    await modal.updateComplete;
    const moveBefore = vi.spyOn(Element.prototype, "moveBefore");

    showToast({ message: "Critical session notice", severity: "warning" });
    await appHost.updateComplete;

    expect(moveBefore).toHaveBeenCalledWith(appHost, null);
    expect(moveBefore.mock.contexts).toContain(modal);
    expect(appHost.textContent).toContain("Critical session notice");
  });

  it("auto-dismisses after the configured duration", async () => {
    vi.useFakeTimers();
    const host = await mountHost();
    const anchor = document.createElement("div");
    document.body.append(anchor);
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));

    showToast({ anchor, message: "Temporary", severity: "info", durationMs: 50 });
    await host.updateComplete;
    await vi.advanceTimersByTimeAsync(50);
    await host.updateComplete;

    expect(host.querySelector('.app-toast[data-active="false"]')).not.toBeNull();

    await vi.runAllTimersAsync();
    await host.updateComplete;

    expect(host.querySelector(".app-toast")).toBeNull();
  });

  it.each(["pointer", "focus"] as const)(
    "pauses its timeout during %s interaction",
    async (kind) => {
      vi.useFakeTimers();
      const host = await mountHost();
      showToast({ message: "Actionable", severity: "info", durationMs: 50 });
      await host.updateComplete;
      const toast = host.querySelector<HTMLElement>(".app-toast")!;

      await vi.advanceTimersByTimeAsync(40);
      if (kind === "pointer") {
        toast.dispatchEvent(new MouseEvent("pointerenter"));
      } else {
        host.querySelector<HTMLButtonElement>(".app-toast__dismiss")?.focus();
      }
      await vi.advanceTimersByTimeAsync(50);
      await host.updateComplete;
      expect(host.querySelector(".app-toast")).not.toBeNull();

      if (kind === "pointer") {
        toast.dispatchEvent(new MouseEvent("pointerleave"));
      } else {
        host.querySelector<HTMLButtonElement>(".app-toast__dismiss")?.blur();
      }
      await vi.runAllTimersAsync();
      await host.updateComplete;
      expect(host.querySelector(".app-toast")).toBeNull();
    },
  );

  it("runs its action once and dismisses", async () => {
    const host = await mountHost();
    const onAction = vi.fn();
    showToast({ message: "Archived", severity: "success", actionLabel: "Undo", onAction });
    await host.updateComplete;

    host.querySelector<HTMLButtonElement>(".app-toast__action")?.click();
    await host.updateComplete;

    expect(onAction).toHaveBeenCalledOnce();
    expect(host.querySelector(".app-toast")).toBeNull();
  });

  it("preserves the dismissal reason when an exiting toast is replaced", async () => {
    vi.useFakeTimers();
    const host = await mountHost();
    const anchor = document.createElement("div");
    document.body.append(anchor);
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
    const reasons: string[] = [];

    showToast({
      anchor,
      message: "First",
      severity: "info",
      onDismiss: (reason) => reasons.push(reason),
    });
    await host.updateComplete;
    host.querySelector<HTMLButtonElement>(".app-toast__dismiss")?.click();
    await host.updateComplete;
    showToast({ message: "Second", severity: "neutral" });

    expect(reasons).toEqual(["dismiss"]);
  });

  it("reports why a toast is replaced, dismissed, acted on, or disconnected", async () => {
    vi.useFakeTimers();
    const host = await mountHost();
    const reasons: string[] = [];

    showToast({
      message: "First",
      severity: "neutral",
      onDismiss: (reason) => reasons.push(reason),
    });
    showToast({
      message: "Second",
      severity: "success",
      actionLabel: "Undo",
      onAction: () => reasons.push("ran-action"),
      onDismiss: (reason) => reasons.push(reason),
    });
    await host.updateComplete;
    host.querySelector<HTMLButtonElement>(".app-toast__action")?.click();
    await host.updateComplete;

    showToast({
      message: "Third",
      severity: "neutral",
      onDismiss: (reason) => reasons.push(reason),
    });
    await host.updateComplete;
    host.querySelector<HTMLButtonElement>(".app-toast__dismiss")?.click();
    await vi.runAllTimersAsync();
    await host.updateComplete;
    expect(host.querySelector(".app-toast")).toBeNull();

    showToast({
      message: "Fourth",
      severity: "neutral",
      onDismiss: (reason) => reasons.push(reason),
    });
    host.remove();

    expect(reasons).toEqual(["replaced", "action", "ran-action", "dismiss", "disconnected"]);
  });
});
