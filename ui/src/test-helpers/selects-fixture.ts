// The selects context dossier: every select-like control in the Control UI, each
// shown inside the region it actually ships in, with its box measured.
//
// The plain gallery this replaces proved that the families differ. It could not
// answer the question that decides what to do about it — whether a unified
// trigger would still sit right among its neighbours — because a control on a
// blank row has no neighbours to sit wrong beside. So each family here renders
// its real surrounding region under production class names, and the numbers
// beside it are read off that live element rather than transcribed, which keeps
// the dossier honest as the stylesheets move.
//
// It renders outside the app shell, so it loads the app stylesheet plus every
// route stylesheet that owns one of these regions; without them the class names
// resolve to nothing and the page silently proves something else.
import "../styles.css";
import "../styles/usage.css";
import "../styles/cron.css";
import "../styles/board.css";
import "../styles/workboard.css";
import "../styles/model-setup.css";
import "../styles/new-session.css";
import "../styles/sessions.css";
import "../styles/settings.css";
import "../styles/config.css";
import "../styles/chat.css";
import "../components/web-awesome.ts";
import "../components/web-awesome-select.ts";
import "../components/web-awesome-popover.ts";
import type { BlendVerdict, SelectFamily } from "./selects-fixture-contract.ts";
import { CANONICAL_TRIGGER_PROPOSAL, SELECT_FAMILIES } from "./selects-fixture-families.ts";
import { TRIGGER_FAMILIES } from "./selects-fixture-triggers.ts";

/** Boxes first, then the things that open panels — the order the dossier argues in. */
const ALL_FAMILIES: readonly SelectFamily[] = [...SELECT_FAMILIES, ...TRIGGER_FAMILIES];

const VERDICT_LABEL: Record<BlendVerdict["kind"], string> = {
  free: "free to standardize",
  constrained: "standardize with a constraint",
  leave: "leave alone",
};

/**
 * `source` is a file path plus prose, and prose about selects contains tag
 * names: one entry reads "no matching <select class=\"input\"> exists", which
 * interpolated raw opened a real select in the parse stream and swallowed the
 * next card's habitat whole — the board card silently lost its control and its
 * metrics read "no target". Locks and notes are authored markup and stay raw;
 * this field is text and is treated as text.
 */
function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function verdictBadge(verdict: BlendVerdict): string {
  const detail = verdict.kind === "constrained" ? ` — keep ${escapeText(verdict.keep)}` : "";
  return `<span class="dossier__badge dossier__badge--${verdict.kind}">${VERDICT_LABEL[verdict.kind]}${detail}</span>`;
}

function renderCard(family: SelectFamily): string {
  const locks =
    family.locks.length === 0
      ? `<p class="dossier__none">Nothing found. Its size is its own.</p>`
      : `<ul class="dossier__locks">${family.locks.map((lock) => `<li>${lock}</li>` /* authored markup: locks cite <code> spans by design */).join("")}</ul>`;
  return `<article class="dossier" id="${family.id}" data-verdict="${family.verdict.kind}">
    <details class="dossier__detail" open>
      <summary class="dossier__summary">
        <span class="dossier__title">
          <span class="dossier__name">${escapeText(family.label)}</span>
          <span class="dossier__kind">${family.kind}</span>
        </span>
        <span class="dossier__where">${escapeText(family.where)}</span>
        ${verdictBadge(family.verdict)}
      </summary>
      <div class="dossier__panel">
        <div class="dossier__habitat" data-family="${family.id}">${family.habitat}</div>
        <aside class="dossier__aside">
          <h3>Reconstructed from</h3>
          <p class="dossier__source"><code>${escapeText(family.source)}</code>${
            family.liveRoute
              ? ` · <a href="${family.liveRoute}" target="_blank" rel="noreferrer">see it live</a>`
              : ""
          }</p>
          <h3>Measured</h3>
          <table class="dossier__metrics" data-metrics-for="${family.id}">
            <tbody><tr><td colspan="2">measuring…</td></tr></tbody>
          </table>
          <h3>Neighbour locks</h3>
          ${locks}
          <h3>Blend verdict</h3>
          <p class="dossier__note">${escapeText(family.verdict.note)}</p>
        </aside>
      </div>
    </details>
  </article>`;
}

/**
 * The rows of the metrics table, in the order a reader compares them.
 *
 * Computed height rather than getBoundingClientRect: several habitats sit in
 * regions that ship an entrance animation (the dialog card scales from 0.95),
 * and a rect read mid-animation reported a .field select as 36.1px when its
 * rule says 38. The used value is the number the stylesheet is arguing about.
 */
function readMetrics(box: Element): readonly (readonly [string, string])[] {
  const style = getComputedStyle(box);
  const border = `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`;
  return [
    ["height", style.height],
    ["font-size", style.fontSize],
    ["padding", style.padding],
    ["radius", style.borderTopLeftRadius],
    ["border", style.borderTopStyle === "none" ? "none" : border],
    ["fill", style.backgroundColor],
  ];
}

/**
 * The box a reader sees is not always the element in the markup: Web Awesome
 * draws its combobox and its trigger chrome inside a shadow root, so a family
 * that names a part is measured there instead of on its host.
 */
function resolveMeasuredBox(family: SelectFamily, root: Element): Element | undefined {
  const host = root.querySelector("[data-measure]");
  if (!host) {
    return undefined;
  }
  if (!family.measurePart) {
    return host;
  }
  return host.shadowRoot?.querySelector(`[part~="${family.measurePart}"]`) ?? undefined;
}

function paintMetrics(family: SelectFamily): void {
  const habitat = document.querySelector(`.dossier__habitat[data-family="${family.id}"]`);
  const table = document.querySelector(`[data-metrics-for="${family.id}"] tbody`);
  if (!habitat || !table) {
    return;
  }
  const box = resolveMeasuredBox(family, habitat);
  if (!box) {
    table.innerHTML = `<tr><td colspan="2" class="dossier__none">no [data-measure] target</td></tr>`;
    return;
  }
  table.innerHTML = readMetrics(box)
    .map(([name, value]) => `<tr><th>${name}</th><td>${value}</td></tr>`)
    .join("");
}

/** Web Awesome hosts have no box until they upgrade, so measuring races them. */
async function waitForWebAwesome(): Promise<void> {
  await Promise.all(
    ["wa-select", "wa-dropdown", "wa-popover"].map((tag) => customElements.whenDefined(tag)),
  );
  const hosts = [
    ...document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>(
      "wa-select, wa-dropdown, wa-popover",
    ),
  ];
  await Promise.all(hosts.map((host) => Promise.resolve(host.updateComplete)));
  await document.fonts?.ready;
}

function renderSummaryTable(): string {
  const counts = { free: 0, constrained: 0, leave: 0 };
  for (const family of ALL_FAMILIES) {
    counts[family.verdict.kind] += 1;
  }
  const proposal = CANONICAL_TRIGGER_PROPOSAL;
  return `<section class="dossier-summary" id="summary">
    <h2>Summary</h2>
    <p class="dossier-summary__counts">
      <strong>${ALL_FAMILIES.length}</strong> families —
      <span class="dossier__badge dossier__badge--free">${counts.free} free</span>
      <span class="dossier__badge dossier__badge--constrained">${counts.constrained} constrained</span>
      <span class="dossier__badge dossier__badge--leave">${counts.leave} leave alone</span>
    </p>
    <h3>The canonical trigger, if you say go</h3>
    <table class="dossier__metrics dossier__metrics--proposal">
      <tbody>
        <tr><th>height</th><td>${proposal.height}</td></tr>
        <tr><th>font-size</th><td>${proposal.fontSize}</td></tr>
        <tr><th>padding</th><td>${proposal.padding}</td></tr>
        <tr><th>radius</th><td>${proposal.radius}</td></tr>
        <tr><th>border</th><td>${proposal.border}</td></tr>
        <tr><th>fill</th><td>${proposal.fill}</td></tr>
        <tr><th>chevron</th><td>${proposal.chevron}</td></tr>
      </tbody>
    </table>
  </section>`;
}

function renderIndex(): string {
  const rows = ALL_FAMILIES.map(
    (family) =>
      `<li><a href="#${family.id}">${family.label}</a><span class="dossier__badge dossier__badge--${family.verdict.kind}">${family.verdict.kind}</span></li>`,
  ).join("");
  return `<nav class="dossier-index"><ol>${rows}</ol></nav>`;
}

async function mountSelectsFixture(): Promise<void> {
  const root = document.querySelector("#app");
  if (!root) {
    throw new Error("selects fixture: missing #app root");
  }
  root.innerHTML = `${renderIndex()}<div class="dossier-list">${ALL_FAMILIES.map(renderCard).join("")}</div>${renderSummaryTable()}`;
  await waitForWebAwesome();
  for (const family of ALL_FAMILIES) {
    paintMetrics(family);
  }
  // Collapsing a card unmounts nothing, but reopening one that was closed at
  // measure time gives its first real geometry only now.
  root.addEventListener(
    "toggle",
    (event) => {
      const detail = event.target;
      if (!(detail instanceof HTMLDetailsElement) || !detail.open) {
        return;
      }
      const id = detail.closest(".dossier")?.id;
      const family = ALL_FAMILIES.find((entry) => entry.id === id);
      if (family) {
        paintMetrics(family);
      }
    },
    true,
  );
}

void mountSelectsFixture();
