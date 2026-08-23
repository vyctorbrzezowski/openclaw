// Lazy boundary for Mermaid diagram rendering. Everything behind the dynamic
// import stays out of the startup chunks; this module is loaded only when a
// ```mermaid fence is actually enhanced in rendered markdown.
export type MermaidThemeMode = "light" | "dark";
export type MermaidRenderResult = { state: "ok"; svg: string } | { state: "error" };

type MermaidApi = Awaited<typeof import("mermaid")>["default"];
type DomPurify = Awaited<typeof import("dompurify")>["default"];

// Imported dynamically on purpose: a static edge from this chunk back into the
// dompurify group makes the bundler duplicate the library instead of sharing
// it under strict execution order.
let domPurifyPromise: Promise<DomPurify> | null = null;

function loadDomPurify(): Promise<DomPurify> {
  domPurifyPromise ??= import("dompurify").then(({ default: purify }) => purify);
  return domPurifyPromise;
}

// Some malformed inputs leave mermaid's render promise unsettled; without this
// bound the fence would sit "pending" forever instead of falling back to its
// visible code block.
const MERMAID_RENDER_TIMEOUT_MS = 15_000;

function withRenderTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("mermaid render timed out")),
      MERMAID_RENDER_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

let mermaidSequence = 0;

// Diagram labels must stay plain SVG text: htmlLabels would wrap text in
// foreignObject, which the sanitizer below then strips and which CSP-unfriendly
// HTML-in-SVG surfaces make review harder. Text labels keep one canonical shape.
// suppressErrorRendering keeps parse failures out of the DOM: without it
// mermaid appends its bomb-graphic error SVG straight to <body> on every
// invalid fence.
const MERMAID_INITIALIZE_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  suppressErrorRendering: true,
  // Top-level flag is what mermaid 11 actually reads (flowchart.htmlLabels is
  // a deprecated alias): labels become plain SVG <text> instead of
  // foreignObject HTML, which the sanitizer forbids below.
  htmlLabels: false,
  sequence: { mirrorActors: false },
} as const;

async function loadMermaid(mode: MermaidThemeMode): Promise<MermaidApi> {
  const { default: mermaid } = await import("mermaid");
  // initialize() owns the shared config singleton; re-applying it keeps every
  // render aligned with the caller's theme mode after a light/dark flip.
  mermaid.initialize({
    ...MERMAID_INITIALIZE_CONFIG,
    theme: mode === "dark" ? "dark" : "default",
  });
  return mermaid;
}

// Render an SVG that survives the sanitizer: mermaid runs with
// `securityLevel: "strict"`, and the output is filtered again here so event
// handlers, scripts, and HTML-in-SVG containers never reach message DOM.
async function sanitizeMermaidSvg(svg: string): Promise<string> {
  const DOMPurify = await loadDomPurify();
  // The style element stays: mermaid scopes every diagram color and font into
  // a per-render <style> keyed by the render id, and stripping it turns nodes
  // into unstyled black boxes. Content comes from mermaid's theme pipeline
  // under securityLevel "strict"; gateway CSP constrains any injected CSS.
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["style"],
    FORBID_TAGS: ["foreignObject", "script", "iframe"],
    KEEP_CONTENT: false,
  });
}

export async function renderMermaidDiagram(
  source: string,
  mode: MermaidThemeMode,
): Promise<MermaidRenderResult> {
  try {
    const mermaid = await loadMermaid(mode);
    mermaidSequence += 1;
    const { svg } = await withRenderTimeout(
      mermaid.render(`openclaw-mermaid-${mermaidSequence}`, source),
    );
    return { state: "ok", svg: await sanitizeMermaidSvg(svg) };
  } catch {
    // Parse and render failures are reported to the caller, never thrown:
    // invalid user diagrams are content, not errors.
    return { state: "error" };
  }
}
