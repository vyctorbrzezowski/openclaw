import { consume } from "@lit/context";
import { initialState, Task } from "@lit/task";
import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { GatewayBrowserClient } from "../api/gateway.ts";
import type { CronJob, ModelAuthStatusResult } from "../api/types.ts";
import type { NavigationRouteId } from "../app-navigation.ts";
import { applicationContext, type ApplicationContext } from "../app/context.ts";
import { t } from "../i18n/index.ts";
import { createInitialCronState, loadCronJobsPage } from "../lib/cron/index.ts";
import { formatRelativeTimestamp } from "../lib/format.ts";
import { loadModelAuthStatus } from "../lib/model-auth.ts";
import { OpenClawLightDomContentsElement } from "../lit/openclaw-element.ts";
import { SubscriptionsController } from "../lit/subscriptions-controller.ts";
import { icons } from "./icons.ts";
import {
  buildSidebarSystemStatus,
  type SidebarAutomationAttention,
  type SidebarStatusAction,
  type SidebarStatusCondition,
  type SidebarStatusEventGroup,
} from "./sidebar-attention-items.ts";

const VISIBILITY_REFRESH_MIN_AGE_MS = 60_000;
const IDLE_REFRESH_INTERVAL_MS = 10 * 60_000;
const RECENT_RETENTION_MS = 30 * 24 * 60 * 60_000;
const RECENT_GROUP_LIMIT = 20;

export const SIDEBAR_SYSTEM_STATUS_CHANGE_EVENT = "sidebar-system-status-change";

export type SidebarSystemStatusChangeDetail = {
  automationAttention: SidebarAutomationAttention;
};

function eventGroupKey(group: SidebarStatusEventGroup): string {
  return `${group.eventType}:${group.signature}`;
}

function sameEventGroups(
  first: readonly SidebarStatusEventGroup[],
  second: readonly SidebarStatusEventGroup[],
): boolean {
  return (
    first.length === second.length &&
    first.every((group, index) => {
      const other = second[index];
      return (
        other !== undefined &&
        eventGroupKey(group) === eventGroupKey(other) &&
        group.count === other.count &&
        group.lastAt === other.lastAt
      );
    })
  );
}

function shortDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}

class SidebarAttention extends OpenClawLightDomContentsElement {
  @consume({ context: applicationContext, subscribe: true })
  private context?: ApplicationContext;

  @state() private cronJobs: CronJob[] = [];
  @state() private modelAuthStatus: ModelAuthStatusResult | null = null;
  @state() private recentGroups: SidebarStatusEventGroup[] = [];
  @state() private panelOpen = false;
  @state() private panelPosition = { left: 8, bottom: 8 };
  @state() private blockingAnnouncement = "";

  @property({ attribute: false }) onNavigate?: (routeId: NavigationRouteId) => void;
  @property({ attribute: false }) onOpenApprovals?: () => void;

  private loadedClient: GatewayBrowserClient | null = null;
  private loadedGateway: ApplicationContext["gateway"] | null = null;
  private loadedAtMs = 0;
  private idleRefreshTimer: ReturnType<typeof globalThis.setInterval> | null = null;
  private previousConditions = new Map<string, SidebarStatusCondition>();
  private statusInitialized = false;
  private lastAutomationSummary = "";
  private panelTrigger: HTMLElement | null = null;
  private allowEmptyPanel = false;
  private clearedEvents = new Map<string, number>();

  private readonly loadTask = new Task(this, {
    autoRun: false,
    args: () =>
      [
        null as ApplicationContext["gateway"] | null,
        null as GatewayBrowserClient | null,
        true as boolean,
      ] as const,
    task: async ([gateway, client, refreshModelAuth], { signal }) => {
      if (!gateway || !client) {
        return initialState;
      }
      const cron = createInitialCronState({ client, connected: true });
      const loads: Promise<unknown>[] = [
        loadCronJobsPage(cron).then(() => {
          if (!signal.aborted) {
            this.cronJobs = cron.cronJobs;
          }
        }),
      ];
      if (refreshModelAuth) {
        loads.push(
          loadModelAuthStatus(client, {
            signal,
            ...(gateway.snapshot.assistantAgentId
              ? { agentId: gateway.snapshot.assistantAgentId }
              : {}),
          })
            .catch(() => null)
            .then((modelAuthStatus) => {
              if (!signal.aborted) {
                this.modelAuthStatus = modelAuthStatus;
              }
            }),
        );
      }
      await Promise.allSettled(loads);
      return true;
    },
    onComplete: () => {
      this.loadedAtMs = Date.now();
    },
  });

  private readonly subscriptions = new SubscriptionsController(this)
    .effect(
      () => this.context?.gateway,
      (gateway) => {
        this.synchronize(gateway);
        return gateway.subscribe(() => this.synchronize(gateway));
      },
    )
    .effect(
      () => this.context?.gateway,
      (gateway) =>
        gateway.subscribeEvents((event) => {
          if (this.context?.gateway !== gateway || event.event !== "cron") {
            return;
          }
          this.loadedClient = null;
          this.synchronize(gateway, { refreshModelAuth: false });
        }),
    )
    .watch(
      () => this.context?.overlays,
      (overlays, notify) => overlays.subscribe(() => notify()),
    );

  private readonly refreshIfStale = () => {
    if (document.visibilityState !== "visible") {
      return;
    }
    const gateway = this.context?.gateway;
    if (gateway && Date.now() - this.loadedAtMs >= VISIBILITY_REFRESH_MIN_AGE_MS) {
      this.loadedClient = null;
      this.synchronize(gateway);
    }
  };

  private readonly closeOnOutsidePointer = (event: PointerEvent) => {
    if (!this.panelOpen || event.composedPath().includes(this)) {
      return;
    }
    this.closePanel(false);
  };

  private readonly closeOnRouteChange = () => this.closePanel(false);

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.refreshIfStale);
    globalThis.addEventListener("popstate", this.closeOnRouteChange);
    this.idleRefreshTimer = globalThis.setInterval(this.refreshIfStale, IDLE_REFRESH_INTERVAL_MS);
  }

  override disconnectedCallback() {
    document.removeEventListener("visibilitychange", this.refreshIfStale);
    document.removeEventListener("pointerdown", this.closeOnOutsidePointer, true);
    globalThis.removeEventListener("popstate", this.closeOnRouteChange);
    if (this.idleRefreshTimer !== null) {
      globalThis.clearInterval(this.idleRefreshTimer);
      this.idleRefreshTimer = null;
    }
    this.subscriptions.clear();
    void this.loadTask.run([null, null, false]);
    this.loadedClient = null;
    this.loadedGateway = null;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.reconcileStatus();
  }

  private synchronize(
    gateway: ApplicationContext["gateway"],
    options: { refreshModelAuth?: boolean } = {},
  ) {
    const snapshot = gateway.snapshot;
    if (snapshot.phase !== "connected" || !snapshot.client) {
      void this.loadTask.run([null, null, false]);
      this.loadedClient = null;
      this.loadedGateway = null;
      this.cronJobs = [];
      this.modelAuthStatus = null;
      return;
    }
    if (gateway === this.loadedGateway && snapshot.client === this.loadedClient) {
      return;
    }
    this.loadedGateway = gateway;
    this.loadedClient = snapshot.client;
    void this.loadTask.run([gateway, snapshot.client, options.refreshModelAuth !== false]);
  }

  private currentStatus() {
    return buildSidebarSystemStatus({
      cronJobs: this.cronJobs,
      modelAuthStatus: this.modelAuthStatus,
      approvalQueue: this.context?.overlays.snapshot.approvalQueue ?? [],
      now: Date.now(),
    });
  }

  private recoveryEvent(condition: SidebarStatusCondition, now: number): SidebarStatusEventGroup | null {
    if (!condition.action || condition.source.kind === "approval") {
      return null;
    }
    const auth = condition.source.kind === "provider";
    return {
      signature: `${condition.id}:${now}`,
      source: condition.source,
      eventType: auth ? "auth_reconnected" : "run_recovered",
      count: 1,
      firstAt: now,
      lastAt: now,
      title: auth
        ? t("attention.authReconnected", { provider: condition.source.label })
        : t("attention.automationRecovered", { name: condition.source.label }),
      action: condition.action,
    };
  }

  private reconcileStatus() {
    if (this.context?.gateway.snapshot.phase !== "connected") {
      return;
    }
    const status = this.currentStatus();
    const now = Date.now();
    const nextConditions = new Map(status.conditions.map((condition) => [condition.id, condition]));
    const recovered: SidebarStatusEventGroup[] = [];

    if (this.statusInitialized) {
      for (const [id, condition] of this.previousConditions) {
        if (!nextConditions.has(id)) {
          const event = this.recoveryEvent(condition, now);
          if (event) {
            recovered.push(event);
          }
        }
      }
      const newBlocking = status.conditions.find(
        (condition) =>
          condition.severity === "blocking" && !this.previousConditions.has(condition.id),
      );
      if (newBlocking && this.blockingAnnouncement !== newBlocking.title) {
        this.blockingAnnouncement = newBlocking.title;
      }
    }
    this.statusInitialized = true;
    this.previousConditions = nextConditions;

    const merged = new Map(this.recentGroups.map((group) => [eventGroupKey(group), group]));
    for (const group of [...status.events, ...recovered]) {
      const key = eventGroupKey(group);
      if ((this.clearedEvents.get(key) ?? -Infinity) >= group.lastAt) {
        continue;
      }
      merged.set(key, group);
    }
    const recentGroups = [...merged.values()]
      .filter((group) => now - group.lastAt <= RECENT_RETENTION_MS)
      .toSorted((first, second) => second.lastAt - first.lastAt)
      .slice(0, RECENT_GROUP_LIMIT);
    if (!sameEventGroups(this.recentGroups, recentGroups)) {
      this.recentGroups = recentGroups;
    }

    const summary = JSON.stringify(status.automationAttention);
    if (summary !== this.lastAutomationSummary) {
      this.lastAutomationSummary = summary;
      this.dispatchEvent(
        new CustomEvent<SidebarSystemStatusChangeDetail>(SIDEBAR_SYSTEM_STATUS_CHANGE_EVENT, {
          bubbles: true,
          composed: true,
          detail: { automationAttention: status.automationAttention },
        }),
      );
    }

    if (
      this.panelOpen &&
      !this.allowEmptyPanel &&
      status.conditions.length === 0 &&
      recentGroups.length === 0
    ) {
      this.closePanel(false);
    }
  }

  openPanel(trigger?: HTMLElement) {
    const anchor =
      trigger ??
      this.querySelector<HTMLElement>(".sidebar-status-strip") ??
      this.closest(".sidebar")?.querySelector<HTMLElement>(".sidebar-identity-card") ??
      null;
    const rect = anchor?.getBoundingClientRect();
    const width = Math.min(304, globalThis.innerWidth - 16);
    this.panelTrigger = anchor;
    this.allowEmptyPanel = Boolean(anchor?.matches(".sidebar-identity-card"));
    this.panelPosition = {
      left: Math.max(8, Math.min(rect?.left ?? 8, globalThis.innerWidth - width - 8)),
      bottom: Math.max(8, globalThis.innerHeight - (rect?.top ?? globalThis.innerHeight) + 6),
    };
    this.panelOpen = true;
    document.addEventListener("pointerdown", this.closeOnOutsidePointer, true);
    void this.updateComplete.then(() => {
      this.querySelector<HTMLElement>(".sidebar-status-panel [data-autofocus]")?.focus();
    });
  }

  private closePanel(restoreFocus: boolean) {
    if (!this.panelOpen) {
      return;
    }
    const trigger = this.panelTrigger;
    this.panelOpen = false;
    this.panelTrigger = null;
    this.allowEmptyPanel = false;
    document.removeEventListener("pointerdown", this.closeOnOutsidePointer, true);
    if (restoreFocus) {
      void this.updateComplete.then(() => trigger?.focus());
    }
  }

  private runAction(action: SidebarStatusAction) {
    this.closePanel(false);
    if (action.kind === "openApprovals") {
      this.onOpenApprovals?.();
      return;
    }
    this.onNavigate?.(action.routeId);
  }

  private clearEvent(group: SidebarStatusEventGroup) {
    this.clearedEvents.set(eventGroupKey(group), group.lastAt);
    this.recentGroups = this.recentGroups.filter((candidate) => candidate !== group);
  }

  private clearAllEvents() {
    for (const group of this.recentGroups) {
      this.clearedEvents.set(eventGroupKey(group), group.lastAt);
    }
    this.recentGroups = [];
  }

  private handlePanelKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closePanel(true);
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const panel = event.currentTarget as HTMLElement;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]'),
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  private renderCondition(condition: SidebarStatusCondition, autofocus: boolean) {
    return html`
      <button
        type="button"
        class="sidebar-status-condition sidebar-status-condition--${condition.severity}"
        data-autofocus=${autofocus ? "true" : nothing}
        @click=${() => condition.action && this.runAction(condition.action)}
      >
        <span class="sidebar-status-condition__icon" aria-hidden="true">${icons[condition.icon]}</span>
        <span class="sidebar-status-condition__title" title=${condition.title}>
          <span class="sidebar-status-condition__entity">${condition.entityLabel}</span>
          <span class="sidebar-status-condition__separator" aria-hidden="true">·</span>
          <span class="sidebar-status-condition__state">${condition.stateLabel}</span>
        </span>
        ${condition.action
          ? condition.source.kind === "provider"
            ? html`<span class="sidebar-status-condition__action">${t("attention.reconnect")}</span>`
            : html`<span class="sidebar-status-condition__chevron" aria-hidden="true"
                >${icons.chevronRight}</span
              >`
          : nothing}
      </button>
    `;
  }

  private renderEvent(group: SidebarStatusEventGroup, autofocus: boolean) {
    const relative = formatRelativeTimestamp(Math.min(group.lastAt, Date.now()));
    const count = group.count > 99 ? "99+×" : `${group.count}×`;
    const meta =
      group.count > 1
        ? `${count} · ${t("attention.first", { date: shortDate(group.firstAt) })} · ${t(
            "attention.latest",
            { time: relative },
          )}`
        : relative;
    return html`
      <div class="sidebar-status-event">
        <button
          type="button"
          class="sidebar-status-event__open"
          data-autofocus=${autofocus ? "true" : nothing}
          @click=${() => this.runAction(group.action)}
        >
          <span class="sidebar-status-event__title" title=${group.title}>${group.title}</span>
          <span class="sidebar-status-event__meta">${meta}</span>
        </button>
        <button
          type="button"
          class="sidebar-status-event__clear"
          aria-label=${`${t("attention.clear")}: ${group.title}`}
          @click=${() => this.clearEvent(group)}
        >
          ${icons.x}
        </button>
      </div>
    `;
  }

  override render() {
    if (this.context?.gateway.snapshot.phase !== "connected") {
      return nothing;
    }
    const status = this.currentStatus();
    const conditions = status.conditions;
    const blocking = conditions.filter((condition) => condition.severity === "blocking").length;
    const issueLabel = t(conditions.length === 1 ? "attention.issue" : "attention.issues", {
      count: String(conditions.length),
    });
    const stripLabel = conditions.length === 1 ? conditions[0]?.title : issueLabel;
    const maxSeverity = blocking > 0 ? "blocking" : "warning";
    const ariaLabel = t("attention.systemStatusAria", {
      issues: issueLabel,
      blocking: String(blocking),
    });
    const showEmptyPanel = this.panelOpen && conditions.length === 0 && this.recentGroups.length === 0;
    return html`
      <span class="sr-only" role="status" aria-live="polite">${this.blockingAnnouncement}</span>
      ${conditions.length > 0
        ? html`<button
            type="button"
            class="sidebar-status-strip sidebar-status-strip--${maxSeverity}"
            aria-expanded=${String(this.panelOpen)}
            aria-haspopup="dialog"
            aria-label=${ariaLabel}
            @click=${(event: MouseEvent) =>
              this.panelOpen
                ? this.closePanel(true)
                : this.openPanel(event.currentTarget as HTMLElement)}
          >
            <span class="sidebar-status-strip__dot" aria-hidden="true"></span>
            <span class="sidebar-status-strip__label" title=${stripLabel ?? ""}
              >${stripLabel}</span
            >
            <span class="sidebar-status-strip__more" aria-hidden="true"
              >${icons.moreHorizontal}</span
            >
          </button>`
        : nothing}
      ${this.panelOpen
        ? html`<div
            class="sidebar-status-panel"
            role="dialog"
            aria-label=${t("attention.systemStatus")}
            style=${`left:${this.panelPosition.left}px;bottom:${this.panelPosition.bottom}px`}
            @keydown=${this.handlePanelKeydown}
          >
            ${conditions.length > 0
              ? html`<section class="sidebar-status-panel__section">
                  <h2 class="sidebar-status-panel__heading">${t("attention.needsAttention")}</h2>
                  <div class="sidebar-status-panel__conditions">
                    ${conditions.map((condition, index) =>
                      this.renderCondition(condition, index === 0),
                    )}
                  </div>
                </section>`
              : nothing}
            ${this.recentGroups.length > 0
              ? html`<section class="sidebar-status-panel__section sidebar-status-panel__section--recent">
                  <div class="sidebar-status-panel__section-head">
                    <h2 class="sidebar-status-panel__heading">${t("attention.recent")}</h2>
                    <button
                      type="button"
                      class="sidebar-status-panel__clear-all"
                      data-autofocus=${conditions.length === 0 ? "true" : nothing}
                      @click=${this.clearAllEvents}
                    >
                      ${t("attention.clearAll")}
                    </button>
                  </div>
                  <div class="sidebar-status-panel__events">
                    ${this.recentGroups.map((group, index) =>
                      this.renderEvent(group, conditions.length === 0 && index === 0),
                    )}
                  </div>
                </section>`
              : nothing}
            ${showEmptyPanel
              ? html`<p class="sidebar-status-panel__empty" tabindex="0" data-autofocus="true">
                  ${t("attention.noRecentActivity")}
                </p>`
              : nothing}
          </div>`
        : nothing}
    `;
  }
}

if (!customElements.get("openclaw-sidebar-attention")) {
  customElements.define("openclaw-sidebar-attention", SidebarAttention);
}
