// Standalone harness page listing every dialog surface in the Control UI so a
// reviewer can open each one, in both themes, without hunting through the app.
// Surfaces that only exist inside a page render are linked to the route and
// click path that raises them rather than reconstructed here — a second copy of
// their markup would drift away from the real one within a release.
import { html, nothing, render } from "lit";
import { state } from "lit/decorators.js";
import type { CommandPaletteElement } from "../components/command-palette-contract.ts";
import { showConfirmDialog } from "../components/confirm-dialog.ts";
import "../components/command-palette.ts";
import "../components/exec-approval.ts";
import "../components/file-preview-modal-registration.ts";
import "../components/gateway-url-confirmation.ts";
import "../components/image-lightbox.ts";
import { showInputDialog } from "../components/input-dialog.ts";
import { showSecretRevealDialog } from "../components/secret-reveal-dialog.ts";
import { showSessionGroupDefaultsDialog } from "../components/session-group-defaults-dialog.ts";
import { OpenClawLightDomElement } from "../lit/openclaw-element.ts";
import { renderDreamingToggleConfirmation } from "../pages/agents/memory/toggle-confirmation.ts";
import { renderContinueInTerminalDialog } from "../pages/chat/components/continue-in-terminal-dialog.ts";
import { renderModelSetupSuccessDialog } from "../pages/model-setup/success-dialog.ts";
import { renderConnectMachineDialog } from "../pages/new-session/connect-machine-dialog.ts";
// The fixture renders outside the app shell, so it loads the app stylesheet
// itself (Web Awesome theme included) or every dialog renders theme-less.
import "../styles.css";
// Several dialogs are styled by their page's stylesheet rather than their own
// module, so the gallery loads those sheets the way the routed page would.
import "../styles/model-setup.css";
import "../styles/new-session.css";

/** A dialog this page can mount directly. */
type MountedDialog = {
  readonly id: string;
  readonly title: string;
  /** Where the operator meets it in the product. */
  readonly where: string;
};

/** A dialog that only exists inside a page render, reached in the mock app. */
type LinkedDialog = {
  readonly title: string;
  readonly where: string;
  readonly route: string;
  readonly path: string;
};

const LINKED_DIALOGS: readonly LinkedDialog[] = [
  {
    title: "Channel detail",
    where: "Channels hub, per-channel status sheet",
    route: "/channels",
    path: "Click any channel row.",
  },
  {
    title: "Channel pairing approve / dismiss",
    where: "Channels hub, pending DM pairing request",
    route: "/channels",
    path: "Open a channel with a pending pairing request, then Approve or Dismiss.",
  },
  {
    title: "Channel setup wizard",
    where: "Channels hub, guided setup",
    route: "/channels",
    path: "Open a channel, then Run setup in the detail header.",
  },
  {
    title: "Plugin detail overlay",
    where: "Plugins page, installed and discover cards",
    route: "/plugins",
    path: "Click a plugin row or a discover card.",
  },
  {
    title: "ClawHub skill detail",
    where: "Skills page, catalog browse",
    route: "/skills",
    path: "Switch to Browse, then open a catalog card.",
  },
  {
    title: "Installed skill detail",
    where: "Skills page, installed list",
    route: "/skills",
    path: "Click an installed skill row.",
  },
  {
    title: "Agent file Markdown preview",
    where: "Agents page, Files tab (AGENTS.md and friends)",
    route: "/agents",
    path: "Open the Files tab, then Preview on a file. The expand control toggles fullscreen.",
  },
  {
    title: "Dream wiki page preview",
    where: "Agents page, Memory panel, Diary and Wiki subtabs",
    route: "/agents",
    path: "Open Memory, then a wiki entry.",
  },
  {
    title: "Memory import confirmation",
    where: "Memory Import settings, per-provider Import",
    route: "/memory-import",
    path: "Click Import on a provider; the backfill Rollback raises the danger variant.",
  },
  {
    title: "Secrets add / edit and bulk import",
    where: "Settings, Secrets page",
    route: "/secrets",
    path: "Add secret, or Bulk.",
  },
  {
    title: "Skill revision request",
    where: "Skill Workshop triage board",
    route: "/skill-workshop",
    path: "Open a proposal, then Revise.",
  },
  {
    title: "Workboard card create / edit",
    where: "Workboard toolbar and per-card edit",
    route: "/workboard",
    path: "New card, or Edit on an existing card. Needs plugins.entries.workboard.enabled.",
  },
  {
    title: "Workboard card detail drawer",
    where: "Workboard, card click",
    route: "/workboard",
    path: "Click a card. Needs plugins.entries.workboard.enabled.",
  },
  {
    title: "Model setup wizard",
    where: "Model Setup sign-in and prepare flows",
    route: "/model-setup",
    path: "Start a provider sign-in.",
  },
  {
    title: "Device pair setup",
    where: "Pair mobile device, from the sidebar, Devices, Config and the palette",
    route: "/devices",
    path: "Pair a device.",
  },
  {
    title: "Onboarding memory import offer",
    where: "First-run onboarding, before the first chat",
    route: "/chat",
    path: "Only appears during onboarding with an operator-admin session.",
  },
  {
    title: "MCP add-server dialog",
    where: "Chat composer capability menu",
    route: "/chat",
    path: "Open the composer plus menu, then Add MCP server.",
  },
  {
    title: "Board reset confirmation",
    where: "Chat pane, board reset",
    route: "/chat",
    path: "Reset the board from the session menu.",
  },
  {
    title: "Update confirmation",
    where: "Sidebar update affordance",
    route: "/chat",
    path: "Trigger an update from the sidebar update card.",
  },
  {
    title: "Mobile navigation drawer",
    where: "Mobile layouts, topbar hamburger",
    route: "/chat",
    path: "Narrow the window below the mobile breakpoint, then open the nav toggle.",
  },
];

const NOW_MS = Date.parse("2026-08-15T12:00:00.000Z");

/** A 3x2 checkerboard, so the lightbox has something with real pixels in it. */
const SAMPLE_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 12 8">' +
      '<rect width="12" height="8" fill="#1f2937"/>' +
      '<rect width="6" height="4" fill="#334155"/>' +
      '<rect x="6" y="4" width="6" height="4" fill="#334155"/>' +
      '<circle cx="6" cy="4" r="2.2" fill="#ff5c5c"/></svg>',
  );

export class OpenClawDialogGallery extends OpenClawLightDomElement {
  @state() private active: string | null = null;

  private open(id: string) {
    this.active = id;
  }

  private close = () => {
    this.active = null;
  };

  override render() {
    return html`
      <header class="gallery__head">
        <div>
          <span class="gallery__eyebrow">Control UI</span>
          <h1>Dialog gallery</h1>
          <p>
            Every modal surface in the product, on one grammar. Open each one and compare the
            surface, header, footer and focus treatment. Use the theme control to check both modes.
          </p>
        </div>
        <div class="gallery__themes">
          <button type="button" @click=${() => applyTheme("dark")}>Dark</button>
          <button type="button" @click=${() => applyTheme("light")}>Light</button>
          <button type="button" @click=${() => applyDialogEdge("current")}>Borda: atual</button>
          <button type="button" @click=${() => applyDialogEdge("soft")}>Borda: suave</button>
          <span class="gallery__edge-key"
            >ou tecla <kbd>B</kbd> (funciona com o dialog aberto)</span
          >
        </div>
      </header>

      <section class="gallery__section">
        <h2>Mounted here</h2>
        <div class="gallery__grid">
          ${MOUNTED.map(
            (entry) => html`
              <button
                type="button"
                class="gallery__card"
                data-dialog-id=${entry.id}
                @click=${() => this.launch(entry.id)}
              >
                <strong>${entry.title}</strong>
                <span>${entry.where}</span>
              </button>
            `,
          )}
        </div>
      </section>

      <section class="gallery__section">
        <h2>Reached in the mock app</h2>
        <p class="gallery__hint">
          These live inside a page render, so the gallery links to the route and click path instead
          of rebuilding their markup.
        </p>
        <div class="gallery__grid">
          ${LINKED_DIALOGS.map(
            (entry) => html`
              <a class="gallery__card" href=${entry.route}>
                <strong>${entry.title}</strong>
                <span>${entry.where}</span>
                <em>${entry.path}</em>
              </a>
            `,
          )}
        </div>
      </section>

      ${this.renderActive()}
    `;
  }

  private launch(id: string) {
    const imperative = IMPERATIVE.get(id);
    if (imperative) {
      void imperative();
      return;
    }
    this.open(id);
    if (id === "command-palette") {
      // The palette holds its own open state and only the shell ever opens it,
      // so mounting the element is not enough — ask it the way Cmd-K does.
      void this.updateComplete.then(() => {
        this.querySelector<CommandPaletteElement>("openclaw-command-palette")?.openPalette();
      });
    }
  }

  private renderActive() {
    switch (this.active) {
      case "continue-in-terminal":
        return renderContinueInTerminalDialog({
          command: "npx openclaw connect https://gateway.example.com/join/9f3a2c",
          onClose: this.close,
        });
      case "connect-machine":
        return renderConnectMachineDialog({
          open: true,
          loading: false,
          error: null,
          setup: {
            setupId: "setup-9f3a2c",
            setupCode: "9F3A-2C7B",
            joinUrl: "https://gateway.example.com/join/9f3a2c",
            gatewayUrl: "https://gateway.example.com:18789",
            auth: "token",
            urlSource: "config",
            expiresAtMs: NOW_MS + 15 * 60_000,
          },
          onRefresh: () => undefined,
          onClose: this.close,
          onManageDevices: this.close,
        });
      case "model-setup-success":
        return renderModelSetupSuccessDialog(
          { phase: "success", modelRef: "anthropic/sonnet-4.6" },
          this.close,
          this.close,
          false,
        );
      case "dreaming-enable":
        return renderDreamingToggleConfirmation({
          open: true,
          enabling: true,
          loading: false,
          hasError: false,
          onConfirm: this.close,
          onCancel: this.close,
        });
      case "dreaming-disable":
        return renderDreamingToggleConfirmation({
          open: true,
          enabling: false,
          loading: false,
          hasError: true,
          onConfirm: this.close,
          onCancel: this.close,
        });
      case "gateway-url":
        return html`
          <openclaw-gateway-url-confirmation
            .props=${{
              pendingGatewayUrl: "https://gateway.example.com:18789",
              onConfirm: this.close,
              onCancel: this.close,
            }}
          ></openclaw-gateway-url-confirmation>
        `;
      case "exec-approval":
        return html`
          <openclaw-exec-approval
            .props=${{
              queue: EXEC_APPROVAL_QUEUE,
              busy: false,
              errors: new Map<string, string>(),
              nowMs: NOW_MS,
              inlineApprovalId: null,
              onDecision: this.close,
            }}
          ></openclaw-exec-approval>
        `;
      case "command-palette":
        return html`
          <openclaw-command-palette
            .onNavigate=${this.close}
            .onSelectSession=${this.close}
            .onSlashCommand=${this.close}
          ></openclaw-command-palette>
        `;
      case "image-lightbox":
        return html`
          <openclaw-image-lightbox
            src=${SAMPLE_IMAGE}
            title="deploy-window.png"
            @image-lightbox-close=${this.close}
          ></openclaw-image-lightbox>
        `;
      case "file-preview":
        return html`
          <openclaw-file-preview-modal
            .files=${FILE_PREVIEW_FILES}
            activePath="SKILL.md"
            label="Skill support files"
            listLabel="Files"
            searchPlaceholder="Search files"
            contextLabel="dialog-consistency"
            readOnlyLabel="Read only"
            emptyTitle="Nothing selected"
            emptySubtitle="Pick a file to read it here."
            copyLabel="Copy"
            @file-preview-close=${this.close}
          ></openclaw-file-preview-modal>
        `;
      default:
        return nothing;
    }
  }
}

const MOUNTED: readonly MountedDialog[] = [
  { id: "confirm", title: "Confirm", where: "Sessions, cron, devices, worktrees, chat placement" },
  {
    id: "confirm-danger",
    title: "Confirm — destructive",
    where: "Delete session, remove worktree",
  },
  {
    id: "confirm-details",
    title: "Confirm — detail block and opt-out",
    where: "Repeatable, recoverable actions",
  },
  { id: "input", title: "Input", where: "Rename session, name a group" },
  { id: "secret-reveal", title: "Secret reveal", where: "Devices, one-time pairing token" },
  {
    id: "secret-reveal-outcome",
    title: "Secret reveal — outcome only",
    where: "Devices, pairing result with no token",
  },
  {
    id: "group-defaults",
    title: "Session group defaults",
    where: "Sessions sidebar, group defaults",
  },
  { id: "gateway-url", title: "Gateway URL confirmation", where: "Switching gateways" },
  { id: "exec-approval", title: "Exec approval", where: "Queued exec and plugin approvals" },
  { id: "continue-in-terminal", title: "Continue in terminal", where: "Chat session header menu" },
  { id: "connect-machine", title: "Connect machine", where: "New Session page" },
  { id: "model-setup-success", title: "Model setup success", where: "After activating a model" },
  { id: "dreaming-enable", title: "Dreaming on", where: "Agents, Memory panel toggle" },
  {
    id: "dreaming-disable",
    title: "Dreaming off — with error",
    where: "Agents, Memory panel toggle",
  },
  { id: "command-palette", title: "Command palette", where: "Cmd/Ctrl-K anywhere" },
  { id: "image-lightbox", title: "Image lightbox", where: "Chat inline images" },
  { id: "file-preview", title: "File preview", where: "Skill Workshop support files" },
];

const EXEC_APPROVAL_QUEUE = [
  {
    id: "approval-active",
    kind: "exec" as const,
    request: {
      command: "rm -rf ./.artifacts/control-ui-mock-vite",
      cwd: "/Users/operator/Code/openclaw",
      host: "workstation",
      agentId: "main",
      security: "workspace-write",
    },
    createdAtMs: NOW_MS - 4_000,
    expiresAtMs: NOW_MS + 110_000,
  },
  {
    id: "approval-queued",
    kind: "exec" as const,
    request: { command: "git push --force-with-lease origin main", agentId: "release" },
    createdAtMs: NOW_MS - 2_000,
    expiresAtMs: NOW_MS + 160_000,
  },
];

const FILE_PREVIEW_FILES = [
  {
    path: "SKILL.md",
    size: "2.4 KB",
    contents: "# Skill\n\nA support file rendered inside the preview modal.\n",
  },
  {
    path: "references/palette.md",
    size: "8.2 KB",
    contents: "# Palette\n\n- accent\n- accent-2\n- danger\n",
  },
  {
    path: "scripts/validate.mjs",
    size: "1.2 KB",
    contents: "export function validate(input) {\n  return input.trim().length > 0;\n}\n",
  },
];

/** Dialogs that present themselves and resolve a promise, rather than render. */
const IMPERATIVE = new Map<string, () => Promise<unknown>>([
  [
    "confirm",
    () =>
      showConfirmDialog({
        title: "Archive session?",
        message: "The transcript stays available from the archived list.",
        confirmLabel: "Archive",
      }),
  ],
  [
    "confirm-danger",
    () =>
      showConfirmDialog({
        title: "Delete session?",
        message: "This removes the transcript and any worktree it created.\nThis cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      }),
  ],
  [
    "confirm-details",
    () =>
      showConfirmDialog({
        title: "Remove worktree?",
        message: "The branch stays; only the checkout is removed.",
        details: "git worktree remove /Users/operator/Code/openclaw/.worktrees/lane-dialogs",
        confirmLabel: "Remove",
        skipPreference: { skipped: false, remember: () => undefined },
      }),
  ],
  [
    "input",
    () =>
      showInputDialog({
        title: "Rename session",
        label: "Session name",
        defaultValue: "Dialog consistency lane",
        submitLabel: "Rename",
        requireValue: true,
        submit: async () => null,
      }),
  ],
  [
    "secret-reveal",
    () =>
      showSecretRevealDialog({
        title: "Device paired",
        message: "Copy this token now. It is shown once and cannot be recovered.",
        secret: "ocw_pair_9f3a2c7b41d8e5620a3f",
        acknowledgeLabel: "I have copied it",
        dismissHint: "Copy the token before closing.",
        note: "The token expires in 15 minutes if unused.",
        status: "success",
      }),
  ],
  [
    "secret-reveal-outcome",
    () =>
      showSecretRevealDialog({
        title: "Device removed",
        message: "The device can no longer reach this Gateway.",
        acknowledgeLabel: "Close",
        status: "success",
      }),
  ],
  [
    "group-defaults",
    () =>
      showSessionGroupDefaultsDialog({
        group: "Release",
        defaults: { cwd: "/Users/operator/Code/openclaw", worktree: true },
        listDirectory: async () => ({ path: "/Users/operator/Code", entries: [] }),
        submit: async () => null,
      }),
  ],
]);

function applyTheme(mode: "dark" | "light") {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.themeMode = mode;
  root.classList.toggle("wa-light", mode === "light");
  root.classList.toggle("wa-dark", mode === "dark");
  root.style.colorScheme = mode;
}

// Drives the `[data-dialog-edge]` A/B in dialog.css while the panel-edge
// treatment is still an open question. Both this and that block come out
// together once the treatment is settled.
function applyDialogEdge(edge: "soft" | "current") {
  if (edge === "current") {
    document.documentElement.dataset.dialogEdge = "current";
    return;
  }
  delete document.documentElement.dataset.dialogEdge;
}

// The header buttons are unreachable once a dialog is open — a modal takes
// the top layer and eats the pointer — which is the one moment the A/B is
// worth flipping. Keydown still reaches the document, so `B` is the control
// that actually works mid-comparison.
document.addEventListener("keydown", (event) => {
  if (event.key !== "b" && event.key !== "B") return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const typing = event
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLElement &&
        (node.isContentEditable || node.tagName === "INPUT" || node.tagName === "TEXTAREA"),
    );
  if (typing) return;
  applyDialogEdge(document.documentElement.dataset.dialogEdge === "current" ? "soft" : "current");
});

if (!customElements.get("openclaw-dialog-gallery")) {
  customElements.define("openclaw-dialog-gallery", OpenClawDialogGallery);
}

const mount = document.querySelector("#app");
if (mount) {
  render(html`<openclaw-dialog-gallery></openclaw-dialog-gallery>`, mount);
}
