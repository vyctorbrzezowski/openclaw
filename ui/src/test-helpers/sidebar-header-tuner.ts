import type { ControlUiEnvironment } from "../../../src/gateway/control-ui-bootstrap-contract.js";
import { applyControlUiPresentation } from "../app/control-ui-environment-presentation.runtime.ts";
import { deriveAvatarInitial } from "../lib/avatar.ts";

type AvatarMode = "emoji" | "image" | "initial" | "monogram";
type NameMode = "absurd" | "emoji" | "long" | "short";
type TuningKey =
  | "collapseSearchGap"
  | "searchNewThreadGap"
  | "actionSize"
  | "avatarNameGap"
  | "avatarSize"
  | "environmentPillFontSize"
  | "agentPaddingBlock"
  | "agentPaddingInline"
  | "headerPaddingBottom"
  | "headerPaddingLeft"
  | "headerPaddingRight"
  | "headerPaddingTop"
  | "nameFontSize"
  | "sidebarWidth";

type SidebarAgentCardElement = HTMLElement & {
  agentName: string;
  avatarAuthReady: boolean;
  avatarText: string;
  avatarUrl: string | null;
  environment: ControlUiEnvironment | null;
  menuOpen: boolean;
  menuUnread: boolean;
};

const names: Record<NameMode, string> = {
  short: "Molty",
  long: "Molty, assistente de pesquisa",
  absurd:
    "Molty, assistente extraordinariamente especializado em pesquisa, manutenção e coordenação",
  emoji: "Molty 🦞 da Manutenção",
};

const solidRedAvatarUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23ef4444' d='M0 0h24v24H0z'/%3E%3C/svg%3E";

const environmentColors = [
  "teal",
  "amber",
  "purple",
  "coral",
  "pink",
  "blue",
  "green",
  "red",
  "gray",
] as const satisfies readonly ControlUiEnvironment["color"][];

const nativeMacTuner =
  (window as Window & { __OPENCLAW_NATIVE_WEB_CHROME__?: boolean })
    .__OPENCLAW_NATIVE_WEB_CHROME__ === true ||
  document.documentElement.matches(
    ".openclaw-native-macos, .openclaw-native-nav, .openclaw-native-web-chrome",
  );

const state: {
  agentStretch: boolean;
  avatar: AvatarMode;
  environmentColor: ControlUiEnvironment["color"] | null;
  fullHeaderSurface: boolean;
  guides: boolean;
  menuOpen: boolean;
  name: NameMode;
  plusBorder: boolean;
  unread: boolean;
} = {
  agentStretch: false,
  avatar: "initial",
  environmentColor: null,
  fullHeaderSurface: false,
  guides: false,
  menuOpen: false,
  name: "short",
  plusBorder: !nativeMacTuner,
  unread: false,
};

const environmentByColor = new Map<
  ControlUiEnvironment["color"],
  ControlUiEnvironment
>(environmentColors.map((color) => [color, { label: "Development", color }]));

const tuningDefinitions: ReadonlyArray<{
  defaultValue: number;
  key: TuningKey;
  label: string;
  max: number;
  min: number;
}> = [
  {
    key: "collapseSearchGap",
    label: "Collapse ↔ busca",
    min: 0,
    max: 12,
    defaultValue: 0,
  },
  {
    key: "searchNewThreadGap",
    label: "Busca ↔ +",
    min: 0,
    max: 12,
    defaultValue: 5,
  },
  { key: "avatarNameGap", label: "Avatar ↔ nome", min: 0, max: 20, defaultValue: 6 },
  { key: "sidebarWidth", label: "Largura da sidebar", min: 240, max: 400, defaultValue: 258 },
  { key: "headerPaddingTop", label: "Header · topo", min: 0, max: 24, defaultValue: 0 },
  { key: "headerPaddingRight", label: "Header · direita", min: 0, max: 32, defaultValue: 2 },
  { key: "headerPaddingBottom", label: "Header · inferior", min: 0, max: 32, defaultValue: 10 },
  { key: "headerPaddingLeft", label: "Header · esquerda", min: 0, max: 32, defaultValue: 0 },
  { key: "agentPaddingBlock", label: "Agente · vertical", min: 0, max: 20, defaultValue: 5 },
  { key: "agentPaddingInline", label: "Agente · horizontal", min: 0, max: 24, defaultValue: 6 },
  {
    key: "avatarSize",
    label: "Avatar",
    min: 24,
    max: 52,
    defaultValue: nativeMacTuner ? 32 : 28,
  },
  { key: "nameFontSize", label: "Fonte do nome", min: 11, max: 22, defaultValue: 14 },
  {
    key: "environmentPillFontSize",
    label: "Fonte da pill",
    min: 8,
    max: 16,
    defaultValue: 10,
  },
  { key: "actionSize", label: "Botões de ícone", min: 24, max: 44, defaultValue: 28 },
];

const tuningDefaults: Record<TuningKey, number> = Object.fromEntries(
  tuningDefinitions.map((definition) => [definition.key, definition.defaultValue]),
) as Record<TuningKey, number>;
const tuningValues: Record<TuningKey, number> = { ...tuningDefaults };
const tuningCssProperties: Partial<Record<TuningKey, string>> = {
  agentPaddingBlock: "--sidebar-header-tuner-agent-padding-block",
  agentPaddingInline: "--sidebar-header-tuner-agent-padding-inline",
  collapseSearchGap: "--sidebar-header-tuner-collapse-search-gap",
  searchNewThreadGap: "--sidebar-header-tuner-search-new-thread-gap",
  actionSize: "--sidebar-header-tuner-action-size",
  avatarNameGap: "--sidebar-header-tuner-avatar-name-gap",
  avatarSize: "--sidebar-header-tuner-avatar-size",
  environmentPillFontSize: "--sidebar-header-tuner-environment-pill-font-size",
  headerPaddingBottom: "--sidebar-header-tuner-padding-bottom",
  headerPaddingLeft: "--sidebar-header-tuner-padding-left",
  headerPaddingRight: "--sidebar-header-tuner-padding-right",
  headerPaddingTop: "--sidebar-header-tuner-padding-top",
  nameFontSize: "--sidebar-header-tuner-name-font-size",
};

function setProperty<K extends keyof SidebarAgentCardElement>(
  card: SidebarAgentCardElement,
  key: K,
  value: SidebarAgentCardElement[K],
) {
  if (card[key] !== value) {
    card[key] = value;
  }
}

function avatarText(name: string): string {
  if (state.avatar === "emoji") {
    return "🦞";
  }
  if (state.avatar === "monogram") {
    return "OC";
  }
  return deriveAvatarInitial(name) || "?";
}

function syncPressedState(panel: HTMLElement) {
  for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-name]")) {
    button.setAttribute("aria-pressed", String(button.dataset.name === state.name));
  }
  for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-avatar]")) {
    button.setAttribute("aria-pressed", String(button.dataset.avatar === state.avatar));
  }
  for (const input of panel.querySelectorAll<HTMLInputElement>("input[data-tuning]")) {
    const key = input.dataset.tuning as TuningKey;
    input.value = String(tuningValues[key]);
    const output = panel.querySelector<HTMLOutputElement>(`[data-tuning-value="${key}"]`);
    if (output) {
      output.textContent = `${tuningValues[key]}px`;
    }
  }
}

function installTuner() {
  if (document.querySelector("[data-sidebar-header-tuner]")) {
    return;
  }

  const style = document.createElement("style");
  style.dataset.sidebarHeaderTuner = "";
  style.textContent = `
    .sidebar-header-tuner {
      position: fixed;
      z-index: 1200;
      top: 16px;
      right: 16px;
      box-sizing: border-box;
      width: min(356px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      padding: 14px;
      border: 1px solid var(--border-strong);
      border-radius: 14px;
      background: color-mix(in srgb, var(--card) 96%, transparent);
      color: var(--text);
      box-shadow: var(--shadow-lg);
      font: 12px/1.4 var(--font-sans);
      backdrop-filter: blur(16px);
      overflow: auto;
    }
    .sidebar-header-tuner * { box-sizing: border-box; }
    .sidebar-header-tuner__eyebrow {
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .sidebar-header-tuner h2 {
      margin: 3px 0 2px;
      color: var(--text-strong);
      font-size: 16px;
      letter-spacing: -.02em;
    }
    .sidebar-header-tuner__summary { margin: 0; color: var(--muted); }
    .sidebar-header-tuner fieldset {
      min-width: 0;
      margin: 12px 0 0;
      padding: 0;
      border: 0;
    }
    .sidebar-header-tuner legend {
      margin-bottom: 6px;
      color: var(--text-strong);
      font-size: 11px;
      font-weight: 650;
    }
    .sidebar-header-tuner__choices { display: flex; flex-wrap: wrap; gap: 5px; }
    .sidebar-header-tuner__choices button {
      min-height: 28px;
      padding: 0 9px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      color: var(--muted);
      font: inherit;
      cursor: default;
    }
    .sidebar-header-tuner__choices button:hover { background: var(--bg-hover); }
    .sidebar-header-tuner__choices button[aria-pressed="true"] {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      background: color-mix(in srgb, var(--accent) 10%, var(--panel));
      color: var(--text-strong);
    }
    .sidebar-header-tuner__row {
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .sidebar-header-tuner__row label { color: var(--muted); }
    .sidebar-header-tuner select {
      width: 100%;
      min-height: 30px;
      padding: 0 8px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      color: var(--text);
      font: inherit;
    }
    .sidebar-header-tuner__checks {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      margin-top: 10px;
    }
    .sidebar-header-tuner__checks label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
    }
    .sidebar-header-tuner__checks input { accent-color: var(--accent); }
    .sidebar-header-tuner__tuning {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
    }
    .sidebar-header-tuner__tuning-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 7px;
    }
    .sidebar-header-tuner__tuning-head strong {
      color: var(--text-strong);
      font-size: 11px;
    }
    .sidebar-header-tuner__reset {
      min-height: 26px;
      padding: 0 8px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--panel);
      color: var(--muted);
      font: inherit;
      cursor: default;
    }
    .sidebar-header-tuner__reset:hover { background: var(--bg-hover); color: var(--text); }
    .sidebar-header-tuner__sliders { display: grid; gap: 6px; }
    .sidebar-header-tuner__slider {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr) 39px;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }
    .sidebar-header-tuner__slider-label {
      display: grid;
      color: var(--text);
      line-height: 1.15;
    }
    .sidebar-header-tuner__slider-label small {
      color: var(--muted);
      font-size: 9px;
    }
    .sidebar-header-tuner__slider input {
      width: 100%;
      min-width: 0;
      margin: 0;
      accent-color: var(--accent);
    }
    .sidebar-header-tuner__slider input:disabled { opacity: .38; }
    .sidebar-header-tuner__slider output {
      color: var(--text-strong);
      font: 10px var(--font-mono);
      text-align: right;
    }
    .sidebar-header-tuner__readout {
      display: block;
      margin-top: 12px;
      padding: 8px 9px;
      border-radius: 8px;
      background: var(--bg-muted);
      color: var(--muted);
      font: 10px/1.45 var(--font-mono);
      white-space: pre-wrap;
    }
    .sidebar-header-tuner__truth {
      display: grid;
      gap: 5px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      color: var(--muted);
    }
    .sidebar-header-tuner__truth strong { color: var(--text); font-weight: 650; }
    openclaw-app-sidebar .sidebar-brand {
      --shell-chrome-control-size: var(--sidebar-header-tuner-action-size, 29px);
      padding: var(--sidebar-header-tuner-padding-top, 0px)
        var(--sidebar-header-tuner-padding-right, 4px)
        var(--sidebar-header-tuner-padding-bottom, 8px)
        var(--sidebar-header-tuner-padding-left, 0px);
    }
    openclaw-app-sidebar .sidebar-brand__actions {
      gap: 0;
    }
    openclaw-app-sidebar .sidebar-brand__search {
      margin-inline-start: var(--sidebar-header-tuner-collapse-search-gap, 0px);
    }
    openclaw-app-sidebar .sidebar-brand__new-thread {
      margin-inline-start: var(--sidebar-header-tuner-search-new-thread-gap, 5px);
      box-shadow: none;
    }
    openclaw-app-sidebar .sidebar-brand__new-thread:focus-visible {
      box-shadow: var(--focus-ring);
    }
    :root[data-sidebar-header-tuner-plus-border="off"]
      openclaw-app-sidebar .sidebar-brand__new-thread {
      border-color: transparent;
      box-shadow: none;
    }
    :root[data-sidebar-header-tuner-agent-stretch="on"]
      openclaw-app-sidebar .sidebar-agent-card {
      width: 100%;
    }
    :root[data-sidebar-header-tuner-full-surface="on"]
      openclaw-app-sidebar .sidebar-brand {
      position: relative;
      isolation: isolate;
    }
    :root[data-sidebar-header-tuner-full-surface="on"]
      openclaw-app-sidebar .sidebar-brand::before {
      content: "";
      position: absolute;
      z-index: -1;
      inset: 0 0 var(--sidebar-header-tuner-padding-bottom, 8px);
      border-radius: var(--radius-md);
      pointer-events: none;
    }
    :root[data-sidebar-header-tuner-full-surface="on"]
      openclaw-app-sidebar .sidebar-brand:has(.sidebar-agent-card__main:hover)::before,
    :root[data-sidebar-header-tuner-full-surface="on"]
      openclaw-app-sidebar .sidebar-brand:has(.sidebar-agent-card__main:focus-visible)::before,
    :root[data-sidebar-header-tuner-full-surface="on"]
      openclaw-app-sidebar .sidebar-brand:has(.sidebar-agent-card--open)::before {
      background: color-mix(in srgb, var(--bg-hover) 84%, transparent);
    }
    :root[data-sidebar-header-tuner-full-surface="on"]
      openclaw-app-sidebar .sidebar-brand .sidebar-agent-card__main {
      background: transparent;
    }
    :root[data-sidebar-header-tuner-guides="on"]
      openclaw-app-sidebar .sidebar-brand {
      outline: 1px solid var(--accent);
      outline-offset: -1px;
    }
    :root[data-sidebar-header-tuner-guides="on"]
      openclaw-app-sidebar .sidebar-agent-card__main {
      outline: 1px solid var(--warn);
      outline-offset: -1px;
    }
    :root[data-sidebar-header-tuner-guides="on"]
      openclaw-app-sidebar .nav-item--active {
      outline: 1px solid var(--ok);
      outline-offset: -1px;
    }
    openclaw-app-sidebar .sidebar-agent-card__main {
      gap: var(--sidebar-header-tuner-avatar-name-gap, 9px);
      padding: var(--sidebar-header-tuner-agent-padding-block, 4px)
        var(--sidebar-header-tuner-agent-padding-inline, 1px);
    }
    openclaw-app-sidebar .sidebar-agent-card__avatar {
      width: var(--sidebar-header-tuner-avatar-size, 28px);
      height: var(--sidebar-header-tuner-avatar-size, 28px);
    }
    openclaw-app-sidebar .sidebar-agent-card__name {
      font-size: var(--sidebar-header-tuner-name-font-size, 14px);
    }
    openclaw-app-sidebar .sidebar-brand .control-ui-environment-pill {
      font-size: var(--sidebar-header-tuner-environment-pill-font-size, 10px);
    }
  `;
  document.head.append(style);

  const panel = document.createElement("aside");
  panel.className = "sidebar-header-tuner";
  panel.dataset.sidebarHeaderTuner = "";
  panel.setAttribute("aria-label", "Sidebar header tuner");
  panel.innerHTML = `
    <div class="sidebar-header-tuner__eyebrow">Mock-only · componente real</div>
    <h2>Sidebar header tuner</h2>
    <p class="sidebar-header-tuner__summary">Estresse avatar, nome e indicadores junto dos três controles reais.</p>
    <fieldset>
      <legend>Nome do agente</legend>
      <div class="sidebar-header-tuner__choices">
        <button type="button" data-name="short">Curto</button>
        <button type="button" data-name="long">Longo</button>
        <button type="button" data-name="absurd">Absurdo</button>
        <button type="button" data-name="emoji">Com emoji</button>
      </div>
    </fieldset>
    <fieldset>
      <legend>Conteúdo do avatar</legend>
      <div class="sidebar-header-tuner__choices">
        <button type="button" data-avatar="initial">Inicial</button>
        <button type="button" data-avatar="emoji">Emoji</button>
        <button type="button" data-avatar="monogram">Texto curto</button>
        <button type="button" data-avatar="image">Imagem</button>
      </div>
    </fieldset>
    <div class="sidebar-header-tuner__row">
      <label for="sidebar-header-tuner-environment">Ambiente</label>
      <select id="sidebar-header-tuner-environment">
        <option value="">Nenhum</option>
        ${environmentColors.map((color) => `<option value="${color}">Development · ${color}</option>`).join("")}
      </select>
    </div>
    <div class="sidebar-header-tuner__checks">
      <label><input type="checkbox" data-indicator="unread"> Não lido em outro agente</label>
      <label><input type="checkbox" data-indicator="menu"> Menu aberto</label>
      <label><input type="checkbox" data-plus-border ${state.plusBorder ? "checked" : ""}> Borda do +</label>
      <label><input type="checkbox" data-agent-stretch> Agente ocupa a largura disponível</label>
      <label><input type="checkbox" data-full-header-surface> Fundo ativo ocupa o header inteiro</label>
      <label><input type="checkbox" data-width-guides> Guias de largura</label>
    </div>
    <div class="sidebar-header-tuner__choices">
      <button type="button" data-preset="narrow-development">Nome longo · Development · não lido</button>
    </div>
    <section class="sidebar-header-tuner__tuning" aria-label="Ajustes em pixels">
      <div class="sidebar-header-tuner__tuning-head">
        <strong>Espaçamento e tamanho</strong>
        <button type="button" class="sidebar-header-tuner__reset" data-reset-tunings>Reset defaults</button>
      </div>
      <div class="sidebar-header-tuner__sliders">
        ${tuningDefinitions
          .map(
            (definition) => `
              <label class="sidebar-header-tuner__slider">
                <span class="sidebar-header-tuner__slider-label">${definition.label}<small>default ${definition.defaultValue}px</small></span>
                <input type="range" min="${definition.min}" max="${definition.max}" step="1" value="${definition.defaultValue}" data-tuning="${definition.key}">
                <output data-tuning-value="${definition.key}">${definition.defaultValue}px</output>
              </label>`,
          )
          .join("")}
      </div>
    </section>
    <output class="sidebar-header-tuner__readout"></output>
    <div class="sidebar-header-tuner__truth">
      <div><strong>Status de execução:</strong> não aparece mais neste header.</div>
      <div><strong>Aprovação pendente:</strong> não aparece neste header; fica em Home/linhas de sessão.</div>
      <div><strong>Vizinhos:</strong> colapsar, busca e + continuam sendo os controles reais.</div>
    </div>
  `;
  document.body.append(panel);

  const readout = panel.querySelector<HTMLOutputElement>(".sidebar-header-tuner__readout")!;
  const environmentSelect = panel.querySelector<HTMLSelectElement>("select")!;
  const unreadInput = panel.querySelector<HTMLInputElement>('[data-indicator="unread"]')!;
  const menuInput = panel.querySelector<HTMLInputElement>('[data-indicator="menu"]')!;
  const plusBorderInput = panel.querySelector<HTMLInputElement>("[data-plus-border]")!;
  const agentStretchInput = panel.querySelector<HTMLInputElement>("[data-agent-stretch]")!;
  const fullHeaderSurfaceInput =
    panel.querySelector<HTMLInputElement>("[data-full-header-surface]")!;
  const guidesInput = panel.querySelector<HTMLInputElement>("[data-width-guides]")!;

  let frame = 0;
  const apply = () => {
    frame = 0;
    const card = document.querySelector<SidebarAgentCardElement>(
      "openclaw-app-sidebar openclaw-sidebar-agent-card",
    );
    const name = names[state.name];
    const environment = state.environmentColor
      ? environmentByColor.get(state.environmentColor) ?? null
      : null;
    if (card) {
      setProperty(card, "agentName", name);
      setProperty(card, "avatarAuthReady", true);
      setProperty(card, "avatarText", avatarText(name));
      setProperty(card, "avatarUrl", state.avatar === "image" ? solidRedAvatarUrl : null);
      if (
        card.environment?.color !== environment?.color ||
        card.environment?.label !== environment?.label
      ) {
        card.environment = environment;
      }
      setProperty(card, "menuUnread", state.unread);
      setProperty(card, "menuOpen", state.menuOpen);
    }
    const rootEnvironment = document.documentElement.getAttribute("data-openclaw-environment");
    const expectedEnvironment = environment ? JSON.stringify(environment) : null;
    if (rootEnvironment !== expectedEnvironment) {
      applyControlUiPresentation({ environment });
    }
    for (const [key, property] of Object.entries(tuningCssProperties) as Array<
      [TuningKey, string]
    >) {
      document.documentElement.style.setProperty(property, `${tuningValues[key]}px`);
    }
    document
      .querySelector<HTMLElement>(".shell")
      ?.style.setProperty("--shell-nav-expanded-width", `${tuningValues.sidebarWidth}px`);
    document.documentElement.setAttribute(
      "data-sidebar-header-tuner-plus-border",
      state.plusBorder ? "on" : "off",
    );
    document.documentElement.setAttribute(
      "data-sidebar-header-tuner-agent-stretch",
      state.agentStretch ? "on" : "off",
    );
    document.documentElement.setAttribute(
      "data-sidebar-header-tuner-full-surface",
      state.fullHeaderSurface ? "on" : "off",
    );
    document.documentElement.setAttribute(
      "data-sidebar-header-tuner-guides",
      state.guides ? "on" : "off",
    );
    const pillFontInput = panel.querySelector<HTMLInputElement>(
      '[data-tuning="environmentPillFontSize"]',
    );
    if (pillFontInput) {
      pillFontInput.disabled = !environment;
      pillFontInput.title = environment ? "" : "Escolha um ambiente para exibir a pill";
    }
    const brandWidth = document
      .querySelector<HTMLElement>("openclaw-app-sidebar .sidebar-brand")
      ?.getBoundingClientRect().width;
    const agentWidth = card
      ?.querySelector<HTMLElement>(".sidebar-agent-card__main")
      ?.getBoundingClientRect().width;
    const homeWidth = document
      .querySelector<HTMLElement>("openclaw-app-sidebar .nav-item--home")
      ?.getBoundingClientRect().width;
    const widths = [
      brandWidth === undefined ? null : `header ${Math.round(brandWidth)}px`,
      agentWidth === undefined ? null : `agente ${Math.round(agentWidth)}px`,
      homeWidth === undefined ? null : `Home ${Math.round(homeWidth)}px`,
    ]
      .filter(Boolean)
      .join(" · ");
    readout.textContent = `${name.length} caracteres · avatar ${state.avatar} · ${environment ? `ambiente ${environment.label}/${environment.color}` : "sem ambiente"} · ${state.unread ? "não lido" : "lido"} · menu ${state.menuOpen ? "aberto" : "fechado"} · + ${state.plusBorder ? "com borda" : "sem borda"} · agente ${state.agentStretch ? "esticado" : "pelo conteúdo"} · fundo ${state.fullHeaderSurface ? "header inteiro" : "agente"}\nlarguras: ${widths}\npx: sidebar ${tuningValues.sidebarWidth} · gaps collapse/busca ${tuningValues.collapseSearchGap}, busca/+ ${tuningValues.searchNewThreadGap} · avatar/nome ${tuningValues.avatarNameGap} · header t/r/b/l ${tuningValues.headerPaddingTop}/${tuningValues.headerPaddingRight}/${tuningValues.headerPaddingBottom}/${tuningValues.headerPaddingLeft} · agente v/h ${tuningValues.agentPaddingBlock}/${tuningValues.agentPaddingInline} · avatar ${tuningValues.avatarSize} · nome ${tuningValues.nameFontSize} · pill ${tuningValues.environmentPillFontSize} · botões ${tuningValues.actionSize}`;
    syncPressedState(panel);
  };
  const queueApply = () => {
    if (!frame) {
      frame = requestAnimationFrame(apply);
    }
  };

  for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-name]")) {
    button.addEventListener("click", () => {
      state.name = button.dataset.name as NameMode;
      queueApply();
    });
  }
  for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-avatar]")) {
    button.addEventListener("click", () => {
      state.avatar = button.dataset.avatar as AvatarMode;
      queueApply();
    });
  }
  panel
    .querySelector<HTMLButtonElement>('[data-preset="narrow-development"]')
    ?.addEventListener("click", () => {
      state.name = "long";
      state.environmentColor = "teal";
      state.unread = true;
      state.menuOpen = false;
      Object.assign(tuningValues, tuningDefaults);
      environmentSelect.value = "teal";
      unreadInput.checked = true;
      menuInput.checked = false;
      queueApply();
    });
  environmentSelect.addEventListener("change", () => {
    state.environmentColor =
      (environmentSelect.value as ControlUiEnvironment["color"]) || null;
    queueApply();
  });
  unreadInput.addEventListener("change", () => {
    state.unread = unreadInput.checked;
    if (state.unread && state.menuOpen) {
      state.menuOpen = false;
      menuInput.checked = false;
    }
    queueApply();
  });
  menuInput.addEventListener("change", () => {
    state.menuOpen = menuInput.checked;
    if (state.menuOpen && state.unread) {
      state.unread = false;
      unreadInput.checked = false;
    }
    queueApply();
  });
  plusBorderInput.addEventListener("change", () => {
    state.plusBorder = plusBorderInput.checked;
    queueApply();
  });
  agentStretchInput.addEventListener("change", () => {
    state.agentStretch = agentStretchInput.checked;
    queueApply();
  });
  fullHeaderSurfaceInput.addEventListener("change", () => {
    state.fullHeaderSurface = fullHeaderSurfaceInput.checked;
    queueApply();
  });
  guidesInput.addEventListener("change", () => {
    state.guides = guidesInput.checked;
    queueApply();
  });
  for (const input of panel.querySelectorAll<HTMLInputElement>("input[data-tuning]")) {
    input.addEventListener("input", () => {
      const key = input.dataset.tuning as TuningKey;
      tuningValues[key] = Number(input.value);
      queueApply();
    });
  }
  panel.querySelector<HTMLButtonElement>("[data-reset-tunings]")?.addEventListener("click", () => {
    Object.assign(tuningValues, tuningDefaults);
    state.plusBorder = !nativeMacTuner;
    plusBorderInput.checked = state.plusBorder;
    state.agentStretch = false;
    state.fullHeaderSurface = false;
    state.guides = false;
    agentStretchInput.checked = false;
    fullHeaderSurfaceInput.checked = false;
    guidesInput.checked = false;
    queueApply();
  });

  new MutationObserver(queueApply).observe(document.body, { childList: true, subtree: true });
  queueApply();
}

if (document.readyState === "loading") {
  addEventListener("DOMContentLoaded", installTuner, { once: true });
} else {
  installTuner();
}
