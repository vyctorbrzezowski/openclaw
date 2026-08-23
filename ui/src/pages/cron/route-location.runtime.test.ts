import { describe, expect, it } from "vitest";
import { INTERNAL_ROUTE_PATH_PARAM } from "../../app-route-paths.ts";
import type { ApplicationContext } from "../../app/context.ts";
import { loadCronRouteData } from "./route-location.runtime.ts";

function load(pathname: string, basePath = "") {
  return loadCronRouteData({ basePath } as ApplicationContext, {
    location: { pathname, search: "", hash: "" },
  });
}

describe("loadCronRouteData", () => {
  it.each(["/automations", "/automations/", "/cron", "/cron/"])(
    "classifies the list root %s",
    (pathname) => {
      expect(load(pathname)).toEqual({ kind: "list" });
    },
  );

  it("classifies a valid job and tab", () => {
    expect(load("/automations/release%2Edigest/runs")).toEqual({
      kind: "job",
      jobId: "release.digest",
      detailTab: "history",
    });
  });

  it.each([
    "/automations/%",
    "/automations/job/unknown",
    "/automations//runs",
    "/automations/%20",
    "/cron/%",
    "/cron/job/unknown",
    "/cron//runs",
    "/cron/%20",
  ])("records a rejected descendant at the lazy route boundary: %s", (pathname) => {
    expect(load(pathname)).toEqual({ kind: "invalid", pathname });
  });

  it("classifies the original descendant carried through the static route handoff", () => {
    const pathname = "/automations/job/unknown";
    const search = new URLSearchParams({ [INTERNAL_ROUTE_PATH_PARAM]: pathname }).toString();
    expect(
      loadCronRouteData({ basePath: "" } as ApplicationContext, {
        location: { pathname: "/automations", search: `?${search}`, hash: "" },
      }),
    ).toEqual({ kind: "invalid", pathname });
  });

  it("respects a configured Control UI base path", () => {
    expect(load("/control/automations", "/control")).toEqual({ kind: "list" });
    expect(load("/control/cron/job/unknown", "/control")).toEqual({
      kind: "invalid",
      pathname: "/control/cron/job/unknown",
    });
  });
});
