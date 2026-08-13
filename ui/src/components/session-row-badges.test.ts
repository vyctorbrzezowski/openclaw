/* @vitest-environment jsdom */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n/index.ts";
import { icons } from "./icons.ts";
import {
  renderSessionRowBadges,
  resolveCloudPlacementIcon,
  type SessionPlacementState,
} from "./session-row-badges.ts";
import "./tooltip.ts";

let container: HTMLDivElement;

beforeEach(async () => {
  await i18n.setLocale("en");
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(() => {
  container.remove();
});

function expectTooltipText(badge: Element | null | undefined, text: string) {
  expect(badge?.hasAttribute("title")).toBe(false);
  expect(
    (badge?.closest("openclaw-tooltip") as (HTMLElement & { content?: string }) | null)?.content,
  ).toBe(text);
}

describe("session row placement badges", () => {
  it.each([
    ["requested", icons.cloud],
    ["provisioning", icons.cloudCog],
    ["starting", icons.cloudCog],
    ["syncing", icons.cloudSync],
    ["reconciling", icons.cloudSync],
    ["active", icons.cloudCheck],
    ["draining", icons.cloudOff],
    ["reclaimed", icons.cloudOff],
    ["failed", icons.cloudAlert],
  ] satisfies Array<[SessionPlacementState, (typeof icons)[keyof typeof icons]]>)(
    "maps %s to its cloud-state icon",
    (state, expected) => {
      expect(resolveCloudPlacementIcon(state, false)).toBe(expected);
    },
  );

  it("uses cloud-alert for a workspace conflict regardless of placement state", () => {
    expect(resolveCloudPlacementIcon("reclaimed", true)).toBe(icons.cloudAlert);
  });

  it("renders the incognito indicator", () => {
    render(
      renderSessionRowBadges({
        hasAutomation: false,
        incognito: true,
      }),
      container,
    );

    const badge = container.querySelector(".session-row-badge--incognito");
    expect(badge?.getAttribute("aria-label")).toBe("Incognito session");
    expectTooltipText(badge, "Incognito session");
  });

  it("renders the durable outbox count and stays quiet when empty", () => {
    render(
      renderSessionRowBadges({
        hasAutomation: false,
        outboxCount: 3,
      }),
      container,
    );

    const badge = container.querySelector<HTMLElement>(".session-row-badge--queued");
    expect(badge?.getAttribute("aria-label")).toBe("3 messages queued to send");
    expectTooltipText(badge, "3 messages queued to send");
    expect(badge?.textContent).toContain("3");
    expect(badge?.querySelector("svg")).not.toBeNull();

    render(renderSessionRowBadges({ hasAutomation: false, outboxCount: 0 }), container);
    expect(container.querySelector(".session-row-badges")).toBeNull();
  });

  it("keeps unrelated badges independent from placement context", () => {
    render(
      renderSessionRowBadges({
        hasAutomation: true,
      }),
      container,
    );

    expect(container.querySelectorAll(".session-row-badge")).toHaveLength(1);
    expectTooltipText(container.querySelector(".session-row-badge"), "Automation attached");
    expect(container.querySelector(".session-row-badge--cloud")).toBeNull();
  });

  it("renders a green open-pull-request indicator", () => {
    render(
      renderSessionRowBadges({
        hasAutomation: false,
        pullRequest: { numbers: [111532], state: "open" },
      }),
      container,
    );

    const badge = container.querySelector(".session-row-badge--pull-request");
    expect(badge?.getAttribute("aria-label")).toBe("#111532 · Open");
    expectTooltipText(badge, "#111532 · Open");
    expect(badge?.getAttribute("data-pull-request-state")).toBe("open");
    expect(badge?.querySelector("svg")).not.toBeNull();
  });

  it.each([
    { state: "draft" as const, label: "#107302 · Draft" },
    { state: "merged" as const, label: "#111751, #111772 · Merged" },
  ])("renders catalog pull request metadata for $state threads", ({ state, label }) => {
    render(
      renderSessionRowBadges({
        hasAutomation: false,
        pullRequest: {
          numbers: state === "draft" ? [107302] : [111751, 111772],
          state,
        },
      }),
      container,
    );

    const badge = container.querySelector(".session-row-badge--pull-request");
    expect(badge?.getAttribute("aria-label")).toBe(label);
    expectTooltipText(badge, label);
    expect(badge?.getAttribute("data-pull-request-state")).toBe(state);
  });

  it("renders a warning-colored approval-needed indicator", () => {
    render(
      renderSessionRowBadges({
        hasApproval: true,
        hasAutomation: false,
      }),
      container,
    );

    const badge = container.querySelector(".session-row-badge--approval");
    expect(badge?.getAttribute("aria-label")).toBe("Approval needed");
    expectTooltipText(badge, "Approval needed");
    expect(badge?.querySelector("svg")).not.toBeNull();
  });

  it("keeps child-only automation badges hidden while showing PR and approval", () => {
    render(
      renderSessionRowBadges({
        isChild: true,
        hasAutomation: true,
        pullRequest: { numbers: [111532], state: "open" },
        hasApproval: true,
      }),
      container,
    );

    expect(container.querySelectorAll(".session-row-badge")).toHaveLength(2);
    expect(container.querySelector(".session-row-badge--pull-request")).not.toBeNull();
    expect(container.querySelector(".session-row-badge--approval")).not.toBeNull();
    expect(container.querySelector(".session-row-badge--cloud")).toBeNull();
  });
});
