type ChromeFixtureSection = {
  id: string;
  label: string;
  path: string;
  boundarySelector: string;
  requiredSelectors?: readonly string[];
};

const sections: readonly ChromeFixtureSection[] = [
  {
    id: "activity",
    label: "Activity",
    path: "/activity",
    boundarySelector: "openclaw-activity-page .activity-feed__toolbar",
    requiredSelectors: ["openclaw-activity-page .activity-feed__people-control"],
  },
  {
    id: "dashboards",
    label: "Dashboards",
    path: "/dashboards",
    boundarySelector: "openclaw-dashboards-page .content-header",
  },
  {
    id: "usage",
    label: "Usage",
    path: "/usage",
    boundarySelector: "openclaw-usage-page .usage-header",
    requiredSelectors: [
      "openclaw-usage-page .agent-scope-control",
      "openclaw-usage-page .usage-cache-warning",
    ],
  },
  {
    id: "automations",
    label: "Automations",
    path: "/automations",
    boundarySelector: "openclaw-cron-page .cron-toolbar",
  },
  {
    id: "tasks",
    label: "Tasks",
    path: "/tasks",
    boundarySelector: "openclaw-tasks-page .content-header",
    requiredSelectors: ["openclaw-tasks-page .agent-scope-control"],
  },
  {
    id: "sessions",
    label: "Sessions",
    path: "/sessions",
    boundarySelector: "openclaw-sessions-page .sessions-filter-bar",
    requiredSelectors: ["openclaw-sessions-page .agent-scope-control"],
  },
  {
    id: "worktrees",
    label: "Worktrees",
    path: "/worktrees",
    boundarySelector: "openclaw-worktrees-page .settings-section__header",
  },
  {
    id: "plugins",
    label: "Plugins",
    path: "/settings/plugins",
    boundarySelector: "openclaw-plugins-page .plugins-toolbar",
  },
  {
    id: "skills",
    label: "Skills",
    path: "/skills",
    boundarySelector: "openclaw-skills-page .plugins-toolbar",
    requiredSelectors: ["openclaw-skills-page .skills-toolbar__agent"],
  },
  {
    id: "skill-workshop",
    label: "Skill Workshop",
    path: "/skills/workshop",
    boundarySelector: "openclaw-skill-workshop-page .sw-workshop-toolbar",
  },
  {
    id: "workboard",
    label: "Workboard",
    path: "/workboard",
    boundarySelector: "openclaw-workboard-page .workboard-health",
    requiredSelectors: ["openclaw-workboard-page .agent-scope-control"],
  },
  {
    id: "logs",
    label: "Logs",
    path: "/logs",
    boundarySelector: "openclaw-logs-page .logs-card > .settings-row:nth-child(2)",
  },
];

const frameStyles = `
  html, body {
    width: 100% !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
    background: var(--bg) !important;
  }
  .shell {
    display: block !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    animation: none !important;
  }
  .shell > :not(.content) {
    display: none !important;
  }
  .content,
  .shell--settings:not(.shell--mobile-nav) .content {
    box-sizing: border-box !important;
    display: block !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 20px 24px 0 !important;
    overflow: visible !important;
  }
  .content > * + * {
    margin-top: 16px !important;
  }
  openclaw-router-outlet {
    display: block !important;
  }
`;

const fixtureStyles = `
  :root {
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #0c0d10;
    color: #f3f4f6;
  }
  :root[data-theme-mode="light"] {
    color-scheme: light;
    background: #f4f5f7;
    color: #17181c;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; min-width: 1120px; background: inherit; color: inherit; }
  button { font: inherit; }
  .chrome-fixture {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 24px;
    width: min(1580px, 100%);
    margin: 0 auto;
    padding: 24px;
  }
  .chrome-fixture__nav {
    position: sticky;
    top: 24px;
    align-self: start;
    display: grid;
    gap: 16px;
    max-height: calc(100vh - 48px);
    padding: 16px;
    overflow: auto;
    border: 1px solid #292c33;
    border-radius: 14px;
    background: #14161b;
  }
  :root[data-theme-mode="light"] .chrome-fixture__nav {
    border-color: #d9dce2;
    background: #ffffff;
  }
  .chrome-fixture__nav h1 { margin: 0; font-size: 15px; letter-spacing: -.02em; }
  .chrome-fixture__nav p { margin: 4px 0 0; color: #9298a5; font-size: 11px; line-height: 1.4; }
  .chrome-fixture__links { display: grid; gap: 2px; }
  .chrome-fixture__links a {
    padding: 7px 9px;
    border-radius: 7px;
    color: inherit;
    font-size: 12px;
    text-decoration: none;
  }
  .chrome-fixture__links a:hover { background: #22252c; }
  :root[data-theme-mode="light"] .chrome-fixture__links a:hover { background: #eef0f4; }
  .chrome-fixture__themes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .chrome-fixture__themes button {
    min-height: 30px;
    border: 1px solid #343842;
    border-radius: 7px;
    background: transparent;
    color: inherit;
  }
  .chrome-fixture__themes button[aria-pressed="true"] { background: #292d35; }
  :root[data-theme-mode="light"] .chrome-fixture__themes button[aria-pressed="true"] { background: #e5e8ee; }
  .chrome-fixture__stack { display: grid; gap: 20px; min-width: 0; }
  .chrome-fixture__section {
    scroll-margin-top: 20px;
    overflow: hidden;
    border: 1px solid #292c33;
    border-radius: 16px;
    background: #101216;
    box-shadow: 0 12px 30px rgb(0 0 0 / .18);
  }
  :root[data-theme-mode="light"] .chrome-fixture__section {
    border-color: #d9dce2;
    background: #ffffff;
    box-shadow: 0 12px 30px rgb(18 24 40 / .07);
  }
  .chrome-fixture__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 10px 14px;
    border-bottom: 1px solid #292c33;
  }
  :root[data-theme-mode="light"] .chrome-fixture__section-header { border-color: #e0e3e8; }
  .chrome-fixture__section h2 { margin: 0; font-size: 12px; letter-spacing: .02em; }
  .chrome-fixture__status { color: #89909e; font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .chrome-fixture__frame {
    display: block;
    width: 100%;
    height: 720px;
    border: 0;
    background: transparent;
  }
`;

function applyTheme(root: Document, mode: "dark" | "light") {
  root.documentElement.dataset.theme = mode;
  root.documentElement.dataset.themeMode = mode;
  root.documentElement.dataset.themeResolved = mode;
  root.documentElement.classList.toggle("wa-light", mode === "light");
  root.documentElement.classList.toggle("wa-dark", mode === "dark");
  root.documentElement.style.colorScheme = mode;
}

function currentTheme(): "dark" | "light" {
  return document.documentElement.dataset.themeMode === "light" ? "light" : "dark";
}

function setTheme(mode: "dark" | "light") {
  applyTheme(document, mode);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme]")) {
    button.setAttribute("aria-pressed", String(button.dataset.theme === mode));
  }
  for (const frame of document.querySelectorAll<HTMLIFrameElement>(".chrome-fixture__frame")) {
    if (frame.contentDocument) {
      applyTheme(frame.contentDocument, mode);
    }
  }
}

function frameReady(frame: HTMLIFrameElement, section: ChromeFixtureSection, status: HTMLElement) {
  const frameDocument = frame.contentDocument;
  if (!frameDocument) {
    status.textContent = "frame unavailable";
    return;
  }
  const style = frameDocument.createElement("style");
  style.dataset.chromeUnifyFixture = "true";
  style.textContent = frameStyles;
  frameDocument.head.append(style);
  applyTheme(frameDocument, currentTheme());

  const startedAt = performance.now();
  const measure = () => {
    const boundary = frameDocument.querySelector<HTMLElement>(section.boundarySelector);
    const requiredReady = (section.requiredSelectors ?? []).every((selector) =>
      frameDocument.querySelector(selector),
    );
    if (!boundary || !requiredReady) {
      if (performance.now() - startedAt < 20_000) {
        window.setTimeout(measure, 80);
        return;
      }
      status.textContent = "chrome not found";
      frame.dataset.renderState = "error";
      return;
    }
    const resizeFrame = () => {
      const bottom = boundary.getBoundingClientRect().bottom;
      frame.style.height = `${Math.max(96, Math.ceil(bottom + 20))}px`;
      frame.dataset.renderState = "ready";
      status.textContent = "real route · ready";
    };
    requestAnimationFrame(resizeFrame);
    window.setTimeout(resizeFrame, 250);
    void frameDocument.fonts?.ready.then(resizeFrame);
  };
  measure();
}

const style = document.createElement("style");
style.textContent = fixtureStyles;
document.head.append(style);

const shell = document.createElement("main");
shell.className = "chrome-fixture";
const nav = document.createElement("nav");
nav.className = "chrome-fixture__nav";
nav.setAttribute("aria-label", "Page chrome index");
nav.innerHTML = `
  <div><h1>Control UI chrome</h1><p>Real routes, one comparison bench.</p></div>
  <div class="chrome-fixture__links"></div>
  <div class="chrome-fixture__themes" aria-label="Theme">
    <button type="button" data-theme="dark">Dark</button>
    <button type="button" data-theme="light">Light</button>
  </div>
`;
const links = nav.querySelector<HTMLElement>(".chrome-fixture__links");
const stack = document.createElement("div");
stack.className = "chrome-fixture__stack";

for (const section of sections) {
  const link = document.createElement("a");
  link.href = `#${section.id}`;
  link.textContent = section.label;
  links?.append(link);

  const article = document.createElement("section");
  article.id = section.id;
  article.className = "chrome-fixture__section";
  article.innerHTML = `
    <header class="chrome-fixture__section-header">
      <h2>${section.label}</h2>
      <span class="chrome-fixture__status">loading real route…</span>
    </header>
  `;
  const status = article.querySelector<HTMLElement>(".chrome-fixture__status");
  const frame = document.createElement("iframe");
  frame.className = "chrome-fixture__frame";
  frame.title = `${section.label} page chrome`;
  frame.src = section.path;
  frame.addEventListener("load", () => {
    if (status) {
      frameReady(frame, section, status);
    }
  });
  article.append(frame);
  stack.append(article);
}

for (const button of nav.querySelectorAll<HTMLButtonElement>("[data-theme]")) {
  button.addEventListener("click", () =>
    setTheme(button.dataset.theme === "light" ? "light" : "dark"),
  );
}

shell.append(nav, stack);
document.querySelector("#app")?.append(shell);
setTheme(matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
