import { normalizeRouteBasePath, normalizeRoutePath, type RouteLocation } from "@openclaw/uirouter";
import { automationRouteFromPath } from "../../app-automation-paths.runtime.ts";
import { INTERNAL_ROUTE_PATH_PARAM, routePageSpec } from "../../app-route-paths.ts";
import type { ApplicationContext } from "../../app/context.ts";
import type { CronDetailTab } from "./view.ts";

export type CronRouteData =
  | { kind: "list" }
  | { kind: "job"; jobId: string; detailTab: CronDetailTab }
  | { kind: "invalid"; pathname: string };

function cronRouteLocation(location: RouteLocation): RouteLocation {
  const params = new URLSearchParams(location.search);
  const pathname = params.get(INTERNAL_ROUTE_PATH_PARAM) ?? location.pathname;
  params.delete(INTERNAL_ROUTE_PATH_PARAM);
  const search = params.toString();
  return { pathname, search: search ? `?${search}` : "", hash: location.hash };
}

function isCronListPath(pathname: string, basePath: string): boolean {
  const normalizedPath = normalizeRoutePath(pathname).toLowerCase();
  const normalizedBasePath = normalizeRouteBasePath(basePath);
  const { path, aliases = [] } = routePageSpec("cron");
  return [path, ...aliases].some(
    (candidate) => `${normalizedBasePath}${candidate}`.toLowerCase() === normalizedPath,
  );
}

export function loadCronRouteData(
  context: ApplicationContext,
  { location }: { location: RouteLocation },
): CronRouteData {
  const { pathname } = cronRouteLocation(location);
  const route = automationRouteFromPath(pathname, context.basePath);
  if (!route) {
    // The lazy route boundary owns whether a cron namespace URL is the list or
    // a rejected descendant; consumers must not infer that distinction again.
    return isCronListPath(pathname, context.basePath)
      ? { kind: "list" }
      : { kind: "invalid", pathname };
  }
  return {
    kind: "job",
    jobId: route.jobId,
    detailTab: route.tab === "runs" ? "history" : "settings",
  };
}
