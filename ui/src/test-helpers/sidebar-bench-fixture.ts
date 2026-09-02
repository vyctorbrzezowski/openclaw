import "../styles.css";

type BenchMode =
  | "pages"
  | "runtime"
  | "attention"
  | "children"
  | "titles"
  | "headers"
  | "people"
  | "archived"
  | "catalogs";

type SidebarBenchElement = HTMLElement & {
  sessionsGrouping: "category" | "none" | "person";
  sessionsStatusFilter: "active" | "all" | "archived";
  sidebarEntries: readonly string[];
  selectedSessionKeys: ReadonlySet<string>;
  hasSessionDraft: (sessionKey: string) => boolean;
  outboxAttentionCountForSession: (sessionKey: string) => number;
  onUpdateSidebarEntries?: (entries: string[]) => void;
  sessionOrganizer?: {
    collapsedSessionSections: ReadonlySet<string>;
    setSessionsStatusFilter: (status: "active" | "all" | "archived") => void;
  };
  requestUpdate: () => void;
};

type BenchCase = {
  mode: BenchMode;
  title: string;
  note: string;
  route: string;
  refs: string;
  light?: boolean;
};

const cases: readonly BenchCase[] = [
  {
    mode: "pages",
    title: "Page rows",
    note: "Usage active; all core destinations mounted. Hover the real rows.",
    route: "/usage",
    refs: "ui/src/components/app-sidebar-nav-menus.ts:27-89 · ui/src/components/app-sidebar-render.ts:167-263",
    light: true,
  },
  {
    mode: "runtime",
    title: "Runtime + selection",
    note: "Queued, running, unread, selected, pinned and active combinations.",
    route: "/chat/main/~key/sidebar-running",
    refs: "ui/src/components/app-sidebar-session-row-render.ts:252-278 · ui/src/components/session-attention-presentation.ts:53-102",
  },
  {
    mode: "attention",
    title: "Attention + badges",
    note: "Question, approval, failure, agent status, drafts and metadata badges.",
    route: "/chat/main/~key/sidebar-agent-status",
    refs: "ui/src/components/session-attention-controller.ts:107-130 · ui/src/components/session-row-badges.ts:59-191",
  },
  {
    mode: "children",
    title: "Child lifecycle",
    note: "Expanded real tree: queued, running, done, killed, timeout and failed.",
    route: "/chat/main/~key/sidebar-lifecycle",
    refs: "ui/src/components/app-sidebar-session-row-render.ts:421-448,511-563",
  },
  {
    mode: "titles",
    title: "Titles + subtitles",
    note: "Short, long/marquee, emoji, fork/archive glyph contracts and preview priority.",
    route: "/chat/main/~key/sidebar-long",
    refs: "ui/src/components/app-sidebar-session-row-render.ts:285-314 · ui/src/components/session-row-subtitle.ts:13-92",
  },
  {
    mode: "headers",
    title: "Section headers",
    note: "Expanded categories plus collapsed Runtime states with count/activity/attention.",
    route: "/chat/main/~key/production-export",
    refs: "ui/src/components/app-sidebar-session-list-render.ts:54-251 · ui/src/components/app-sidebar-session-section-header.ts:4-60",
  },
  {
    mode: "people",
    title: "Person grouping",
    note: "Real owner/person headers and avatar attribution in light mode.",
    route: "/chat/main/~key/sidebar-draft-other",
    refs: "ui/src/lib/sessions/grouping.ts:266-345 · ui/src/components/app-sidebar-session-list-render.ts:60-188",
    light: true,
  },
  {
    mode: "archived",
    title: "Archived rows",
    note: "Archived-only projection, archive glyph, owner attribution and filtered toolbar.",
    route: "/chat/main/~key/archived-launch-notes",
    refs: "ui/src/components/app-sidebar-session-navigation-logic.ts:224-275 · ui/src/components/app-sidebar-session-row-render.ts:187-197",
  },
  {
    mode: "catalogs",
    title: "Catalog rows + headers",
    note: "Real Codex and Claude provider sections and restricted catalog-row branch.",
    route: "/chat",
    refs: "ui/src/components/app-sidebar-session-catalog-render.ts:177-452,478-616",
  },
];

const coverage = [
  [
    "Page rows",
    "inactive, active, hover/focus (interactive), Home activity, wrapper drag/drop contract",
    "ui/src/components/app-sidebar-render.ts:167-263,418-466",
  ],
  [
    "Root runtime",
    "idle, queued, running, unread, active, selected, pinned and valid overlaps",
    "ui/src/components/app-sidebar-session-row-render.ts:252-278; ui/src/components/session-attention-presentation.ts:53-102",
  ],
  [
    "Child runtime",
    "queued, running, done, killed, timeout, failed, unread, elapsed time, expanded/collapsed tree",
    "ui/src/components/app-sidebar-session-row-render.ts:403-448,511-563",
  ],
  [
    "Attention",
    "question, approval, agent note and error; danger/amber are exclusive",
    "ui/src/components/session-attention-controller.ts:107-130; ui/src/components/session-attention-presentation.ts:7-41",
  ],
  [
    "Titles",
    "resolved short/long title, ellipsis, real hover marquee, archive/fork/icon/emoji decorations",
    "ui/src/components/app-sidebar-session-row-render.ts:285-314; ui/src/lib/hover-marquee.ts:1-119",
  ],
  [
    "Subtitles",
    "attention > agent status > observer > narration > final preview > work subtitle",
    "ui/src/components/session-row-subtitle.ts:13-76",
  ],
  [
    "Badges",
    "incognito, automation, PR contract, approval, outbox, composer draft, cloud placement contract",
    "ui/src/components/session-row-badges.ts:59-191",
  ],
  [
    "Sections",
    "toolbar, category/person/Groups/Coding/Other, expanded/collapsed, actions and drag affordance",
    "ui/src/components/app-sidebar-session-list-render.ts:54-251,420-453",
  ],
  [
    "Catalogs",
    "provider/host/group headers, collapsed status precedence and restricted unadopted rows",
    "ui/src/components/app-sidebar-session-catalog-render.ts:146-616",
  ],
  [
    "Online",
    "expanded rows and away styling; collapsed facepile is reachable by clicking its real header",
    "ui/src/components/app-sidebar-render.ts:265-343",
  ],
  [
    "Themes + width",
    "production 258px default, light/dark, narrow 240px frame; mobile/touch remains media-input dependent",
    "ui/src/app/settings.ts:31-33; ui/src/styles/layout.css:5-30",
  ],
];

const omissions = [
  "There is no idle/working/blocked/done/error/streaming enum. The contract is queued/running/done/failed/killed/timeout; blocked is attention, and streaming is running plus live narration.",
  "Session rename is a modal action from the real row menu, not an inline row state. No fake editing row is rendered.",
  "Title reveal is the production hover marquee. Hover the long title; reduced-motion intentionally keeps ellipsis.",
  "PR, outbox and composer-draft badges depend on pushed/runtime app state. The bench feeds those real seams; it does not forge their rendered HTML.",
  "Drag/drop, menu-open, focus, hover, loading and transient error classes require interaction or a failed live request. They are not forced with copied classes.",
  "A pinned section header is unreachable: pinned sessions are moved into the navigation zone. Archived rows cannot carry run/unread/attention/children because projection clears them.",
];

const styles = document.createElement("style");
styles.textContent = `
  :root { color-scheme: dark; }
  html { min-height: 100%; overflow: auto; }
  body { margin: 0; min-width: 320px; min-height: 100%; overflow: visible; background: var(--bg); color: var(--text); }
  .bench { min-height: 100vh; padding: 40px; }
  .bench__eyebrow, .bench-card__refs, .coverage td:last-child { font: 10px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
  .bench__eyebrow { color: var(--accent); letter-spacing: .16em; text-transform: uppercase; }
  .bench h1 { margin: 8px 0 10px; color: var(--text-strong); font-size: 30px; letter-spacing: -.035em; }
  .bench__intro { max-width: 760px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
  .bench-grid { display: grid; grid-template-columns: repeat(auto-fill, 258px); gap: 36px 28px; align-items: start; margin-top: 32px; }
  .bench-card { width: 258px; margin: 0; }
  .bench-card__label { min-height: 86px; padding: 0 2px 12px; }
  .bench-card h2 { margin: 0 0 5px; color: var(--text-strong); font-size: 14px; }
  .bench-card p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.45; }
  .bench-card__refs { display: block; margin-top: 6px; color: var(--muted-strong); }
  .bench-card__viewport { position: relative; width: 258px; height: 860px; overflow: hidden; border: 1px solid var(--border); border-radius: 10px; background: var(--sidebar-bg); box-shadow: var(--shadow-md); }
  .bench-card__viewport--narrow { width: 240px; }
  .bench-card iframe { width: 1280px; height: 860px; border: 0; }
  .coverage { max-width: 1180px; margin-top: 72px; }
  .coverage h2 { margin: 0 0 8px; font-size: 22px; }
  .coverage h3 { margin: 36px 0 10px; font-size: 15px; }
  .coverage table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .coverage th, .coverage td { padding: 10px 12px; border-top: 1px solid var(--border); text-align: left; vertical-align: top; }
  .coverage th { color: var(--muted); font-weight: 600; }
  .coverage ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 12px; line-height: 1.65; }
  @media (max-width: 640px) { .bench { padding: 22px 16px; } .bench-grid { justify-content: center; } }
`;
document.head.append(styles);

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("Sidebar bench root is missing");
}

app.innerHTML = `
  <div class="bench">
    <span class="bench__eyebrow">Control UI / real component fixture</span>
    <h1>Sidebar row bench</h1>
    <p class="bench__intro">Every column is the full mocked Control UI app, cropped to its real <code>&lt;openclaw-app-sidebar&gt;</code>. Row markup, Lit branches, tokens and CSS come from <code>ui/src</code>; captions stay outside the sidebar.</p>
    <div class="bench-grid">
      ${cases
        .map(
          (entry) => `<figure class="bench-card" data-mode="${entry.mode}">
            <figcaption class="bench-card__label">
              <h2>${entry.title}</h2><p>${entry.note}</p><span class="bench-card__refs">${entry.refs}</span>
            </figcaption>
            <div class="bench-card__viewport ${entry.mode === "titles" ? "bench-card__viewport--narrow" : ""}">
              <iframe title="${entry.title}" src="${entry.route}?sidebarBench=${entry.mode}"></iframe>
            </div>
          </figure>`,
        )
        .join("")}
    </div>
    <section class="coverage">
      <h2>Cobertura</h2>
      <p class="bench__intro">Branches renderizados ou exercitáveis nas sidebars acima. Referências são do contrato atual em <code>ui/src</code>.</p>
      <table><thead><tr><th>Família</th><th>Estados</th><th>Fonte</th></tr></thead><tbody>
        ${coverage.map(([family, states, refs]) => `<tr><td>${family}</td><td>${states}</td><td>${refs}</td></tr>`).join("")}
      </tbody></table>
      <h3>Não renderizado / inalcançável sem falsificação</h3>
      <ul>${omissions.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
  </div>`;

const allRoutes = [
  "dashboards",
  "usage",
  "cron",
  "tasks",
  "sessions",
  "activity",
  "plugins",
  "apps",
  "portals",
].map((route) => `route:${route}`);

function configureSidebar(frame: HTMLIFrameElement, entry: BenchCase): void {
  const document = frame.contentDocument;
  const sidebar = document?.querySelector<SidebarBenchElement>("openclaw-app-sidebar");
  if (!document || !sidebar?.sessionOrganizer) {
    globalThis.setTimeout(() => configureSidebar(frame, entry), 100);
    return;
  }

  if (entry.light) {
    const root = document.documentElement;
    root.dataset.theme = "claw-light";
    root.dataset.themeMode = "light";
    root.dataset.themeResolved = "light";
    root.classList.add("wa-light");
    root.classList.remove("wa-dark");
    root.style.colorScheme = "light";
  }

  const sidebarEntries = [
    ...allRoutes,
    "session:agent:main:tax-research",
    "session:agent:main:home-server",
  ];
  sidebar.sidebarEntries = sidebarEntries;
  sidebar.onUpdateSidebarEntries?.(sidebarEntries);
  sidebar.sessionsGrouping = entry.mode === "people" ? "person" : "category";
  const organizer = sidebar.sessionOrganizer;
  organizer.collapsedSessionSections = new Set(
    entry.mode === "headers" ? ["category:Runtime states", "work"] : [],
  );

  if (entry.mode === "archived") {
    organizer.setSessionsStatusFilter("archived");
  } else {
    sidebar.sessionsStatusFilter = "active";
  }

  if (entry.mode === "runtime") {
    sidebar.selectedSessionKeys = new Set([
      "agent:main:sidebar-running",
      "agent:main:sidebar-unread",
    ]);
  }
  if (entry.mode === "attention") {
    const gateway = (
      frame.contentWindow as Window & {
        openclawControlUiE2eGateway?: { emit: (event: string, payload: unknown) => void };
      }
    ).openclawControlUiE2eGateway;
    globalThis.setTimeout(() => {
      Object.defineProperties(sidebar, {
        hasSessionDraft: {
          configurable: true,
          get: () => (sessionKey: string) => sessionKey === "agent:main:sidebar-badges",
          set: () => undefined,
        },
        outboxAttentionCountForSession: {
          configurable: true,
          get: () => (sessionKey: string) => (sessionKey === "agent:main:sidebar-badges" ? 3 : 0),
          set: () => undefined,
        },
      });
      sidebar.requestUpdate();
      gateway?.emit("question.requested", {
        id: "sidebar_bench_question",
        agentId: "main",
        sessionKey: "agent:main:sidebar-unread",
        questions: [
          {
            questionId: "continue",
            header: "Continue",
            question: "Continue with this session?",
            options: [],
          },
        ],
        createdAtMs: Date.now(),
        expiresAtMs: Date.now() + 86_400_000,
        status: "pending",
      });
      gateway?.emit("controlUi.sessionPullRequests.changed", {
        sessions: {
          "agent:main:sidebar-work": {
            pullRequests: [
              {
                branch: "bench/sidebar-v2",
                number: 123,
                owner: "openclaw",
                repo: "openclaw",
                state: "open",
                title: "Sidebar row bench",
                url: "https://example.test/openclaw/openclaw/pull/123",
              },
            ],
            rateLimited: false,
            status: "ready",
          },
        },
      });
    }, 1_000);
  }
  sidebar.requestUpdate();

  if (entry.mode === "children") {
    globalThis.setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>(
          '[data-child-session-toggle="agent:main:sidebar-lifecycle"]',
        )
        ?.click();
      globalThis.setTimeout(() => {
        document
          .querySelector<HTMLButtonElement>(
            '[data-show-more-children="agent:main:sidebar-lifecycle"]',
          )
          ?.click();
      }, 600);
    }, 250);
  }

  const target =
    entry.mode === "catalogs"
      ? '[data-session-section="catalog:codex"]'
      : entry.mode === "archived"
        ? '[data-session-key="agent:main:archived-launch-notes"]'
        : entry.mode === "people"
          ? '[data-session-section^="person:"]'
          : entry.mode === "headers"
            ? '[data-session-section="category:Runtime states"]'
            : entry.mode === "titles"
              ? '[data-session-section="category:Titles"]'
              : entry.mode === "attention"
                ? '[data-session-section="category:Attention and badges"]'
                : entry.mode === "children"
                  ? '[data-session-key="agent:main:sidebar-lifecycle"]'
                  : entry.mode === "runtime"
                    ? '[data-session-section="category:Runtime states"]'
                    : null;
  if (target) {
    globalThis.setTimeout(
      () => document.querySelector(target)?.scrollIntoView({ block: "start" }),
      700,
    );
  }
}

for (const entry of cases) {
  const frame = document.querySelector<HTMLIFrameElement>(`[data-mode="${entry.mode}"] iframe`);
  frame?.addEventListener("load", () => configureSidebar(frame, entry), { once: true });
}
