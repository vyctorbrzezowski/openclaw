// The material behind the selects context dossier.
//
// Each habitat below is the real surrounding region, not an illustration of one.
// Where the mock server can reach the route, the markup was lifted from the
// running page and trimmed of Lit's comment markers; where it cannot, it was
// reconstructed from the file named in `source`. Every card carries that source
// so a reader can check the reconstruction rather than take it on trust.
//
// One distinction runs through the verdicts and is worth stating once here: not
// every wa-dropdown is a select. A kebab that opens Run now / Pause / Delete is
// an action menu — its trigger is a plain icon button and always has been, and
// giving it a select's box would promise a value where there is none. Those are
// marked "leave alone" on that ground, not on a dimensional one.
import type { CanonicalTriggerProposal, SelectFamily } from "./selects-fixture-contract.ts";

const OPTIONS_TIMEZONE = `<option>Local</option><option>UTC</option><option>America/Sao_Paulo</option>`;

export const SELECT_FAMILIES: readonly SelectFamily[] = [
  {
    id: "settings-row-select",
    label: "Settings row select",
    where: "Settings → Appearance, Talk, MCP, and every config form row",
    kind: "native",
    liveRoute: "/config",
    source: "ui/src/pages/config/settings-select-row.ts:19, row from components/settings-ui.ts:96",
    habitat: `<div class="settings-group">
      <div class="settings-row">
        <div class="settings-row__text"><span class="settings-row__title">Message width</span><span class="settings-row__desc">Using default (48rem). Applies to this browser only.</span></div>
        <div class="settings-row__control"><button type="button" class="btn btn--icon" title="Reset to default">↺</button><input class="settings-input" type="text" placeholder="48rem" /></div>
      </div>
      <div class="settings-row">
        <div class="settings-row__text"><span class="settings-row__title">Send shortcut</span><span class="settings-row__desc">Using default (Enter). Synced from the gateway.</span></div>
        <div class="settings-row__control"><button type="button" class="btn btn--icon" title="Reset to default">↺</button><select class="settings-select" aria-label="Send shortcut" data-measure><option>Enter to send</option><option>Cmd+Enter to send</option></select></div>
      </div>
      <div class="settings-row settings-row--stacked">
        <div class="settings-row__text"><span class="settings-row__title">Color mode</span><span class="settings-row__desc">Using default (System).</span></div>
        <div class="settings-row__control"><span class="settings-segmented"><button class="settings-segmented__btn settings-segmented__btn--active">System</button><button class="settings-segmented__btn">Light</button><button class="settings-segmented__btn">Dark</button></span></div>
      </div>
    </div>`,
    locks: [
      "<code>settings.css:442</code> is one selector list pinning <code>.settings-row__control .btn</code>, <code>.settings-section__actions .btn</code>, <code>.settings-group .data-table-search input</code>, <code>input.settings-input</code> and <code>select.settings-select:not([multiple])</code> to <code>height: var(--settings-control-height)</code> = 32px. This is the strongest coupling in the app.",
      "<code>.settings-segmented</code> takes the same token as <code>min-height</code>; <code>.btn--icon</code> in a row control is squared to it. Four control kinds, one number.",
      "Width is deliberately <em>de</em>coupled: <code>settings.css:581</code> gives the select <code>width:auto; min-width:min(220px,100%)</code> while the text input is pinned to 340px. Only height is shared.",
    ],
    verdict: {
      kind: "constrained",
      keep: "32px",
      note: "Everything except the height can take the canonical trigger. The height is not this control's to choose — it is the settings row's, shared with the reset button beside it and the text input in the row above. Standardize the box, border, fill and chevron; drive the height from --settings-control-height.",
    },
  },
  {
    id: "field-select",
    label: "Field select",
    where: "Dialogs and inline forms — MCP server form, session group defaults",
    kind: "native",
    source:
      "ui/src/components/session-group-defaults-dialog.ts:248 (mcp-server-form is not a .field case)",
    habitat: `<form class="exec-approval-card habitat-frame habitat-frame--narrow">
      <p class="habitat-note">dialog form column</p>
      <label class="field"><span>Checkout mode</span><select name="mode" data-measure><option>Local checkout</option><option>Worktree</option></select></label>
      <label class="field"><span>Branch prefix</span><input type="text" placeholder="feature/" /></label>
      <label class="field"><span>Notes</span><textarea rows="2">Runs on the gateway host.</textarea></label>
    </form>`,
    locks: [
      "<code>components.css:1045</code> shares <code>height: 38px</code> between <code>.field select</code> and <code>.field input:not([type=checkbox]):not([type=radio])</code>.",
      "<code>components.css:1028</code> shares border, fill, radius, inset highlight and focus ring across <code>.field input</code>, <code>.field textarea</code> and <code>.field select</code> — this is a whole form family, not a lone select.",
      "This family's 38px and the settings family's 32px are two different form rhythms in one app. That difference is real, and it is a fields question rather than a selects one.",
    ],
    verdict: {
      kind: "constrained",
      keep: "38px and the .field fill/border",
      note: "The chevron, its inset and appearance:none are already shared and should stay shared. The box cannot move on its own: a select 6px shorter than the text input directly beneath it in the same dialog column reads as a mistake. Either standardize the whole .field family in a fields pass, or leave this select tied to it.",
    },
  },
  {
    id: "usage-filter-select",
    label: "Usage timezone select",
    where: "Usage → filters bar",
    kind: "native",
    liveRoute: "/usage",
    source: "ui/src/pages/usage/view.ts:627 — habitat lifted from the running page",
    habitat: `<div class="usage-controls">
      <div class="usage-presets"><button class="btn btn--sm">Hoje</button><button class="btn btn--sm">7d</button><button class="btn btn--sm">30d</button><button class="btn btn--sm">90d</button><button class="btn btn--sm">Todas</button></div>
      <div class="usage-date-range"><input class="usage-date-input" type="date" /><span class="usage-separator">até</span><input class="usage-date-input" type="date" /></div>
      <select class="usage-select" title="Fuso horário" data-measure>${OPTIONS_TIMEZONE}</select>
    </div>`,
    locks: [
      "Was in one selector list with <code>.usage-date-input</code> and <code>.usage-query-input</code> at <code>min-height: 32px</code>; this lane already took it out, so the rule-level coupling is gone.",
      "The optical coupling remains and is the one that matters: it sits on a flex line with two 32px date inputs and a row of <code>.btn--sm</code> presets. At 32px it currently lines up with all of them.",
    ],
    verdict: {
      kind: "free",
      note: "Free to standardize. The canonical 32px is already what its neighbours measure, so the unified trigger lands on this bar without moving anything. Its 12px type is the bar's own and worth keeping as a local override.",
    },
  },
  {
    id: "usage-multi-select",
    label: "Session log multi-selects",
    where: "Usage → session detail, conversation filters",
    kind: "native",
    liveRoute: "/usage",
    source: "ui/src/pages/usage/view-details.ts:1041 and :1066",
    habitat: `<div class="session-logs-compact habitat-frame">
      <p class="habitat-note">session log filter bar — these are the app's only list boxes</p>
      <div class="usage-filters-inline session-log-filters">
        <select multiple size="4" aria-label="Filter by role" data-measure><option>User</option><option>Assistant</option><option>Tool</option><option>Tool result</option></select>
        <select multiple size="4" aria-label="Filter by tool"><option>Bash</option><option>Read</option><option>Edit</option></select>
        <label class="session-log-has-tools"><input type="checkbox" /> Has tools</label>
        <input type="text" placeholder="Search conversation" />
        <button class="btn btn--sm">Clear</button>
      </div>
    </div>`,
    locks: [
      "These are <code>&lt;select multiple&gt;</code>, deliberately excluded from the app-wide box by the <code>:not([multiple])</code> guard — a list box has no arrow to replace and <code>appearance:none</code> would strip the scrolling frame it needs.",
      "<code>usage.css:1745</code> gives them <code>min-height: 112px</code> beside a 32px text input, with <code>align-items:center</code>. That mismatch is intentional: they are towers, not fields.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone. Any trigger standardization must keep the :not([multiple]) guard or these two turn into unusable frameless boxes. Named here so the guard is a decision on the record rather than a detail someone deletes later.",
    },
  },
  {
    id: "sessions-sort-select",
    label: "Sessions sort select",
    where: "Usage → sessions table toolbar",
    kind: "native",
    liveRoute: "/usage",
    source: "ui/src/pages/usage/view-overview.ts:972 — a card meta bar, not a table header",
    habitat: `<div class="usage-panel sessions-card habitat-frame">
      <p class="habitat-note">sessions card meta bar</p>
      <div class="sessions-card-meta" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
        <div class="sessions-card-stats" style="display:flex;gap:10px"><span>$0.23 avg</span><span>4 errors</span></div>
        <div class="chart-toggle small"><button class="btn btn--sm toggle-btn active">All</button><button class="btn btn--sm toggle-btn">Recent</button></div>
        <label class="sessions-sort"><span>Sort</span><select class="settings-select" data-measure><option>Recent</option><option>Cost</option><option>Tokens</option></select></label>
        <button class="btn btn--sm" aria-label="Descending">↓</button>
        <button class="btn btn--sm">Clear selection</button>
      </div>
    </div>`,
    locks: [
      'It carries <code>class="settings-select"</code>, so it is already inside the settings 32px family via <code>settings.css:442</code> — it moves whenever that family moves, whether or not anyone intends it to.',
      "Its own <code>.sessions-sort select</code> rule declared 34px and a <code>--bg</code> fill that matched nothing; this lane deleted it, so the settings box now shows through as it always should have.",
      "Its immediate neighbours are <code>.btn--sm</code>, which are <em>not</em> in that settings selector list — this is the one spot where the 32px settings height meets a button sized by components.css.",
    ],
    verdict: {
      kind: "free",
      note: "Free — it needs no decision of its own, because it already rides the settings family. Worth knowing that it does: any height change approved for Settings lands here too, on a bar where the neighbours are btn--sm rather than settings controls.",
    },
  },
  {
    id: "workboard-input-select",
    label: "Workboard .input select — dead rule",
    where: "Workboard → toolbar filters (no live render)",
    kind: "native",
    source: 'styles/workboard.css:212 — no matching <select class="input"> exists in the product',
    habitat: `<div class="workboard"><div class="habitat-frame">
      <p class="habitat-note">workboard toolbar — the select below has no counterpart in the app</p>
      <div class="workboard-toolbar__filters" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input class="input" type="search" placeholder="Search cards" style="max-width:220px" />
        <select class="input" data-measure><option>All boards</option><option>Release</option></select>
        <button class="btn workboard-archive-toggle" type="button">Show archived</button>
      </div>
    </div></div>`,
    locks: [
      '<strong>A repo-wide search finds no <code>&lt;select class="input"&gt;</code> outside this fixture.</strong> The toolbar\'s selects migrated to wa-select; <code>workboard.css:212</code> is a rule with no subject.',
      "Were it live, <code>--workboard-control-height</code> (34px) would tie it to <code>.workboard input.input</code>, <code>.workboard-toolbar .btn</code> and <code>.workboard-select::part(combobox)</code> — four rules on one token.",
    ],
    verdict: {
      kind: "leave",
      note: "Leave alone, and delete instead. Standardizing a rule nothing renders is churn; the honest move is to remove workboard.css:212 in a follow-up and let the fixture row go with it. Flagged here rather than quietly fixed because deleting shipped CSS is a call for you, not for me.",
    },
  },
  {
    id: "board-widget-move-select",
    label: "Board card status select",
    where: "Chat board widget → card",
    kind: "native",
    source: "ui/src/lib/board/widgets/workboard-card.ts:67",
    habitat: `<div class="habitat-frame habitat-frame--narrow">
      <p class="habitat-note">board card widget</p>
      <article class="workboard-widget-card">
        <div class="workboard-widget-card__heading"><strong>Ship the gateway upgrade</strong><span class="workboard-widget__status workboard-widget__status--running">In progress</span></div>
        <dl class="workboard-widget-card__meta"><div><dt>Priority</dt><dd>High</dd></div><div><dt>Agent</dt><dd>Molty</dd></div></dl>
        <label class="workboard-widget-card__move"><span>Status</span><select aria-label="Status" data-measure><option>Todo</option><option>In progress</option><option>Done</option></select></label>
      </article>
    </div>`,
    locks: [
      "None. Its own rule used <code>border-radius: 7px</code>, a <code>--board-line</code> border and a <code>--panel</code> fill shared with nothing, and drew no chevron at all — the browser's raw arrow. This lane deleted it.",
      "It is the only control in its card, so nothing sits beside it to line up with.",
    ],
    verdict: {
      kind: "free",
      note: "Free to standardize, and the clearest win on the page: this was the one select in the app rendering a platform arrow next to a hand-picked 7px corner. Nothing depends on either.",
    },
  },
  {
    id: "settings-wa-select",
    label: "Settings wa-select",
    where: "Settings → language, model and channel pickers",
    kind: "wa-select",
    measurePart: "combobox",
    liveRoute: "/config",
    source:
      "ui/src/pages/config/language-select.ts:18 and the shared components/select-picker.ts:43",
    habitat: `<div class="settings-group">
      <div class="settings-row">
        <div class="settings-row__text"><span class="settings-row__title">Language</span><span class="settings-row__desc">Using default (System). Synced from the gateway.</span></div>
        <div class="settings-row__control"><button type="button" class="btn btn--icon" title="Reset to default">↺</button><wa-select class="settings-select" value="system" data-measure><span slot="label" class="settings-control__sr-label">Language</span><wa-option value="system" label="System (English)">System (English)</wa-option><wa-option value="pt-BR" label="Português (Brasil)">Português (Brasil)</wa-option></wa-select></div>
      </div>
      <div class="settings-row">
        <div class="settings-row__text"><span class="settings-row__title">Default model</span><span class="settings-row__desc">Rendered through the shared picker helper.</span></div>
        <div class="settings-row__control"><wa-select class="settings-select picker-select" style="width:100%;min-width:min(138px,100%)" value="opus"><span slot="label" class="settings-control__sr-label">Default model</span><wa-option class="picker-select__option" value="opus" label="Opus 5"><span class="picker-select__copy"><span class="picker-select__label">Opus 5</span><span class="picker-select__description">Highest quality</span></span></wa-option><wa-option class="picker-select__option" value="sonnet" label="Sonnet 4.6"><span class="picker-select__copy"><span class="picker-select__label">Sonnet 4.6</span></span></wa-option></wa-select></div>
      </div>
      <div class="settings-row">
        <div class="settings-row__text"><span class="settings-row__title">Display name</span></div>
        <div class="settings-row__control"><input class="settings-input" value="Vyctor" /></div>
      </div>
    </div>`,
    locks: [
      "<code>settings.css:726</code> pins the combobox to <code>min-height: var(--settings-control-height)</code> — the same 32px the native settings select and its sibling text input carry, but reached through a different rule. The wa-select host is <em>not</em> in the <code>settings.css:442</code> list, so this coupling is token-mediated, not selector-mediated.",
      '<strong>Already centralized:</strong> <code>components/select-picker.ts:43</code> (<code>renderPicker</code>) emits <code>class="settings-select picker-select …"</code> for every picker in the app. The wa-select family has a real primitive; the native selects and the dropdown triggers do not.',
      "Focus rings are parallel-but-separate rules with identical declarations: <code>settings.css:713</code> for the native, <code>:733</code> for the combobox.",
    ],
    verdict: {
      kind: "constrained",
      keep: "32px",
      note: "Same constraint as the native settings row, and the two must move in one commit or Settings shows two kinds of picker on adjacent rows. The good news is that renderPicker already funnels every wa-select through one helper, so this half of the app is a one-file change.",
    },
  },
  {
    id: "workboard-wa-select",
    label: "Workboard wa-select",
    where: "Workboard → card modal",
    kind: "wa-select",
    measurePart: "combobox",
    source:
      "ui/src/pages/workboard/workboard-select.ts:23 → select-picker.ts, styles/workboard.css:401",
    habitat: `<div class="workboard"><form class="workboard-draft habitat-frame">
      <p class="habitat-note">card modal — .workboard-draft__meta is a 2-column grid</p>
      <label class="workboard-field"><span>Title</span><input class="input workboard-draft__title" value="Ship the selects lane" /></label>
      <div class="workboard-draft__meta" style="display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:10px;margin-top:10px">
        <div class="workboard-field"><span>Status</span><wa-select class="settings-select picker-select workboard-select" style="width:100%;min-width:min(138px,100%)" value="backlog" data-measure><span slot="label" class="settings-control__sr-label">Status</span><wa-option class="picker-select__option" value="backlog" label="Backlog"><span class="picker-select__copy"><span class="picker-select__label">Backlog</span></span></wa-option><wa-option class="picker-select__option" value="doing" label="Doing"><span class="picker-select__copy"><span class="picker-select__label">Doing</span></span></wa-option></wa-select></div>
        <label class="workboard-field"><span>Labels</span><input class="input workboard-draft__labels" placeholder="release, blocked" /></label>
      </div>
    </form></div>`,
    locks: [
      "<strong>This element carries both families at once:</strong> <code>settings-select</code> (32px) and <code>workboard-select</code> (34px). The board wins on specificity. Any settings-side height change silently does nothing here — which is worth knowing before approving one.",
      "Four rules ride <code>--workboard-control-height</code>: the combobox, <code>.workboard input.input</code>, <code>.workboard-draft .btn</code>, and the agent select's trigger. They fill a 2-column grid where a mismatch is immediately visible across the gap.",
      "<code>.workboard-select</code> overrides the picker helper's inline <code>min-width:min(138px,100%)</code> with <code>width:100%; min-width:0</code>.",
    ],
    verdict: {
      kind: "constrained",
      keep: "34px",
      note: "Standardize through renderPicker with the board's token still winning, in the same change as the settings wa-select. The double class list is the thing to watch: whoever does the pass must confirm the board override still lands, or these comboboxes quietly drop to 32px and break the modal grid.",
    },
  },
];

/**
 * What a standardization pass would converge on. Chosen to be the box the
 * largest number of families already sit at, so approving it moves the fewest
 * controls: the settings row rhythm, which both Settings spellings, the Usage
 * bar and the app-wide default already share. It is a *select* box — a control
 * holding one value and saying which — which is why the dossier's verdicts
 * decline it for the icon buttons and action menus that merely open a panel.
 */
export const CANONICAL_TRIGGER_PROPOSAL: CanonicalTriggerProposal = {
  height:
    "var(--select-height, 32px); families that own a row rhythm override (.field 38, workboard 34)",
  fontSize: "var(--control-ui-input-text-size); bars with their own smaller type keep it",
  padding: "0 36px 0 10px — the trailing inset reserves the chevron's room",
  radius: "var(--radius-md) = 10px, superellipse via the shared corner block",
  border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
  fill: "color-mix(in srgb, var(--bg) 80%, var(--bg-elevated) 20%)",
  chevron: "var(--select-chevron), no-repeat, right 10px center, 16px — one value only",
};
