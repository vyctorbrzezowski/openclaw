/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeMarkdownCodeBlocks } from "./markdown-code-blocks.ts";
import { toSanitizedMarkdownHtml } from "./markdown.ts";

const VALID_FLOWCHART = "flowchart TD\n  A[Start] --> B{Ready?}\n  B -- yes --> C[Ship]";
const INVALID_DIAGRAM = "flowchart TD\n  A[[Unclosed";

function installJsdomSvgStubs(): void {
  // Mermaid measures label geometry through getBBox/getComputedTextLength and
  // assembles theme CSS through constructable stylesheets; jsdom implements
  // none of them. Deterministic stubs keep the real renderer running headless.
  if (!Object.hasOwn(SVGElement.prototype, "getBBox")) {
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      value: () => ({ x: 0, y: 0, width: 80, height: 18 }),
      configurable: true,
    });
  }
  if (!Object.hasOwn(SVGElement.prototype, "getComputedTextLength")) {
    Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
      value() {
        return String(this.textContent ?? "").length * 7;
      },
      configurable: true,
    });
  }
  if (window.CSSStyleSheet === undefined) {
    class StubCssStyleSheet {
      #rules: string[] = [];
      get cssRules() {
        return this.#rules.map((cssText) => ({ cssText }));
      }
      insertRule(rule: string, index?: number) {
        this.#rules.splice(index ?? this.#rules.length, 0, String(rule));
        return index ?? this.#rules.length;
      }
      replaceSync(text: string) {
        this.#rules = String(text)
          .split("}")
          .filter((chunk) => chunk.trim())
          .map((chunk) => `${chunk}}`);
      }
    }
    Object.defineProperty(window, "CSSStyleSheet", {
      value: StubCssStyleSheet,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "CSSStyleSheet", {
      value: StubCssStyleSheet,
      configurable: true,
      writable: true,
    });
  }
  if (window.matchMedia === undefined) {
    Object.defineProperty(window, "matchMedia", {
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }),
      configurable: true,
    });
  }
}

function renderInteractiveMarkdown(markdown: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = toSanitizedMarkdownHtml(markdown, { codeBlockInteraction: "interactive" });
  document.body.append(host);
  return host;
}

describe("initializeMarkdownCodeBlocks mermaid diagrams", () => {
  beforeEach(() => {
    installJsdomSvgStubs();
    document.documentElement.dataset.themeMode = "dark";
  });

  afterEach(() => {
    document.body.textContent = "";
  });

  it("replaces a closed mermaid fence with a rendered diagram", async () => {
    const host = renderInteractiveMarkdown(`Before\n\n\`\`\`mermaid\n${VALID_FLOWCHART}\n\`\`\`\n`);
    initializeMarkdownCodeBlocks(host);
    await vi.waitFor(
      () => {
        const figure = host.querySelector<HTMLElement>("figure.mermaid-diagram");
        expect(figure?.dataset.mermaidState).toBe("ok");
        expect(figure?.querySelector("svg")).toBeTruthy();
      },
      { timeout: 20_000 },
    );
    expect(
      host.querySelector("svg")?.querySelectorAll("path, rect, polygon").length,
    ).toBeGreaterThan(0);
  });

  it("keeps the diagram source readable when the diagram is invalid", async () => {
    const host = renderInteractiveMarkdown(`\`\`\`mermaid\n${INVALID_DIAGRAM}\n\`\`\``);
    initializeMarkdownCodeBlocks(host);
    await vi.waitFor(
      () => {
        const wrapper = host.querySelector<HTMLElement>(".code-block-wrapper");
        expect(wrapper?.dataset.mermaidState).toBe("failed");
      },
      { timeout: 20_000 },
    );
    const code = host.querySelector(".code-block-wrapper pre code");
    expect(code?.textContent).toContain(INVALID_DIAGRAM);
  });

  it("does not treat non-mermaid fences as diagrams", () => {
    const host = renderInteractiveMarkdown("```bash\necho hi\n```");
    initializeMarkdownCodeBlocks(host);
    expect(host.querySelector(".mermaid-diagram")).toBeNull();
    expect(host.querySelector("code.language-bash")).toBeTruthy();
  });

  // Distinct sources per test keep the module-level diagram cache from masking
  // behavior across tests.
  it("re-renders rendered diagrams when the theme mode flips", async () => {
    const host = renderInteractiveMarkdown(
      "```mermaid\nflowchart TD\n  A[Alpha] --> B{Beta?}\n```",
    );
    document.documentElement.dataset.themeMode = "dark";
    initializeMarkdownCodeBlocks(host);
    await vi.waitFor(
      () =>
        expect(host.querySelector('figure.mermaid-diagram[data-mermaid-state="ok"]')).toBeTruthy(),
      { timeout: 25_000 },
    );
    const darkSvg = host.querySelector("figure.mermaid-diagram")?.innerHTML;
    expect(darkSvg).toContain("<svg");
    document.documentElement.dataset.themeMode = "light";
    await vi.waitFor(
      () => {
        const lightSvg = host.querySelector("figure.mermaid-diagram")?.innerHTML;
        expect(lightSvg && lightSvg !== darkSvg).toBe(true);
      },
      { timeout: 25_000 },
    );
    expect(host.querySelector('figure.mermaid-diagram[data-mermaid-state="ok"]')).toBeTruthy();
  });

  it("renders one diagram per fence across repeated initializations", async () => {
    const host = renderInteractiveMarkdown("```mermaid\nflowchart LR\n  X --> Y\n```");
    initializeMarkdownCodeBlocks(host);
    initializeMarkdownCodeBlocks(host);
    await vi.waitFor(
      () =>
        expect(host.querySelector('figure.mermaid-diagram[data-mermaid-state="ok"]')).toBeTruthy(),
      { timeout: 25_000 },
    );
    expect(host.querySelectorAll("figure.mermaid-diagram")).toHaveLength(1);
  });

  // Last on purpose: this input leaves an abandoned render inside mermaid's
  // internal queue in jsdom, which would slow later renders in this file.
  it("never exposes executable markup from hostile labels", async () => {
    const host = renderInteractiveMarkdown(
      '```mermaid\nflowchart TD\n  A["<img src=x onerror=alert(1)>"] --> B\n```',
    );
    initializeMarkdownCodeBlocks(host);
    await vi.waitFor(
      () => {
        const settled = host.querySelector<HTMLElement>("[data-mermaid-state]");
        expect(["ok", "failed"].includes(settled?.dataset.mermaidState ?? "")).toBe(true);
      },
      { timeout: 25_000 },
    );
    const diagram = host.querySelector("figure.mermaid-diagram");
    // Either outcome is safe: a sanitized diagram, or the recorded failure
    // whose visible fallback is the untouched source code block.
    if (diagram) {
      expect(diagram.innerHTML).not.toMatch(/<script|<img|onerror|foreignObject/i);
      expect(diagram.dataset.mermaidState).toBe("ok");
    } else {
      expect(host.querySelector('.code-block-wrapper[data-mermaid-state="failed"]')).toBeTruthy();
      expect(host.textContent).toContain("onerror");
    }
  });
});
