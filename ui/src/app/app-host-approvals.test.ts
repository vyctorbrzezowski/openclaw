/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLazyElementSpec,
  resetAppHostTestGlobals,
  type TestOptionalCustomElement,
} from "./app-host.test-support.ts";
import "./app-host.ts";

type ApprovalOverlay = {
  show: () => void;
  showForSession: (sessionKey: string) => void;
};

type ShellApprovalLazyState = {
  approvalOverlay?: ApprovalOverlay;
  execApprovalElement: TestOptionalCustomElement;
  openApprovals: (sessionKey?: string) => void;
};

afterEach(() => {
  resetAppHostTestGlobals();
});

describe("OpenClaw approval lazy surface", () => {
  it("opens the surface generically or anchored to a requested session", async () => {
    const element = createLazyElementSpec("session approval popover");
    const overlay = { show: vi.fn(), showForSession: vi.fn() };
    const shell = document.createElement("openclaw-app-shell") as unknown as ShellApprovalLazyState;
    shell.execApprovalElement = element;
    Object.defineProperty(shell, "updateComplete", {
      configurable: true,
      get: () => Promise.resolve(true),
    });
    Object.defineProperty(shell, "approvalOverlay", {
      configurable: true,
      get: () => (customElements.get(element.tagName) ? overlay : undefined),
    });

    shell.openApprovals();
    await vi.waitFor(() => expect(overlay.show).toHaveBeenCalledOnce());

    shell.openApprovals("agent:main:tax-research");
    await vi.waitFor(() =>
      expect(overlay.showForSession).toHaveBeenCalledWith("agent:main:tax-research"),
    );
    expect(overlay.show).toHaveBeenCalledOnce();
  });
});
