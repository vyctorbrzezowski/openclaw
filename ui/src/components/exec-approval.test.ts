/* @vitest-environment jsdom */

import { html, nothing, render, type LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecApprovalRequest } from "../app/exec-approval.ts";
import { i18n } from "../i18n/index.ts";
import "./exec-approval.ts";

let container: HTMLDivElement;

function createExecRequest(overrides: Partial<ExecApprovalRequest> = {}): ExecApprovalRequest {
  return {
    id: "approval-1",
    kind: "exec",
    request: {
      command: "echo hello",
      ask: "on-request",
    },
    createdAtMs: Date.now() - 1_000,
    expiresAtMs: Date.now() + 60_000,
    ...overrides,
  };
}

async function renderApproval(
  requestOrQueue: ExecApprovalRequest | ExecApprovalRequest[],
  overrides: Partial<{
    busy: boolean;
    errors: ReadonlyMap<string, string>;
    nowMs: number;
    inlineApprovalId: string | null;
    resolveSessionName: (sessionKey: string) => string;
    onDecision: ReturnType<typeof vi.fn>;
  }> = {},
) {
  const queue = Array.isArray(requestOrQueue) ? requestOrQueue : [requestOrQueue];
  const onDecision = overrides.onDecision ?? vi.fn();
  render(
    html`<openclaw-exec-approval
      .props=${{
        queue,
        busy: overrides.busy ?? false,
        errors: overrides.errors ?? new Map(),
        nowMs: overrides.nowMs ?? Date.now(),
        inlineApprovalId: overrides.inlineApprovalId ?? null,
        resolveSessionName: overrides.resolveSessionName,
        onDecision,
      }}
    ></openclaw-exec-approval>`,
    container,
  );
  const approval = container.querySelector<LitElement>("openclaw-exec-approval");
  if (!approval) {
    throw new Error("Expected exec approval");
  }
  await approval.updateComplete;
  return { approval, onDecision };
}

function chord(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, metaKey: true, bubbles: true, ...init });
}

function renderedPopover(): HTMLElement {
  const popover = container.querySelector<HTMLElement>(".exec-approval-popover");
  expect(popover).toBeInstanceOf(HTMLElement);
  if (!popover) {
    throw new Error("Expected approval popover");
  }
  return popover;
}

describe("openclaw-exec-approval", () => {
  beforeEach(async () => {
    await i18n.setLocale("en");
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    render(nothing, container);
    container.remove();
    document.querySelectorAll("[data-test-approval-row]").forEach((row) => row.remove());
    await i18n.setLocale("en");
    vi.restoreAllMocks();
  });

  it("keeps the app usable while identifying the requesting conversation by name", async () => {
    const sessionKey = "agent:roboclaw:dashboard:27d25e4e-a830-47db-a457-ea14ecde0df0";
    await renderApproval(
      createExecRequest({
        request: {
          command: "openclaw export --target production",
          agentId: "roboclaw",
          sessionKey,
        },
      }),
      { resolveSessionName: () => "Quarterly tax filing" },
    );

    expect(container.querySelector("openclaw-modal-dialog")).toBeNull();
    expect(container.querySelector(".exec-approval-popover")?.getAttribute("role")).toBe("region");
    expect(container.querySelector(".exec-approval-title")?.textContent?.trim()).toBe(
      "Quarterly tax filing",
    );
    const technicalDetails = container.querySelector<HTMLDetailsElement>(".exec-approval-details");
    expect(technicalDetails?.open).toBe(false);
    expect(technicalDetails?.textContent).toContain(sessionKey);
    expect(document.body.inert).not.toBe(true);
  });

  it("uses neutral unavailable copy for exec allow-always decisions", async () => {
    await renderApproval(
      createExecRequest({
        request: {
          command: "echo hello",
          ask: "always",
          allowedDecisions: ["allow-once", "deny"],
        },
      }),
    );

    renderedPopover();

    expect(
      Array.from(container.querySelectorAll(".exec-approval-actions button > span")).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(["Allow once", "Deny"]);
    expect(container.querySelector(".exec-approval-warning")?.textContent?.trim()).toBe(
      "Allow Always is unavailable for this command.",
    );
  });

  it("does not show exec unavailable copy for restricted plugin approvals", async () => {
    await renderApproval(
      createExecRequest({
        id: "plugin-approval-1",
        kind: "plugin",
        request: {
          command: "Plugin approval",
          allowedDecisions: ["allow-once", "deny"],
        },
        pluginTitle: "Plugin approval",
      }),
    );

    renderedPopover();

    expect(
      Array.from(container.querySelectorAll(".exec-approval-actions button > span")).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(["Allow once", "Deny"]);
    expect(container.querySelector(".exec-approval-warning")).toBeNull();
  });

  it("renders the live expiry countdown as mm:ss", async () => {
    await renderApproval(createExecRequest({ expiresAtMs: 90_500 }), { nowMs: 0 });
    renderedPopover();

    expect(container.querySelector(".exec-approval-countdown")?.textContent?.trim()).toBe(
      "Command approval · expires in 01:31",
    );
  });

  it("shows the approval owned by the focused session without changing queue order", async () => {
    const queue = [
      createExecRequest({
        id: "approval-oldest",
        createdAtMs: 1,
        request: { command: "echo oldest", sessionKey: "agent:main:oldest" },
      }),
      createExecRequest({
        id: "approval-newer",
        createdAtMs: 2,
        request: {
          command: "pnpm test",
          agentId: "worker",
          sessionKey: "agent:main:newer",
        },
      }),
    ];
    const { approval } = await renderApproval(queue);
    renderedPopover();

    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-oldest",
    );
    (approval as LitElement & { showForSession(sessionKey: string): void }).showForSession(
      "agent:main:newer",
    );
    await approval.updateComplete;

    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-newer",
    );
    expect(container.querySelector(".exec-approval-pager")).toBeNull();
    expect(queue.map((entry) => entry.id)).toEqual(["approval-oldest", "approval-newer"]);
  });

  it("anchors the default card to the first pending session row that is visible", async () => {
    const visibleRow = document.createElement("div");
    visibleRow.dataset.testApprovalRow = "true";
    visibleRow.dataset.sessionKey = "agent:main:visible";
    document.body.append(visibleRow);

    await renderApproval([
      createExecRequest({
        id: "approval-other-agent",
        createdAtMs: 1,
        request: { command: "echo hidden", sessionKey: "agent:other:hidden" },
      }),
      createExecRequest({
        id: "approval-visible",
        createdAtMs: 2,
        request: { command: "echo visible", sessionKey: "agent:main:visible" },
      }),
    ]);

    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-visible",
    );
    expect(renderedPopover().dataset.anchorSession).toBe("agent:main:visible");
  });

  it("expands a long command without replacing the active request", async () => {
    const command = `python publish.py ${"--include-audit-log ".repeat(8)}`;
    const { approval } = await renderApproval(
      createExecRequest({ request: { command, agentId: "worker" } }),
    );

    expect(container.querySelector(".exec-approval-command")?.classList).toContain(
      "exec-approval-command--collapsed",
    );
    container.querySelector<HTMLButtonElement>(".exec-approval-command-toggle")?.click();
    await approval.updateComplete;

    expect(container.querySelector(".exec-approval-command")?.classList).not.toContain(
      "exec-approval-command--collapsed",
    );
    expect(container.querySelector(".exec-approval-command")?.textContent).toContain(command);
  });

  it("handles approval shortcuts while focus is in the popover", async () => {
    const { onDecision } = await renderApproval(createExecRequest());
    const popover = renderedPopover();

    popover.dispatchEvent(chord("Enter"));
    popover.dispatchEvent(chord("Enter", { shiftKey: true }));
    popover.dispatchEvent(chord("в", { code: "KeyD", metaKey: false, ctrlKey: true }));

    expect(onDecision.mock.calls).toEqual([
      ["approval-1", "allow-once"],
      ["approval-1", "allow-always"],
      ["approval-1", "deny"],
    ]);
  });

  it("ignores bare keys so stray typing cannot authorize a command", async () => {
    const { onDecision } = await renderApproval(createExecRequest());
    const popover = renderedPopover();

    popover.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    popover.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    popover.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
    popover.dispatchEvent(chord("Enter", { altKey: true }));

    expect(onDecision).not.toHaveBeenCalled();
  });

  it("ignores auto-repeated shortcut keydown events", async () => {
    const { onDecision } = await renderApproval(createExecRequest());
    const popover = renderedPopover();

    popover.dispatchEvent(chord("Enter", { repeat: true }));
    popover.dispatchEvent(chord("Enter", { shiftKey: true, repeat: true }));

    expect(onDecision).not.toHaveBeenCalled();
  });

  it("keeps the displayed approval pinned when an older request arrives", async () => {
    const newer = createExecRequest({ id: "approval-newer", createdAtMs: 2_000 });
    const older = createExecRequest({ id: "approval-older", createdAtMs: 1_000 });
    const { approval } = await renderApproval([newer]);
    renderedPopover();
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-newer",
    );

    // Oldest-first sorting puts the late arrival at the head, but the card
    // the user is reading must not swap out from under them.
    await renderApproval([older, newer]);
    await approval.updateComplete;
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-newer",
    );

    // Once the pinned request settles, the head takes over.
    await renderApproval([older]);
    await approval.updateComplete;
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-older",
    );
  });

  it("repins the popover card when its selection becomes inline", async () => {
    const selected = createExecRequest({
      id: "approval-selected",
      createdAtMs: 2_000,
      request: { command: "echo selected", sessionKey: "agent:main:selected" },
    });
    const displayedHead = createExecRequest({
      id: "approval-head",
      createdAtMs: 1_000,
      request: { command: "echo head", sessionKey: "agent:main:head" },
    });
    const olderArrival = createExecRequest({ id: "approval-older", createdAtMs: 500 });
    const { approval } = await renderApproval([displayedHead, selected]);
    renderedPopover();

    (approval as LitElement & { showForSession(sessionKey: string): void }).showForSession(
      "agent:main:selected",
    );
    await approval.updateComplete;
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-selected",
    );

    await renderApproval([displayedHead, selected], { inlineApprovalId: selected.id });
    await approval.updateComplete;
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-head",
    );

    await renderApproval([olderArrival, displayedHead, selected], {
      inlineApprovalId: selected.id,
    });
    await approval.updateComplete;
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-head",
    );
  });

  it("guards shortcuts while busy, disallowed, or focused in text input", async () => {
    const restricted = createExecRequest({
      request: { command: "echo hello", allowedDecisions: ["allow-once", "deny"] },
    });
    const onDecision = vi.fn();
    await renderApproval(restricted, { busy: true, onDecision });
    let popover = renderedPopover();
    popover.dispatchEvent(chord("Enter"));

    await renderApproval(restricted, { onDecision });
    popover = renderedPopover();
    popover.dispatchEvent(chord("Enter", { shiftKey: true }));
    const input = document.createElement("input");
    popover.append(input);
    input.dispatchEvent(chord("d", { composed: true }));
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    const editorChild = document.createElement("span");
    editor.append(editorChild);
    popover.append(editor);
    editorChild.dispatchEvent(chord("Enter", { composed: true }));

    expect(onDecision).not.toHaveBeenCalled();
  });

  it.each([
    { reason: "a decision is in flight", busy: true, allowedDecisions: undefined },
    { reason: "denial is unavailable", busy: false, allowedDecisions: ["allow-once"] as const },
  ])("keeps the pending approval visible when $reason", async ({ busy, allowedDecisions }) => {
    await renderApproval(
      createExecRequest({
        request: {
          command: "echo hello",
          ...(allowedDecisions ? { allowedDecisions: [...allowedDecisions] } : {}),
        },
      }),
      { busy },
    );
    expect(renderedPopover()).toBeInstanceOf(HTMLElement);
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".exec-approval-actions button"),
    );
    expect(buttons.map((button) => button.textContent?.trim())).toContain("Allow once");
    expect(buttons.every((button) => button.disabled)).toBe(busy);
  });

  it("suppresses the automatic popover for the inline request but opens it on demand", async () => {
    const { approval } = await renderApproval(createExecRequest(), {
      inlineApprovalId: "approval-1",
    });
    expect(container.querySelector(".exec-approval-popover")).toBeNull();

    (approval as LitElement & { show(): void }).show();
    await approval.updateComplete;

    expect(container.querySelector(".exec-approval-popover")).not.toBeNull();
  });

  it("keeps unrelated requests in the popover while one active-session request is inline", async () => {
    await renderApproval(
      [
        createExecRequest({ id: "approval-inline" }),
        createExecRequest({ id: "approval-other", request: { command: "pnpm test" } }),
      ],
      { inlineApprovalId: "approval-inline" },
    );

    renderedPopover();
    expect(container.querySelector(".exec-approval-card")?.getAttribute("data-approval-id")).toBe(
      "approval-other",
    );
  });

  it("resets manual show-all after the approval queue drains", async () => {
    let rendered = await renderApproval(createExecRequest(), { inlineApprovalId: "approval-1" });
    (rendered.approval as LitElement & { show(): void }).show();
    await rendered.approval.updateComplete;
    expect(container.querySelector(".exec-approval-popover")).not.toBeNull();

    rendered = await renderApproval([], { inlineApprovalId: null });
    await rendered.approval.updateComplete;
    await renderApproval(createExecRequest(), { inlineApprovalId: "approval-1" });

    expect(container.querySelector(".exec-approval-popover")).toBeNull();
  });
});
