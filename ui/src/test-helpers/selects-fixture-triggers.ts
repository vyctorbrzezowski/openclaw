// Dropdown and picker triggers, as opposed to the select boxes next door.
//
// The single most useful thing this file records: **a wa-dropdown is not
// evidence of a select.** The fourteen menu hosts in the app split three ways,
// and only one of those ways has a trigger a standardization pass could touch.
//
//  A. Phantom-anchor menus (session, sidebar sort, sidebar customize). Their
//     `slot="trigger"` is a 1x1 `position:fixed; opacity:0; pointer-events:none`
//     button that exists only to give the popup coordinates. The thing the
//     operator clicks is a separate icon button elsewhere in the sidebar. There
//     is no trigger box here to unify — a fixture that drew one would be
//     inventing a control.
//  B. Real triggers with their own feature class (usage facets, cron, board,
//     tool card, file view, pane header, composer). These are the ones a pass
//     could actually reach, and most of them are icon buttons already sharing a
//     rule with the siblings beside them.
//  C. Not dropdowns at all: the composer's model/effort pills are
//     `<details>/<summary>` + wa-popup, and the new-session chips are plain
//     buttons anchored by `wa-popover for=`.
//
// Where a habitat renders a trigger without the sibling it shares a CSS rule
// with, the rule proves nothing — so the siblings are here too, even when they
// are not selects.
import type { SelectFamily } from "./selects-fixture-contract.ts";

export const TRIGGER_FAMILIES: readonly SelectFamily[] = [
  {
    id: "phantom-anchor-menus",
    label: "Sidebar menus — phantom anchors",
    where: "Sidebar session row, session list header, nav customize",
    kind: "wa-dropdown",
    source:
      "components/session-menu.ts:339, app-sidebar-session-menu-renderers.ts:28, app-sidebar-nav-menus.ts:206",
    habitat: `<div class="habitat-frame">
      <p class="habitat-note">what the operator actually clicks — the wa-dropdown trigger is a 1×1 invisible button elsewhere</p>
      <div class="sidebar-recent-sessions__head" style="display:flex;align-items:center;gap:8px;min-height:24px;margin-bottom:10px">
        <button type="button" class="sidebar-session-group-toggle" aria-expanded="true" style="flex:1 1 auto;text-align:left"><span class="sidebar-recent-sessions__label-text">Sessions</span><span class="sidebar-session-group-count">12</span></button>
        <button type="button" class="sidebar-session-group-actions sidebar-session-sort" title="Sort sessions" aria-expanded="true" data-measure>≡</button>
        <button type="button" class="sidebar-session-group-actions sidebar-new-session" title="New session">+</button>
      </div>
      <div class="sidebar-recent-session session-row-host" style="display:flex;align-items:center;gap:8px">
        <span class="sidebar-recent-session__link" style="flex:1 1 auto"><span class="sidebar-recent-session__text"><span class="sidebar-recent-session__name">Refactor gateway retry</span></span></span>
        <span class="session-row-actions" style="display:inline-flex;gap:1px;opacity:1">
          <button class="session-action session-action--pin" type="button" aria-label="Pin session">⚲</button>
          <button class="session-action" type="button" aria-label="Session menu">⋯</button>
        </span>
      </div>
      <p class="habitat-note" style="margin-top:12px">the actual wa-dropdown trigger, to scale:</p>
      <button type="button" tabindex="-1" aria-hidden="true" style="width:1px;height:1px;opacity:0;pointer-events:none"></button>
    </div>`,
    locks: [
      'All three hosts render <code>&lt;button slot="trigger" tabindex="-1" aria-hidden="true" style="position:fixed;width:1px;height:1px;opacity:0;pointer-events:none"&gt;</code> — an anchor, not a control.',
      "The visible affordances are icon buttons on their own scale: <code>.session-action</code> 24×24, <code>.sidebar-session-group-actions</code> 22×22, <code>.sidebar-nav__head-action</code> 22×22 — all <code>opacity: 0</code> at rest, revealed on row hover.",
      "<code>layout.css:1711</code> styles the sort trigger in one selector list with the <code>+</code> new-session button beside it. They are a pair.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone — there is no trigger box in this family. The measured row above is the visible icon button, which belongs to the sidebar's 22/24px action-button scale and to a hover-reveal contract. Any pass that treated these as selects would be styling an invisible 1×1 anchor.",
    },
  },
  {
    id: "usage-filter-trigger",
    label: "Usage facet filters",
    where: "Usage → channel / provider / model / tool filter row",
    kind: "wa-dropdown",
    liveRoute: "/usage",
    source: "ui/src/pages/usage/view.ts:448 — trigger lifted from the running page",
    habitat: `<div class="usage-query-section">
      <div class="usage-query-bar" style="margin-bottom:8px"><input class="usage-query-input" type="text" placeholder="model:opus tool:bash" /></div>
      <div class="usage-filter-row">
        <wa-dropdown class="usage-filter-select" placement="bottom-start"><button slot="trigger" type="button" class="usage-filter-trigger" data-measure><span>Channel</span><span class="settings-count">All</span></button><wa-dropdown-item type="checkbox">discord</wa-dropdown-item><wa-dropdown-item type="checkbox">telegram</wa-dropdown-item></wa-dropdown>
        <wa-dropdown class="usage-filter-select" placement="bottom-start"><button slot="trigger" type="button" class="usage-filter-trigger"><span>Model</span><span class="settings-count">3</span></button><wa-dropdown-item type="checkbox" checked>claude-opus</wa-dropdown-item></wa-dropdown>
        <wa-dropdown class="usage-filter-select" placement="bottom-start"><button slot="trigger" type="button" class="usage-filter-trigger"><span>Tool</span><span class="settings-count">All</span></button><wa-dropdown-item type="checkbox">bash</wa-dropdown-item></wa-dropdown>
        <span class="usage-query-hint">Tip: combine tokens with key:value</span>
      </div>
    </div>`,
    locks: [
      "Four peers on <code>.usage-filter-row</code> (<code>usage.css:514</code>), so they move as a set — they share a class, so they will.",
      "<strong>An existing mismatch worth fixing:</strong> <code>usage.css:526</code> gives the trigger <code>min-height: 30px</code> while the query and date inputs directly above are <code>32px</code> (<code>:379</code>) and the chart toggles are <code>28px</code>. Three heights on one panel today.",
      "Each trigger always carries a <code>.settings-count</code> badge — it shows a count, never the chosen value.",
    ],
    verdict: {
      kind: "free",
      note: "Free to standardize, and standardizing actually fixes something: these sit 2px short of the inputs above them today. Keep the count badge and do not add a chevron — a facet filter holds many values, so a one-value affordance would misdescribe it.",
    },
  },
  {
    id: "cron-job-menu",
    label: "Cron row action menu",
    where: "Cron → job table row",
    kind: "wa-dropdown",
    liveRoute: "/cron",
    source: "ui/src/pages/cron/view.ts:877 — trigger lifted from the running page",
    habitat: `<div class="cron-table habitat-frame">
      <p class="habitat-note">the actions cell is a fixed 116px grid column</p>
      <div class="cron-table__row" role="button" tabindex="0" style="display:flex;align-items:center;gap:12px">
        <span class="cron-table__name" style="flex:1 1 auto"><span class="cron-table__dot cron-table__dot--active"></span><span class="cron-table__name-text">Morning digest</span></span>
        <span class="cron-table__cell">Every day at 08:00</span>
        <span class="cron-table__actions" style="display:flex;align-items:center;justify-content:flex-end;gap:6px;width:116px">
          <button type="button" class="btn btn--sm btn--ghost cron-row-run" title="Run now">▶</button>
          <wa-dropdown class="cron-job-menu" placement="bottom-end"><button slot="trigger" type="button" class="btn btn--sm btn--ghost cron-job-menu__trigger" aria-label="More" data-measure>⋯</button><wa-dropdown-item class="cron-job-menu__item">Run if due</wa-dropdown-item><wa-dropdown-item class="cron-job-menu__item">Clone</wa-dropdown-item><wa-dropdown-item class="cron-job-menu__item danger">Remove</wa-dropdown-item></wa-dropdown>
        </span>
      </div>
    </div>`,
    locks: [
      "<code>cron.css:266</code> fixes the row's last grid column at <strong>116px</strong>, and the run button, the enabled switch and this trigger all have to fit inside it. The hardest dimensional constraint in the set.",
      "Sibling widths already disagree: <code>.cron-row-run</code> is 26px (<code>:430</code>), <code>.cron-job-menu__trigger</code> is 30px (<code>:777</code>).",
      "<code>cron.css:785</code> paints a <code>position:fixed; inset:0</code> dismissal scrim from the open trigger, so the open state changes hit-testing across the whole page.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone as a select. A kebab opening Run now / Clone / Remove holds no value, and its panel already took the canonical surface in this lane. The 26-vs-30 sibling mismatch inside the 116px cell is real but belongs to a cron table pass, not a selects one.",
    },
  },
  {
    id: "agent-select-trigger",
    label: "Agent select",
    where: "Agents, Devices, Skills, Workboard toolbars — and New Session as a 26px chip",
    kind: "wa-dropdown",
    source: "ui/src/components/agent-select.ts:179",
    habitat: `<div class="habitat-frame">
      <p class="habitat-note">Agents page toolbar</p>
      <div class="agents-toolbar-row" style="display:flex;align-items:center;gap:10px">
        <div class="agents-control-select" style="flex:1;max-width:280px">
          <wa-dropdown class="agent-select" placement="bottom-start"><button slot="trigger" type="button" class="agent-select__trigger" data-measure><span class="agent-select__avatar"></span><span class="agent-select__label">Molty</span><span class="agent-select__badge">default</span><span class="agent-select__chevron">⌄</span></button><wa-dropdown-item class="agent-select__option" type="checkbox" checked>Molty</wa-dropdown-item><wa-dropdown-item class="agent-select__option" type="checkbox">Research</wa-dropdown-item></wa-dropdown>
        </div>
        <div class="agents-toolbar-actions" style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn--sm btn--ghost agents-create-btn">New agent</button>
          <button class="btn btn--sm agents-refresh-btn">Refresh</button>
        </div>
      </div>
    </div>`,
    locks: [
      "<code>components.css:3617</code> gives the trigger <strong>no explicit height</strong> — it is padding plus the 24px <code>.agent-select__avatar</code>. Drop the avatar and the box shrinks, which is why the habitat renders one.",
      "<code>.agent-scope-control .agent-select__trigger</code> pins 34px and a pill radius (<code>:3587</code>); <code>.workboard-agent-select .agent-select__trigger</code> takes the board's 34px.",
      "<strong>Cross-component contract:</strong> <code>new-session.css:127</code> makes <code>.agent-select--compact .agent-select__trigger</code> exactly 26px to match <code>.new-session-page__trigger</code> beside it. A custom element and a plain button, hand-matched.",
    ],
    verdict: {
      kind: "constrained",
      keep: "the avatar-derived box, and the 26px compact variant",
      note: "This genuinely holds a value and appears on five pages, so it is the best candidate in the dropdown half. But it has four sizes already (auto, 34px scope, 34px board, 26px compact chip) and one of them is hand-matched to a different component. Standardize the default; leave --compact pinned to the chip row it shares a line with.",
    },
  },
  {
    id: "provider-picker-trigger",
    label: "Provider picker",
    where: "Model Setup → connect a provider manually",
    kind: "wa-dropdown",
    source: "ui/src/pages/model-setup/view.ts:424",
    habitat: `<div class="model-setup__manual habitat-frame" style="display:grid;gap:14px;max-width:520px">
      <div class="field"><span>Provider</span>
        <wa-dropdown class="model-setup-provider-select" placement="bottom-start"><button slot="trigger" type="button" class="model-setup-provider-select__trigger" data-measure><span class="model-setup__icon model-setup__icon--picker"></span><span class="model-setup-provider-select__copy"><strong>Anthropic</strong><span>API key</span></span><span class="model-setup-provider-select__chevron">⌄</span></button><wa-dropdown-item class="model-setup-provider-select__option" type="checkbox" checked><span class="model-setup-provider-select__copy"><strong>Anthropic</strong><span>API key</span></span></wa-dropdown-item><wa-dropdown-item class="model-setup-provider-select__option" type="checkbox"><span class="model-setup-provider-select__copy"><strong>OpenAI</strong><span>API key</span></span></wa-dropdown-item></wa-dropdown>
      </div>
      <label class="field"><span>Access value for Anthropic</span><input class="input" type="password" placeholder="sk-ant-…" /></label>
      <button type="button" class="btn primary">Connect and verify</button>
    </div>`,
    locks: [
      "<code>model-setup.css:208</code> pins <code>min-height: 64px</code> with two lines of stacked copy. It is a card, not a pill — roughly double the next tallest trigger in the app.",
      "The <em>same</em> <code>__copy</code> block class renders inside the trigger and inside every option, deliberately, so the closed control looks like the row you picked.",
      "Coupled to the password input below it by the grid column, not by height: both are <code>width: 100%</code>.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone. Collapsing a two-line 64px provider card into a 32px pill would delete the second line — the auth kind — which is the thing that tells an operator whether they are about to paste a key or start OAuth. This is a picker whose size is carrying meaning.",
    },
  },
  {
    id: "icon-button-menus",
    label: "Icon-button menus",
    where: "Tool card header, file view path bar, board widget bar, board tab strip",
    kind: "wa-dropdown",
    source:
      "widget-card.ts:465, chat-sidebar-editor-menu.ts:31, board-widget-cell-render.ts:32, board-view.ts:598",
    habitat: `<div class="habitat-frame">
      <p class="habitat-note">file view path bar — the trigger and every sibling share one class</p>
      <div class="sidebar-file-view__path-bar" style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <div class="sidebar-file-view__path-field" style="flex:1 1 auto"><span class="sidebar-file-view__path">src/gateway/retry.ts</span></div>
        <div class="sidebar-file-view__actions" style="display:inline-flex;align-items:center;gap:2px">
          <button class="btn btn--sm sidebar-file-view__action" type="button" aria-label="Edit">✎</button>
          <button class="btn btn--sm sidebar-file-view__action" type="button" aria-label="Search">⌕</button>
          <div class="sidebar-file-view__editor"><wa-dropdown class="sidebar-file-view__editor-menu" placement="bottom-end"><button slot="trigger" class="btn btn--sm sidebar-file-view__action" type="button" aria-label="Open in editor" data-measure>↗</button><wa-dropdown-item class="sidebar-file-view__editor-item">VS Code</wa-dropdown-item><wa-dropdown-item class="sidebar-file-view__editor-item">Zed</wa-dropdown-item></wa-dropdown></div>
          <button class="btn btn--sm sidebar-file-view__action" type="button" aria-label="Copy contents">⧉</button>
        </div>
      </div>
      <p class="habitat-note">board widget bar — trigger and tab overflow share a rule, then diverge in size</p>
      <header class="board-widget__bar" style="display:flex;align-items:center;gap:7px;padding:0 6px">
        <span class="board-widget__drag-handle">⠿</span>
        <span class="board-widget__title">Deploy status</span>
        <span class="board-widget__kind" style="margin-left:auto">HTML</span>
        <wa-dropdown class="board-widget__menu" placement="bottom-end"><button class="board-widget__menu-trigger" slot="trigger" type="button" aria-label="Widget menu">⋮</button><div class="board-widget__menu-heading">Move to tab</div><wa-dropdown-item>Operations</wa-dropdown-item></wa-dropdown>
      </header>
    </div>`,
    locks: [
      "<code>chat/sidebar.css:1398</code>: <code>.sidebar-file-view__action</code> is <strong>one 26×26 class shared by the trigger and every sibling action</strong> — edit, search, reveal, both copies. The trigger is not distinguishable from its neighbours by class at all.",
      "<code>tool-cards.css:745</code> does the same: <code>.chat-tool-card__widget-actions-trigger, .chat-tool-card__widget-action { width: 26px; height: 26px }</code>, one rule for the menu and the pin beside it.",
      "<code>board.css:91</code> styles <code>.board-tabs__overflow-trigger</code> and <code>.board-widget__menu-trigger</code> in one list, then <em>diverges</em>: 30×34 vs 27×27.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone. Every one of these is an icon button that happens to open a menu, and each is already welded by a shared rule to the icon buttons on either side of it. Giving them a select's box would break four toolbars to unify four controls that were never selects. The board's 30×34-vs-27×27 divergence is a real inconsistency, but it is an icon-button one.",
    },
  },
  {
    id: "chat-pane-chips",
    label: "Pane header chips",
    where: "Chat split view → pane header",
    kind: "wa-dropdown",
    source: "chat-pane-placement.ts:26, chat-pane-header.ts:342",
    habitat: `<div class="chat-pane__header habitat-frame" style="display:flex;align-items:center;gap:8px;min-height:48px">
      <div class="chat-pane__crumbs" style="display:flex;align-items:center;gap:6px">
        <button class="chat-pane__workspace-chip" type="button">📁 openclaw</button>
        <span class="chat-pane__crumb-sep">/</span>
        <button class="chat-pane__session-title" type="button"><span class="chat-pane__session-title-text">Refactor gateway retry</span></button>
      </div>
      <wa-dropdown class="chat-pane__placement-menu" placement="bottom-start"><button slot="trigger" class="chat-pane__placement-chip" type="button">Runs on Cloud</button><wa-dropdown-item class="session-menu__item">Stop cloud worker</wa-dropdown-item></wa-dropdown>
      <wa-dropdown class="chat-pane__gateway-menu" placement="bottom-start"><button slot="trigger" class="chat-pane__gateway-chip" type="button" data-measure><span class="chat-pane__gateway-health" data-health="ok"></span><span class="chat-pane__gateway-name">Local</span><span class="chat-pane__gateway-chevron">⌃</span></button><wa-dropdown-item class="chat-pane__gateway-menu-item">Local</wa-dropdown-item><wa-dropdown-item class="chat-pane__gateway-menu-item">Cloud</wa-dropdown-item></wa-dropdown>
      <div class="chat-pane__actions" style="margin-left:auto;display:flex;gap:2px">
        <button class="btn btn--ghost btn--icon chat-icon-btn" type="button">⊞</button>
        <button class="btn btn--ghost btn--icon chat-icon-btn" type="button">⋯</button>
      </div>
    </div>`,
    locks: [
      "<code>split-view.css:148</code> fixes the header at <strong>48px</strong>, chosen so the 28px actions land on the app's shared 24px chrome centerline.",
      "<code>.chat-pane__gateway-chip</code> is 28px with a pill radius — matched to <code>.chat-icon-btn</code>'s 28px, which is the header's real height token.",
      "<code>.chat-pane__placement-chip</code> has <strong>no height at all</strong> and no border: it is deliberately the one un-boxed chip in the row, centred by the 48px flex line. <code>split-view.css:532</code> exists because the session menu once measured 29.8px tall and sat 0.9px low against its 28px neighbours.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone. This row is a 48px chrome line tuned to a 28px token and a documented sub-pixel fix; the placement chip's lack of a box is a decision, not an omission. A 32px form-control box dropped in here would be the tallest thing in the header and would undo that alignment work.",
    },
  },
  {
    id: "composer-inline-select",
    label: "Composer model / reasoning pills",
    where: "Chat composer → action row",
    kind: "hand-rolled",
    source:
      "chat-model-picker.ts:375, chat-effort-picker.ts:126 — <details>/<summary>, not wa-dropdown",
    habitat: `<div class="agent-chat__composer-footer habitat-frame" style="display:flex;align-items:center;gap:8px;min-height:44px">
      <div class="agent-chat__composer-controls" style="display:flex;align-items:center;gap:6px">
        <div class="chat-controls__session chat-controls__model chat-controls__model-settings" style="display:flex;align-items:center;gap:4px">
          <details class="chat-controls__inline-select chat-controls__model-picker"><summary class="chat-controls__inline-select-trigger chat-controls__model-trigger" data-measure><span class="chat-controls__inline-select-label">Sonnet 4.6</span><span class="chat-controls__trigger-meta">200k</span></summary></details>
          <details class="chat-controls__inline-select chat-controls__effort-picker"><summary class="chat-controls__inline-select-trigger chat-controls__effort-trigger"><span class="chat-controls__inline-select-label">Think</span></summary></details>
        </div>
      </div>
    </div>`,
    locks: [
      'Not a wa-dropdown: <code>&lt;details&gt;</code> + <code>&lt;summary&gt;</code> + <code>wa-popup</code>, so it has no <code>slot="trigger"</code> and no button semantics to inherit.',
      "<code>chat/layout.css:4298</code> pins both pills at <strong>30px</strong>; <code>:4274</code> adds a group-scoped <code>width: auto</code> without which they stretch to full width.",
      "They sit in the composer's 44px footer, and PR #124301 (tmp/composer-restyle, unmerged) rewrites this whole family onto <code>--chat-composer-chip-*</code> with a 44px mobile bump.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone in this lane. Another branch owns it right now, and it is already one coherent family that is deliberately quieter than a form control because it is chrome beside the draft. The canonical box below is built to be compatible with its 30px chip rhythm rather than to replace it.",
    },
  },
  {
    id: "composer-icon-menus",
    label: "Composer attach and mic menus",
    where: "Chat composer → input row",
    kind: "wa-dropdown",
    source: "chat-attachments.ts:510, chat-composer-controls.ts:93",
    habitat: `<div class="agent-chat__input habitat-frame">
      <p class="habitat-note">composer input row — every child is forced to 36px</p>
      <div class="agent-chat__composer-input-row" style="display:flex;align-items:flex-end;gap:4px">
        <wa-dropdown class="agent-chat__attach-menu" placement="top-start"><button slot="trigger" type="button" class="agent-chat__input-btn agent-chat__input-btn--attach" aria-label="Add attachment" data-measure>＋</button><wa-dropdown-item class="agent-chat__attach-menu-option">Attach file</wa-dropdown-item><wa-dropdown-item class="agent-chat__attach-menu-option">Attach photo</wa-dropdown-item></wa-dropdown>
        <div class="agent-chat__composer-combobox" style="flex:1 1 auto"><textarea rows="1" placeholder="Message Molty…"></textarea></div>
        <div class="agent-chat__composer-actions" style="display:flex;align-items:center;gap:4px">
          <button class="chat-send-btn" aria-label="Send">↑</button>
          <span class="chat-talk-control">
            <button class="chat-send-btn chat-send-btn--voice" type="button" aria-label="Voice">🎙</button>
            <wa-dropdown class="chat-talk-input-picker" placement="top-end"><button slot="trigger" type="button" class="chat-talk-input-picker__trigger" aria-label="Microphone input">⌄</button><div class="chat-talk-input-picker__heading">Microphone input</div><wa-dropdown-item class="chat-talk-input-picker__item">System default</wa-dropdown-item></wa-dropdown>
          </span>
        </div>
      </div>
    </div>`,
    locks: [
      "<code>chat/layout.css:2598</code> is a universal child selector: <code>.agent-chat__composer-input-row &gt; * { min-height: var(--chat-composer-control-height) }</code> = <strong>36px</strong> — imposed on the attach dropdown, the textarea and the actions block alike, so the row reads as one axis while the textarea grows.",
      "Attach button and send button are a matched 36px pair (<code>:2720</code>, <code>:3197</code>).",
      "The mic picker is the right half of a split pill: <code>align-self: stretch</code> against the voice button, with a comment recording that it must follow the 44px mobile bump. Rendered without <code>.chat-talk-control</code> and its voice sibling it has <em>zero height</em> — which is why both are in the habitat.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone. Both are icon buttons welded to the composer's 36px row token, and the mic chevron has no independent box by construction. Their panels already took the canonical surface in this lane, which is the part that was inconsistent.",
    },
  },
  {
    id: "new-session-where-chip",
    label: "New session chips",
    where: "New Session → agent / where / project / detail",
    kind: "wa-popover",
    source: "ui/src/pages/new-session/where-chip.ts:88 — a plain button with wa-popover for=",
    habitat: `<div class="new-session-page__triggers habitat-frame" style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 2px">
      <span class="new-session-page__select new-session-page__select--agent"><button type="button" class="agent-select__trigger" style="height:26px"><span class="agent-select__label">Molty</span><span class="agent-select__chevron">⌄</span></button></span>
      <span class="new-session-page__select"><button id="dossier-where-trigger" type="button" class="new-session-page__trigger" aria-haspopup="dialog" data-measure><span class="new-session-page__target-icon">🖥</span><span class="new-session-page__trigger-label">Local</span><span class="new-session-page__trigger-chevron">⌄</span></button></span>
      <span class="new-session-page__select"><button type="button" class="new-session-page__trigger"><span class="new-session-page__target-icon">📁</span><span class="new-session-page__trigger-label">openclaw</span><span class="new-session-page__trigger-chevron">⌄</span></button></span>
      <span class="new-session-page__select"><button type="button" class="new-session-page__trigger"><span class="new-session-page__trigger-label">Worktree</span><span class="new-session-page__trigger-chevron">⌄</span></button></span>
      <wa-popover class="new-session-page__select new-session-page__picker-popover" for="dossier-where-trigger" placement="bottom-start" without-arrow><div class="new-session-page__menu-title">Your devices</div><wa-dropdown-item type="checkbox" checked>This device</wa-dropdown-item><wa-dropdown-item type="checkbox">Cloud</wa-dropdown-item></wa-popover>
    </div>`,
    locks: [
      'Not a wa-dropdown: a plain <code>&lt;button id&gt;</code> with a sibling <code>&lt;wa-popover for=&gt;</code>. No <code>slot="trigger"</code> anywhere.',
      "<code>new-session.css:155</code> pins <code>.new-session-page__trigger</code> at <strong>26px</strong>, pill radius, borderless, 12px — and <code>:127</code> hand-matches <code>.agent-select--compact .agent-select__trigger</code> to the same 26px so the row reads as one strip. <strong>The clearest cross-component dimensional contract in the codebase</strong>: a plain button and a Lit element wrapping a wa-dropdown, kept equal by hand.",
      '<code>new-session-runtime.ts:50</code> names <code>".new-session-page__select--agent wa-dropdown"</code> in JS, so the nesting is a runtime contract too.',
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone. Four chips on one line at a hand-matched 26px, one of which is a different component entirely; the row is explicitly built to read as a single control strip. A form-control box here would break the strip and the JS selector that assumes the nesting.",
    },
  },
];
