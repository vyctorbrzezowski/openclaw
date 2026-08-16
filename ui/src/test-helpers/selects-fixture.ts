// Every select-like control in the Control UI, on one page, openable.
//
// The app spreads its pickers across a dozen routes, several of which need a
// live session before they render at all, so comparing two of them side by side
// used to mean two browsers and a good memory. This fixture puts one instance of
// each family under the production class names and the real Web Awesome hosts,
// which is what makes a drift in the shared grammar visible as a difference
// between two neighbouring rows rather than something only a route-by-route
// sweep would catch.
//
// It renders outside the app shell, so it loads the app stylesheet plus every
// route stylesheet that owns a picker; without them the feature classes below
// resolve to nothing and the page silently proves the wrong thing.
import "../styles.css";
import "../styles/usage.css";
import "../styles/cron.css";
import "../styles/board.css";
import "../styles/workboard.css";
import "../styles/model-setup.css";
import "../styles/new-session.css";
import "../styles/sessions.css";
import "../styles/chat.css";
import "../components/web-awesome.ts";
import "../components/web-awesome-select.ts";
import "../components/web-awesome-popover.ts";

type SelectSpec = {
  /** Shown as the row's caption, and used to name the screenshot. */
  readonly label: string;
  /** Where the operator meets this control in the product. */
  readonly where: string;
  readonly markup: string;
};

const menuItems = (...entries: readonly (readonly [label: string, checked?: boolean])[]): string =>
  entries
    .map(
      ([label, checked]) =>
        `<wa-dropdown-item type="checkbox"${checked ? " checked" : ""}>${label}</wa-dropdown-item>`,
    )
    .join("");

const options = (...entries: readonly string[]): string =>
  entries.map((entry) => `<option>${entry}</option>`).join("");

const waOptions = (...entries: readonly string[]): string =>
  entries.map((entry) => `<wa-option value="${entry}">${entry}</wa-option>`).join("");

// Ordered by family so the page reads as a comparison, not a catalogue: every
// native box together, then every component-backed panel, then the two the chat
// composer positions by hand.
const specs: readonly SelectSpec[] = [
  {
    label: "Settings row select",
    where: "Settings → Appearance, Talk, MCP, config forms",
    markup: `<select class="settings-select">${options("Enter to send", "Cmd+Enter to send")}</select>`,
  },
  {
    label: "Field select",
    where: "Dialogs and inline forms (.field)",
    markup: `<div class="field"><select>${options("Local checkout", "Worktree")}</select></div>`,
  },
  {
    label: "Usage filter select",
    where: "Usage → filters bar",
    markup: `<select class="usage-select">${options("America/Sao_Paulo", "UTC")}</select>`,
  },
  {
    label: "Sessions sort select",
    where: "Usage → sessions table",
    markup: `<div class="sessions-sort"><select>${options("Newest first", "Oldest first")}</select></div>`,
  },
  {
    label: "Workboard input select",
    where: "Workboard toolbar",
    markup: `<div class="workboard"><select class="input">${options("All boards", "Release")}</select></div>`,
  },
  {
    label: "Board widget move select",
    where: "Chat board widget → card",
    markup: `<div class="workboard-widget-card__move"><select>${options("Todo", "In progress", "Done")}</select></div>`,
  },
  {
    label: "Settings wa-select",
    where: "Settings → language, model and channel pickers",
    markup: `<wa-select class="settings-select" value="Sonnet">${waOptions("Sonnet", "Opus", "Haiku")}</wa-select>`,
  },
  {
    label: "Workboard wa-select",
    where: "Workboard card modal",
    // Wrapped: --workboard-control-height is scoped to the board, and without it
    // this row would show a height the product never renders.
    markup: `<div class="workboard"><wa-select class="workboard-select" value="Backlog">${waOptions("Backlog", "Doing", "Shipped")}</wa-select></div>`,
  },
  {
    label: "Session menu",
    where: "Sidebar session row, chat header",
    markup: `<wa-dropdown class="session-menu"><button slot="trigger" class="btn">Session</button>${menuItems(["Rename"], ["Duplicate"], ["Archive"])}</wa-dropdown>`,
  },
  {
    label: "Session sort menu",
    where: "Sidebar → session list header",
    markup: `<wa-dropdown class="sidebar-session-sort-menu"><button slot="trigger" class="btn">Sort</button><div class="sidebar-session-sort-menu__title">Sort by</div>${menuItems(["Recent", true], ["Name"], ["Created"])}</wa-dropdown>`,
  },
  {
    label: "Sidebar customize menu",
    where: "Sidebar → customize",
    markup: `<wa-dropdown class="sidebar-customize-menu"><button slot="trigger" class="btn">Customize</button><div class="sidebar-customize-menu__title">Sections</div>${menuItems(["Pinned", true], ["Recent", true], ["Catalogs"])}</wa-dropdown>`,
  },
  {
    label: "Usage filter dropdown",
    where: "Usage → filters bar",
    markup: `<wa-dropdown class="usage-filter-select"><button slot="trigger" class="btn">Models</button>${menuItems(["claude-opus", true], ["gpt-5.6-luna"], ["sonnet-4.6"])}</wa-dropdown>`,
  },
  {
    label: "Usage export menu",
    where: "Usage → export",
    markup: `<wa-dropdown class="usage-export-menu"><button slot="trigger" class="btn">Export</button>${menuItems(["CSV"], ["JSON"])}</wa-dropdown>`,
  },
  {
    label: "Cron job menu",
    where: "Cron → job row",
    markup: `<wa-dropdown class="cron-job-menu"><button slot="trigger" class="btn">Job</button>${menuItems(["Run now"], ["Pause"], ["Delete"])}</wa-dropdown>`,
  },
  {
    label: "Cron filter dropdown",
    where: "Cron → runs filters",
    markup: `<wa-dropdown class="cron-filter-dropdown__details"><button slot="trigger" class="btn">Status</button>${menuItems(["Succeeded", true], ["Failed"], ["Skipped"])}</wa-dropdown>`,
  },
  {
    label: "Agent select",
    where: "Devices, Skills, Workboard, New Session, Agents",
    markup: `<wa-dropdown class="agent-select"><button slot="trigger" class="btn">Molty</button>${menuItems(["Molty", true], ["Research"], ["Ops"])}</wa-dropdown>`,
  },
  {
    label: "Provider picker",
    where: "Model Setup → manual provider",
    markup: `<wa-dropdown class="model-setup-provider-select"><button slot="trigger" class="btn">Anthropic</button>${menuItems(["Anthropic", true], ["OpenAI"], ["Google"])}</wa-dropdown>`,
  },
  {
    label: "Board widget menu",
    where: "Chat board widget header",
    markup: `<wa-dropdown class="board-widget__menu"><button slot="trigger" class="btn">Widget</button>${menuItems(["Move to tab"], ["Remove"])}</wa-dropdown>`,
  },
  {
    label: "Board tab overflow",
    where: "Board tab strip",
    markup: `<wa-dropdown class="board-tabs__overflow"><button slot="trigger" class="btn">More</button>${menuItems(["Operations"], ["Metrics"])}</wa-dropdown>`,
  },
  {
    label: "Tool card actions",
    where: "Chat → tool card widget",
    markup: `<wa-dropdown class="chat-tool-card__widget-actions"><button slot="trigger" class="btn">Actions</button>${menuItems(["Open"], ["Copy"])}</wa-dropdown>`,
  },
  {
    label: "Pane placement menu",
    where: "Chat split view → pane header",
    markup: `<wa-dropdown class="chat-pane__placement-menu"><button slot="trigger" class="btn">Placement</button>${menuItems(["Right", true], ["Bottom"], ["Full"])}</wa-dropdown>`,
  },
  {
    label: "Pane gateway menu",
    where: "Chat split view → pane header",
    markup: `<wa-dropdown class="chat-pane__gateway-menu"><button slot="trigger" class="btn">Gateway</button>${menuItems(["Local", true], ["Cloud"])}</wa-dropdown>`,
  },
  {
    label: "Editor picker",
    where: "Chat sidebar → file view",
    markup: `<wa-dropdown class="sidebar-file-view__editor-menu"><button slot="trigger" class="btn">Editor</button>${menuItems(["VS Code", true], ["Zed"], ["Vim"])}</wa-dropdown>`,
  },
  {
    label: "Composer attach menu",
    where: "Chat composer → plus button",
    markup: `<wa-dropdown class="agent-chat__attach-menu"><button slot="trigger" class="btn">Attach</button>${menuItems(["File"], ["Image"])}</wa-dropdown>`,
  },
  {
    label: "Mic device picker",
    where: "Chat composer → microphone chevron",
    markup: `<wa-dropdown class="chat-talk-input-picker"><button slot="trigger" class="btn">Mic</button><div class="chat-talk-input-picker__heading">Input device</div>${menuItems(["System default", true], ["MacBook Pro Microphone"], ["AirPods Pro"])}</wa-dropdown>`,
  },
  {
    label: "New session chip popover",
    where: "New Session → where / project / detail chips",
    // wa-popover anchors by id, not by a slot; the trigger is a sibling.
    markup: `<button id="selects-fixture-where" class="btn">Where</button><wa-popover class="new-session-page__select new-session-page__picker-popover" for="selects-fixture-where" placement="bottom-start" without-arrow><div class="new-session-page__menu-title">Devices</div>${menuItems(["This device", true], ["Cloud"])}</wa-popover>`,
  },
  {
    label: "Composer inline select",
    where: "Chat composer → model and reasoning pills",
    markup: `<div class="chat-controls__inline-select-menu" data-static-panel><button class="chat-controls__inline-select-option">Opus 5</button><button class="chat-controls__inline-select-option">Sonnet 4.6</button><button class="chat-controls__inline-select-option">Haiku</button></div>`,
  },
  {
    label: "Slash menu",
    where: "Chat composer → typing /",
    // role="option" divs, exactly as the composer renders them: on a <button>
    // the native chrome would show through and the row would prove nothing.
    markup: `<div class="selects-fixture__slash-host"><div class="slash-menu" data-static-panel><div class="slash-menu__scroll"><div class="slash-menu-item" role="option"><span>/compact</span><span>Summarise the thread</span></div><div class="slash-menu-item slash-menu-item--active" role="option"><span>/model</span><span>Switch model</span></div><div class="slash-menu-item" role="option"><span>/resume</span><span>Resume a session</span></div></div></div></div>`,
  },
];

// The two hand-positioned panels have no trigger to press, so they are rendered
// open and inert. Everything else is a real host the operator opens by clicking.
function renderRow(spec: SelectSpec, index: number): string {
  return `<section class="selects-fixture__row" data-select-index="${index}" data-select-label="${spec.label}">
    <header class="selects-fixture__meta">
      <h2>${spec.label}</h2>
      <p>${spec.where}</p>
    </header>
    <div class="selects-fixture__control">${spec.markup}</div>
  </section>`;
}

function mountSelectsFixture(): void {
  const root = document.querySelector("#app");
  if (!root) {
    throw new Error("selects fixture: missing #app root");
  }
  root.innerHTML = `<div class="selects-fixture__grid">${specs.map(renderRow).join("")}</div>`;
}

mountSelectsFixture();
