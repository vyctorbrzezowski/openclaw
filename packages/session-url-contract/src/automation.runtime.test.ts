import { describe, expect, it } from "vitest";
import {
  buildControlUiAutomationPath,
  parseControlUiAutomationPath,
} from "./automation.runtime.js";

describe("buildControlUiAutomationPath", () => {
  it.each([
    ["settings", {}, "/automations/nightly%2Edigest"],
    ["runs", { tab: "runs" }, "/automations/nightly%2Edigest/runs"],
    ["nested base path", { basePath: "/control/" }, "/control/automations/nightly%2Edigest"],
  ] as const)("builds the %s route", (_label, params, expected) => {
    expect(buildControlUiAutomationPath("nightly.digest", params)).toBe(expected);
  });

  it("encodes opaque job ids as one safe path segment", () => {
    expect(buildControlUiAutomationPath("team/audit ~ daily")).toBe(
      "/automations/team%2Faudit%20~%20daily",
    );
  });

  it("rejects a blank job id", () => {
    expect(buildControlUiAutomationPath(" ")).toBeNull();
  });
});

describe("parseControlUiAutomationPath", () => {
  it("round-trips an encoded job route", () => {
    const path = buildControlUiAutomationPath("nightly.digest", { tab: "runs" });
    expect(path && parseControlUiAutomationPath(path)).toEqual({
      kind: "runs",
      jobId: "nightly.digest",
    });
  });

  it("accepts the legacy route alias", () => {
    expect(parseControlUiAutomationPath("/cron/nightly%2Edigest/runs")).toEqual({
      kind: "runs",
      jobId: "nightly.digest",
    });
  });

  it.each(["/automations", "/cron/"])("recognizes the list route %s", (path) => {
    expect(parseControlUiAutomationPath(path)).toEqual({ kind: "list" });
  });

  it.each(["/automations/%", "/automations/job/runs/extra", "/automations/job/unknown"])(
    "rejects the malformed route %s",
    (path) => {
      expect(parseControlUiAutomationPath(path)).toEqual({ kind: "invalid" });
    },
  );

  it("decodes an encoded slash without accepting a nested route", () => {
    expect(parseControlUiAutomationPath("/automations/job%2Fchild")).toEqual({
      kind: "detail",
      jobId: "job/child",
    });
    expect(parseControlUiAutomationPath("/automations/job/child")).toEqual({ kind: "invalid" });
  });
});
