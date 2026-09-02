import type { RouteLocation } from "@openclaw/uirouter";
import { automationRouteFromPath } from "../../app-automation-paths.runtime.ts";
import { INTERNAL_ROUTE_PATH_PARAM } from "../../app-route-paths.ts";
import type { ApplicationContext } from "../../app/context.ts";
export type CronRouteData = NonNullable<ReturnType<typeof automationRouteFromPath>>;

export function loadCronRouteData(
  context: ApplicationContext,
  { location }: { location: RouteLocation },
): CronRouteData {
  const pathname =
    new URLSearchParams(location.search).get(INTERNAL_ROUTE_PATH_PARAM) ?? location.pathname;
  return automationRouteFromPath(pathname, context.basePath) ?? { kind: "invalid" };
}
