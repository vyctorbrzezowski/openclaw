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
  it("holds a toast reported before any host exists, then shows it", async () => {
    expect(showToast({ message: "Unavailable" })).toBe(false);

    // Outcomes reported during startup race the shell that owns the host, so
    // the message waits for it instead of being dropped.
    const host = await mountHost();
    expect(host.querySelector(".app-toast__message")?.textContent).toBe("Unavailable");
  });

  it("stacks concurrent toasts newest first instead of replacing them", async () => {
    const host = await mountHost();

    showToast({ message: "First" });
    await host.updateComplete;
    expect(host.querySelector(".app-toast__message")?.textContent).toBe("First");

    showToast({ message: "Second" });
    await host.updateComplete;
    // Batched callers report several outcomes in a row; each one has to survive
    // its successor rather than be swallowed by it.
    expect(
      [...host.querySelectorAll(".app-toast__message")].map((node) => node.textContent),
    ).toEqual(["Second", "First"]);
  });

  it.each([
    {
      total: 5,
      labels: ["1st", "2nd", "3rd", "4th", "5th"],
      front: "5th",
      retired: [],
      count: "+1",
    },
    {
      total: 7,
      labels: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"],
      front: "7th",
      retired: ["1st", "2nd"],
      count: "+3",
    },
  ])(
    "counts every dispatched card for $total outcomes",
    async ({ labels, front, retired: expectedRetired, count }) => {
      const host = await mountHost();
      const retired: string[] = [];

      for (const label of labels) {
        showToast({ message: label, onDismiss: (reason) => retired.push(`${label}:${reason}`) });
      }
      await host.updateComplete;

      expect(host.querySelectorAll(".app-toast")).toHaveLength(5);
      expect(host.querySelector(".app-toast__message")?.textContent).toBe(front);
      expect(retired).toEqual(expectedRetired.map((label) => `${label}:replaced`));
      // Total dispatched = front + three visible edges + the counter.
      expect(host.querySelector(".app-toast__count")?.textContent).toBe(count);
    },
  );

  it("holds every card's clock while the stack is expanded, then resumes it", async () => {
    vi.useFakeTimers();
    const host = await mountHost();
    showToast({ message: "Held", durationMs: 100 });
    await host.updateComplete;

    await vi.advanceTimersByTimeAsync(60);
    host.querySelector(".app-toast-stack")?.dispatchEvent(new Event("pointerenter"));
    await host.updateComplete;

    // Well past the original duration, but the clock is held while it is read.
    await vi.advanceTimersByTimeAsync(5_000);
    await host.updateComplete;
    expect(host.querySelector(".app-toast")).not.toBeNull();

    host.querySelector(".app-toast-stack")?.dispatchEvent(new Event("pointerleave"));
    // The collapse grace period, then the 40ms this toast had left.
    await vi.advanceTimersByTimeAsync(140 + 40);
    await host.updateComplete;
    expect(host.querySelector(".app-toast")).toBeNull();
  });

  it("stays expanded while dismissing every card before the pointer leaves", async () => {
    vi.useFakeTimers();
    const host = await mountHost();
    for (const label of ["1st", "2nd", "3rd", "4th", "5th", "6th"]) {
      showToast({ message: label });
    }
    await host.updateComplete;

    const stack = host.querySelector<HTMLElement>(".app-toast-stack");
    expect(stack).not.toBeNull();
    stack?.dispatchEvent(new Event("pointerenter"));
    await host.updateComplete;
    expect(stack?.classList.contains("app-toast-stack--expanded")).toBe(true);

    while (host.querySelector(".app-toast")) {
      host.querySelector<HTMLButtonElement>(".app-toast__dismiss")?.click();
      await host.updateComplete;
      if (host.querySelector(".app-toast")) {
        expect(host.querySelector(".app-toast-stack--expanded")).not.toBeNull();
      }
    }

    expect(host.querySelector(".app-toast-stack")).toBeNull();
  });

  it("uses the active modal's toast layer before the app layer", async () => {
    const appHost = await mountHost();
    const modal = document.createElement("openclaw-modal-dialog");
    modal.open = true;
    document.body.append(modal);
    await modal.updateComplete;
    const moveBefore = vi.spyOn(Element.prototype, "moveBefore");

    showToast({ message: "Above overlay" });
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

    showToast({ message: "Critical session notice" });
    await appHost.updateComplete;

    expect(moveBefore).toHaveBeenCalledWith(appHost, null);
    expect(moveBefore.mock.contexts).toContain(modal);
    expect(appHost.textContent).toContain("Critical session notice");
  });

  it("auto-dismisses after the configured duration", async () => {
    vi.useFakeTimers();
    const host = await mountHost();

    showToast({ message: "Temporary", durationMs: 50 });
    await host.updateComplete;
    await vi.advanceTimersByTimeAsync(50);
    await host.updateComplete;

    expect(host.querySelector(".app-toast")).toBeNull();
  });

  it("runs its action once and dismisses", async () => {
    const host = await mountHost();
    const onAction = vi.fn();
    showToast({ message: "Archived", actionLabel: "Undo", onAction });
    await host.updateComplete;

    host.querySelector<HTMLButtonElement>(".app-toast__action")?.click();
    await host.updateComplete;

    expect(onAction).toHaveBeenCalledOnce();
    expect(host.querySelector(".app-toast")).toBeNull();
  });

  it("reports why a toast is replaced, dismissed, acted on, or disconnected", async () => {
    const host = await mountHost();
    const reasons: string[] = [];

    showToast({ message: "First", onDismiss: (reason) => reasons.push(reason) });
    showToast({
      message: "Second",
      actionLabel: "Undo",
      onAction: () => reasons.push("ran-action"),
      onDismiss: (reason) => reasons.push(reason),
    });
    await host.updateComplete;
    host.querySelector<HTMLButtonElement>(".app-toast__action")?.click();
    await host.updateComplete;

    showToast({ message: "Third", onDismiss: (reason) => reasons.push(reason) });
    await host.updateComplete;
    // The front card is the newest, so this dismisses "Third".
    host.querySelector<HTMLButtonElement>(".app-toast__dismiss")?.click();
    await host.updateComplete;

    showToast({ message: "Fourth", onDismiss: (reason) => reasons.push(reason) });
    host.remove();

    // "First" is no longer replaced by "Second" — it waits its turn in the
    // stack and leaves with the host.
    expect(reasons).toEqual(["action", "ran-action", "dismiss", "disconnected", "disconnected"]);
  });
});
