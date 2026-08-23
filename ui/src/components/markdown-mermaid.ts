// Post-render enhancer that turns fenced ```mermaid blocks into diagrams.
// Runs inside the markdown DOM lifecycle (`initializeMarkdownCodeBlocks`
// hosts), so every transcript commit re-runs it against fresh nodes; rendered
// SVGs are cached by source+mode to keep that churn cheap. Invalid diagrams
// keep their code block visible — a failed render must never go silent.
import type { MermaidRenderResult, MermaidThemeMode } from "./markdown-mermaid.runtime.ts";
import { renderMermaidDiagram } from "./markdown-mermaid.runtime.ts";

// Diagram sources beyond this bound stay as code: rendering is O(source) with
// heavy layout work, and no legitimate chat diagram needs novel-sized input.
const MERMAID_SOURCE_CHAR_LIMIT = 30_000;
// Covers transcripts that re-render frequently; entries are keyed by mode so a
// theme flip naturally misses instead of serving stale colors.
const MERMAID_CACHE_LIMIT = 50;

const enhancedWrappers = new WeakSet<HTMLElement>();
// Tracked nodes carry their source so theme flips can re-render without
// re-parsing DOM; entries are dropped once detached (transcript re-rendered).
const trackedMermaidNodes = new Map<HTMLElement, string>();
const mermaidCache = new Map<string, MermaidRenderResult>();

function currentMermaidThemeMode(): MermaidThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }
  return document.documentElement.dataset.themeMode === "light" ? "light" : "dark";
}

function cachedMermaidResult(key: string): MermaidRenderResult | undefined {
  const cached = mermaidCache.get(key);
  if (cached === undefined) {
    return undefined;
  }
  mermaidCache.delete(key);
  mermaidCache.set(key, cached);
  return cached;
}

function storeMermaidResult(key: string, result: MermaidRenderResult): void {
  mermaidCache.set(key, result);
  if (mermaidCache.size <= MERMAID_CACHE_LIMIT) {
    return;
  }
  const oldest = mermaidCache.keys().next().value;
  if (oldest !== undefined) {
    mermaidCache.delete(oldest);
  }
}

function releaseDetachedMermaidNodes(): void {
  for (const node of trackedMermaidNodes.keys()) {
    if (!node.isConnected) {
      trackedMermaidNodes.delete(node);
    }
  }
}

async function renderMermaidNode(node: HTMLElement, source: string): Promise<void> {
  const mode = currentMermaidThemeMode();
  const key = `${mode}\0${source}`;
  let result = cachedMermaidResult(key);
  if (!result) {
    node.dataset.mermaidState = "pending";
    result = await renderMermaidDiagram(source, mode);
    // A theme flip while rendering must not land stale colors; the observer
    // re-enqueues this node with the new mode.
    if (currentMermaidThemeMode() !== mode) {
      return;
    }
    storeMermaidResult(key, result);
  }
  if (!node.isConnected) {
    return;
  }
  if (result.state === "error") {
    // Keep the original code block exactly as rendered: the source stays the
    // visible fallback for invalid or oversized diagrams.
    node.dataset.mermaidState = "failed";
    return;
  }
  if (node.tagName !== "FIGURE") {
    const figure = document.createElement("figure");
    figure.className = "mermaid-diagram";
    figure.dataset.mermaidState = "ok";
    figure.innerHTML = result.svg;
    trackedMermaidNodes.delete(node);
    trackedMermaidNodes.set(figure, source);
    node.replaceWith(figure);
    return;
  }
  node.innerHTML = result.svg;
  node.dataset.mermaidState = "ok";
}

let themeObserver: MutationObserver | null = null;

function ensureMermaidThemeObserver(): void {
  if (themeObserver || typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return;
  }
  themeObserver = new MutationObserver(() => {
    releaseDetachedMermaidNodes();
    for (const [node, source] of trackedMermaidNodes) {
      void renderMermaidNode(node, source);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-mode"],
  });
}

export function enhanceMarkdownMermaidBlocks(root: ParentNode): void {
  for (const code of root.querySelectorAll("pre > code.language-mermaid")) {
    const wrapper = code.closest<HTMLElement>(".code-block-wrapper");
    if (!wrapper || enhancedWrappers.has(wrapper)) {
      continue;
    }
    const source = code.textContent ?? "";
    if (!source.trim() || source.length > MERMAID_SOURCE_CHAR_LIMIT) {
      continue;
    }
    enhancedWrappers.add(wrapper);
    trackedMermaidNodes.set(wrapper, source);
    void renderMermaidNode(wrapper, source);
  }
  ensureMermaidThemeObserver();
}
