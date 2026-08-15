/* @vitest-environment jsdom */

import { render, type TemplateResult } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import { icons } from "./icons.ts";

afterEach(() => {
  document.body.replaceChildren();
});

function renderIcon(body: TemplateResult): SVGElement | null {
  const container = document.createElement("div");
  document.body.append(container);
  render(body, container);
  return container.querySelector("svg");
}

describe("vendored Solar outline icons", () => {
  it("exposes the shared presentation marker and SVG fill contract", () => {
    const svg = renderIcon(icons.search);

    expect(svg?.hasAttribute("data-lucide-icon")).toBe(true);
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("fill")).toBe("currentColor");
    expect(svg?.getAttribute("stroke")).toBe("none");
  });

  // Glyphs Solar outline has no honest match for stay stroked. They must sit on
  // the same 24px grid at Solar's 1.5 outline weight, or a kept glyph reads as a
  // different icon set beside its Solar neighbours in the same row.
  it("keeps the retained stroked glyphs on Solar's grid and optical weight", () => {
    const svg = renderIcon(icons.gitBranch);

    expect(svg?.hasAttribute("data-lucide-icon")).toBe(true);
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("fill")).toBe("none");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.getAttribute("stroke-width")).toBe("1.5");
  });

  it("renders one shared menu-dots glyph for both overflow names", () => {
    expect(icons.ellipsis).toBe(icons.moreHorizontal);
  });
});
