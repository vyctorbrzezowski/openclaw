import type { CronJob, ModelAuthStatusResult } from "../api/types.ts";
import type { NavigationRouteId } from "../app-navigation.ts";
import type { ExecApprovalRequest } from "../app/exec-approval.ts";
import { t } from "../i18n/index.ts";
import { isCronJobActiveFailure } from "../lib/cron-status.ts";
import { clampText } from "../lib/format.ts";
import { isMonitoredAuthProvider } from "../lib/model-auth.ts";
import type { IconName } from "./icons.ts";

const CRON_OVERDUE_GRACE_MS = 300_000;
const REPEAT_FAILURE_THRESHOLD = 3;
const CRON_ERROR_MAX_LENGTH = 200;

export type SidebarStatusSeverity = "blocking" | "warning";

export type SidebarStatusSource = {
  kind: "provider" | "automation" | "approval";
  id: string;
  label: string;
};

export type SidebarStatusAction =
  | { kind: "navigate"; routeId: NavigationRouteId }
  | { kind: "openApprovals" };

export type SidebarStatusCondition = {
  id: string;
  source: SidebarStatusSource;
  severity: SidebarStatusSeverity;
  icon: IconName;
  title: string;
  action?: SidebarStatusAction;
  raisedAt: number;
};

export type SidebarStatusEventGroup = {
  signature: string;
  source: SidebarStatusSource;
  eventType: "run_failed" | "run_recovered" | "auth_reconnected";
  count: number;
  firstAt: number;
  lastAt: number;
  title: string;
  detail?: string;
  action: SidebarStatusAction;
};

export type SidebarAutomationAttention = {
  count: number;
  severity: "danger" | "warning" | null;
};

export type SidebarSystemStatus = {
  conditions: SidebarStatusCondition[];
  events: SidebarStatusEventGroup[];
  automationAttention: SidebarAutomationAttention;
};

function cronJobName(job: CronJob): string {
  return job.name?.trim() || job.id;
}

function normalizedEventMessage(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[0-9a-f]{7,64}\b/gu, "#")
    .replace(/\b(?:run|job|request)[-_: ]?[a-z0-9-]+\b/gu, "id")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds?|m|min|minutes?|h|hours?)\b/gu, "duration")
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[t ][0-9:.+-]+z?)?\b/gu, "timestamp")
    .replace(/\s+/gu, " ")
    .trim();
}

function signatureHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cronFailureEvent(job: CronJob, now: number): SidebarStatusEventGroup {
  const title = cronJobName(job);
  const error = [job.state?.lastError, job.state?.lastErrorReason]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));
  const detail = clampText(error ?? t("attention.cronErrorUnknown"), CRON_ERROR_MAX_LENGTH);
  const lastAt = Math.min(job.state?.lastRunAtMs ?? now, now);
  return {
    signature: signatureHash(`${job.id}\nrun_failed\n${normalizedEventMessage(detail)}`),
    source: { kind: "automation", id: job.id, label: title },
    eventType: "run_failed",
    count: Math.max(1, job.state?.consecutiveErrors ?? 1),
    firstAt: lastAt,
    lastAt,
    title: t("attention.automationFailedTitle", { name: title }),
    detail,
    action: { kind: "navigate", routeId: "cron" },
  };
}

export function buildSidebarSystemStatus(params: {
  cronJobs: readonly CronJob[];
  modelAuthStatus: ModelAuthStatusResult | null;
  approvalQueue: readonly ExecApprovalRequest[];
  now: number;
}): SidebarSystemStatus {
  const conditions: SidebarStatusCondition[] = [];
  const failedCron = params.cronJobs.filter(isCronJobActiveFailure);
  const repeatedlyFailingCron = failedCron.filter(
    (job) => (job.state?.consecutiveErrors ?? 1) >= REPEAT_FAILURE_THRESHOLD,
  );
  const overdueCron = params.cronJobs.filter(
    (job) =>
      job.enabled &&
      job.state?.nextRunAtMs != null &&
      params.now - job.state.nextRunAtMs > CRON_OVERDUE_GRACE_MS,
  );
  const automationIds = new Set([...failedCron, ...overdueCron].map((job) => job.id));

  if (repeatedlyFailingCron.length > 0) {
    const count = repeatedlyFailingCron.length;
    conditions.push({
      id: "automation.failing-repeatedly",
      source: { kind: "automation", id: "failing-repeatedly", label: t("attention.automations") },
      severity: "warning",
      icon: "calendarClock",
      title: t(
        count === 1
          ? "attention.automationFailedRepeatedly"
          : "attention.automationsFailedRepeatedly",
        { count: String(count) },
      ),
      action: { kind: "navigate", routeId: "cron" },
      raisedAt: Math.max(
        ...repeatedlyFailingCron.map((job) =>
          Math.min(job.state?.lastRunAtMs ?? params.now, params.now),
        ),
      ),
    });
  }

  if (overdueCron.length > 0) {
    const count = overdueCron.length;
    conditions.push({
      id: "automation.overdue",
      source: { kind: "automation", id: "overdue", label: t("attention.automations") },
      severity: "warning",
      icon: "calendarClock",
      title: t(count === 1 ? "attention.automationOverdue" : "attention.automationsOverdue", {
        count: String(count),
      }),
      action: { kind: "navigate", routeId: "cron" },
      raisedAt: Math.max(
        ...overdueCron.map((job) => Math.min(job.state?.nextRunAtMs ?? params.now, params.now)),
      ),
    });
  }

  const expiredProviders = (params.modelAuthStatus?.providers ?? [])
    .filter(isMonitoredAuthProvider)
    .filter((provider) => provider.status === "expired" || provider.status === "missing");
  if (expiredProviders.length > 0) {
    const providerNames = expiredProviders.map((provider) => provider.displayName).join(", ");
    conditions.push({
      id: `auth.expired.${expiredProviders.map((provider) => provider.provider).join(".")}`,
      source: { kind: "provider", id: "expired", label: providerNames },
      severity: "blocking",
      icon: "plug",
      title: t("attention.modelAuthExpired", { providers: providerNames }),
      action: { kind: "navigate", routeId: "model-providers" },
      raisedAt: params.now,
    });
  }

  if (params.approvalQueue.length > 0) {
    const count = params.approvalQueue.length;
    conditions.push({
      id: "approval.pending",
      source: { kind: "approval", id: "pending", label: t("attention.approvals") },
      severity: "warning",
      icon: "shieldCheck",
      title: t(count === 1 ? "attention.pendingApproval" : "attention.pendingApprovals", {
        count: String(count),
      }),
      action: { kind: "openApprovals" },
      raisedAt: params.now,
    });
  }

  conditions.sort((first, second) => {
    const severity = first.severity === second.severity ? 0 : first.severity === "blocking" ? -1 : 1;
    return severity || second.raisedAt - first.raisedAt;
  });

  return {
    conditions,
    events: failedCron.map((job) => cronFailureEvent(job, params.now)),
    automationAttention: {
      count: automationIds.size,
      severity: failedCron.length > 0 ? "danger" : overdueCron.length > 0 ? "warning" : null,
    },
  };
}
