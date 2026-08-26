import { html, nothing, type TemplateResult } from "lit";
import type { GatewayBrowserClient } from "../../api/gateway.ts";
import { ensureCustomElementDefined } from "../../app/lazy-custom-element.ts";
import { icons } from "../../components/icons.ts";
import { t } from "../../i18n/index.ts";
import { isMockBoardEnabled, type BoardViewCallbacks } from "../../lib/board/provider.ts";
import type { BoardFace, BoardVisibleChatDock } from "../../lib/board/settings.ts";
import type { BoardSnapshot, BoardTab } from "../../lib/board/types.ts";
import type { BoardWidgetFrameUrl } from "../../lib/board/view-types.ts";

export type BoardChatDockSize = {
  height: number;
};

export type WorkboardCardChipProps = {
  active: boolean;
  basePath: string;
  client: GatewayBrowserClient;
  sessionKey: string;
};

type BoardSessionSurfaceProps = {
  active: boolean;
  snapshot: BoardSnapshot;
  activeTabId: string;
  dock: BoardTab["chatDock"];
  dockSize: BoardChatDockSize;
  chat: TemplateResult;
  divider: TemplateResult;
  canMutate: boolean;
  canGrant: boolean;
  callbacks: BoardViewCallbacks;
  widgetFrameUrl: BoardWidgetFrameUrl;
  workboardCardChip?: WorkboardCardChipProps | null;
};

let boardViewLoad: Promise<unknown> | null = null;

export function ensureWorkboardCardChipElement(): Promise<void> {
  return ensureCustomElementDefined(
    "openclaw-workboard-card-chip",
    () => import("./workboard-card-chip.runtime.ts"),
  );
}

export async function ensureBoardViewElement(): Promise<boolean> {
  if (customElements.get("openclaw-board-view")) {
    return false;
  }
  boardViewLoad ??= isMockBoardEnabled()
    ? import("../../components/board-view-placeholder.ts")
    : import("../../components/board/board-view.ts");
  await boardViewLoad;
  return true;
}

type BoardViewMode = "chat" | "split" | "dashboard";

export type BoardFullscreenAction = {
  active: boolean;
  disabled: boolean;
  label: string;
  onActivate: () => void;
};

function dockLabel(dock: BoardVisibleChatDock): string {
  if (dock === "left") {
    return t("chat.board.dockLeft");
  }
  if (dock === "bottom") {
    return t("chat.board.dockBottom");
  }
  return t("chat.board.dockRight");
}

export function renderBoardViewSwitch(props: {
  hasBoard: boolean;
  face: BoardFace;
  dock: BoardTab["chatDock"];
  canChangeDock: boolean;
  fullscreenAction?: BoardFullscreenAction;
  onSelectMode: (mode: BoardViewMode) => void;
  onDockSideChange: (dock: BoardVisibleChatDock) => void;
}) {
  if (!props.hasBoard) {
    return nothing;
  }

  const mode: BoardViewMode = props.canChangeDock
    ? props.face === "chat"
      ? "chat"
      : props.dock === "hidden"
        ? "dashboard"
        : "split"
    : props.face;
  const chatActive = mode !== "dashboard";
  const dashboardActive = mode !== "chat";
  const selectToggle = (toggle: Exclude<BoardViewMode, "split">) => {
    if (!props.canChangeDock) {
      if ((toggle === "chat") === chatActive) {
        return;
      }
      props.onSelectMode(toggle);
      return;
    }
    const nextMode: BoardViewMode =
      toggle === "chat"
        ? mode === "dashboard"
          ? "split"
          : mode === "split"
            ? "dashboard"
            : "chat"
        : mode === "chat"
          ? "split"
          : mode === "split"
            ? "chat"
            : "dashboard";
    if (nextMode !== mode) {
      props.onSelectMode(nextMode);
    }
  };
  const visibleDock = props.dock === "hidden" ? null : props.dock;
  const showDockOptions = mode === "split" && props.canChangeDock && visibleDock !== null;
  const showMore = mode !== "chat" && props.fullscreenAction;

  return html`
    <div class="chat-pane__face-switch ${showMore ? "chat-pane__face-switch--more" : ""}">
      <div class="settings-segmented" role="group" aria-label=${t("chat.board.faceLabel")}>
        <button
          type="button"
          class="settings-segmented__btn ${chatActive ? "settings-segmented__btn--active" : ""}"
          aria-pressed=${String(chatActive)}
          @click=${() => selectToggle("chat")}
        >
          ${t("chat.board.chatFace")}
        </button>
        <button
          type="button"
          class="settings-segmented__btn ${dashboardActive
            ? "settings-segmented__btn--active"
            : ""}"
          aria-pressed=${String(dashboardActive)}
          @click=${() => selectToggle("dashboard")}
        >
          ${t("chat.board.dashboardFace")}
        </button>
      </div>
      ${showMore
        ? html`
            <wa-dropdown
              class="chat-pane__board-more"
              placement="bottom-end"
              @wa-select=${(event: CustomEvent<{ item: { value?: string } }>) => {
                const value = event.detail.item.value;
                if (value === "left" || value === "right" || value === "bottom") {
                  props.onDockSideChange(value);
                } else if (value === "fullscreen") {
                  props.fullscreenAction?.onActivate();
                }
              }}
            >
              <button
                slot="trigger"
                type="button"
                class="btn btn--ghost btn--icon chat-icon-btn chat-pane__board-more-trigger"
                aria-label=${t("chat.board.moreActions")}
              >
                ${icons.moreHorizontalSolid}
              </button>
              ${showDockOptions && visibleDock
                ? html`${(["left", "right", "bottom"] as const).map(
                      (candidate) => html`
                        <wa-dropdown-item
                          value=${candidate}
                          type="checkbox"
                          ?checked=${candidate === visibleDock}
                        >
                          ${dockLabel(candidate)}
                        </wa-dropdown-item>
                      `,
                    )}
                    <div class="session-menu__separator" role="separator"></div>`
                : nothing}
              <wa-dropdown-item
                value="fullscreen"
                type="checkbox"
                ?checked=${props.fullscreenAction?.active}
                ?disabled=${props.fullscreenAction?.disabled}
              >
                <span slot="icon" class="session-menu__icon" aria-hidden="true"
                  >${props.fullscreenAction?.active ? icons.minimize : icons.maximize}</span
                >
                ${props.fullscreenAction?.label}
              </wa-dropdown-item>
            </wa-dropdown>
          `
        : nothing}
    </div>
  `;
}

function renderBoardView(props: BoardSessionSurfaceProps) {
  return html`
    <div class="board-session-surface__board">
      ${props.workboardCardChip
        ? html`
            <openclaw-workboard-card-chip
              .active=${props.workboardCardChip.active}
              .basePath=${props.workboardCardChip.basePath}
              .client=${props.workboardCardChip.client}
              .sessionKey=${props.workboardCardChip.sessionKey}
            ></openclaw-workboard-card-chip>
          `
        : nothing}
      <openclaw-board-view
        .active=${props.active}
        .snapshot=${props.snapshot}
        .activeTabId=${props.activeTabId}
        .widgetFrameUrl=${props.widgetFrameUrl}
        .callbacks=${props.callbacks}
        .canMutate=${props.canMutate}
        .canGrant=${props.canGrant}
      ></openclaw-board-view>
    </div>
  `;
}

function renderChatDock(props: BoardSessionSurfaceProps) {
  return html`<div class="board-session-surface__chat" style="height: ${props.dockSize.height}px">
    ${props.chat}
  </div>`;
}

export function renderBoardSessionSurface(props: BoardSessionSurfaceProps) {
  return html`
    <div
      class="board-session-surface board-session-surface--dock-${props.dock}"
      ?hidden=${!props.active}
      ?inert=${!props.active}
    >
      ${renderBoardView(props)}
      ${props.active && props.dock === "bottom"
        ? html`${props.divider}${renderChatDock(props)}`
        : nothing}
    </div>
  `;
}
