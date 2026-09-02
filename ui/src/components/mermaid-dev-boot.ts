// Local-only visual proof harness (untracked, never committed): renders the
// real markdown pipeline with a mermaid fence and wires the real enhancer.
import { initializeMarkdownCodeBlocks } from "./markdown-code-blocks.ts";
import { toSanitizedMarkdownHtml } from "./markdown.ts";

const diagram = `flowchart TD
  A[Operator sends prompt] --> B{Agent plans}
  B -->|tool call| C[Gateway executes]
  B -->|reply| D[Message streams]
  C --> D`;

const host = document.getElementById("host")!;
host.style.cssText =
  "max-width:720px;margin:24px auto;padding:16px;font-family:system-ui,sans-serif";
host.innerHTML = `
  <p>Diagram below must render as SVG; invalid one stays as readable code.</p>
  <div class="chat-text">${toSanitizedMarkdownHtml(
    "```mermaid\n" + diagram + "\n```\n\nInvalid one:\n\n\`\`\`mermaid\nflowchart TD\n  A[[broken\n\`\`\`",
    { codeBlockInteraction: "interactive" },
  )}</div>
`;

initializeMarkdownCodeBlocks(host);
