// Single source of the composer bench page markup. The mock dev server
// (`scripts/control-ui-mock-dev.ts`) serves it at /bench and
// `/chat?bench=...`; the static bench build (`scripts/control-ui-bench-build.ts`)
// writes it as the Vite entry so deploys ship only the bench surface.
// Asset references stay root-relative ("/src/...") — Vite resolves and bundles
// them against the ui root in both flows.
export const composerBenchPath = "/bench";

function composerBenchSegmented(
  axis: string,
  options: Array<[value: string, label: string]>,
): string {
  return `<span class="composer-bench__segmented">${options
    .map(
      ([value, label]) =>
        `<button type="button" data-bench-axis="${axis}" data-bench-value="${value}">${label}</button>`,
    )
    .join("")}</span>`;
}

function composerBenchRow(label: string, control: string, disabled = false): string {
  return `<div class="composer-bench__row${disabled ? " is-disabled" : ""}"><span>${label}</span>${control}</div>`;
}

function composerBenchStacked(
  label: string,
  axis: string,
  options: Array<[value: string, label: string]>,
): string {
  return `<div class="composer-bench__choice"><span class="composer-bench__choice-label">${label}</span>
    <div class="composer-bench__choice-options">${options
      .map(
        ([value, optionLabel]) =>
          `<button type="button" data-bench-axis="${axis}" data-bench-value="${value}">${optionLabel}</button>`,
      )
      .join("")}</div>
  </div>`;
}

function composerBenchDisclosure(
  label: string,
  axis: string,
  options: Array<[value: string, label: string]>,
): string {
  return `<details class="composer-bench__choice composer-bench__choice--disclosure" data-bench-disclosure="${axis}">
    <summary><span>${label}</span><output data-bench-choice-value="${axis}">${options[0]?.[1] ?? ""}</output></summary>
    <div class="composer-bench__choice-options">${options
      .map(
        ([value, optionLabel]) =>
          `<button type="button" data-bench-axis="${axis}" data-bench-value="${value}">${optionLabel}</button>`,
      )
      .join("")}</div>
  </details>`;
}

function composerBenchGroup(id: string, label: string, rows: string, open = true): string {
  return `<details class="composer-bench__group" data-bench-group="${id}"${open ? " open" : ""}>
    <summary>${label}</summary><div class="composer-bench__rows">${rows}</div>
  </details>`;
}

function composerBenchWhen(condition: string, content: string): string {
  return `<div data-bench-when="${condition}">${content}</div>`;
}

export const composerBenchHtml = `<!doctype html>
<html lang="en" data-theme="dark" data-theme-mode="dark" data-theme-resolved="dark" class="wa-dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <title>Composer Bench</title>
    <link rel="stylesheet" href="/src/styles.css" />
    <link rel="stylesheet" href="/src/styles/chat.css" />
    <link rel="stylesheet" href="/src/test-helpers/composer-bench.css" />
  </head>
  <body data-composer-bench-page>
    <div class="composer-bench">
      <aside class="composer-bench__controls" data-composer-bench-controls>
        <header class="composer-bench__header">
          <h1>Composer</h1>
        </header>
        <section class="composer-bench__scenario" data-bench-scenario tabindex="0" aria-label="Composer scenario">
          <span class="composer-bench__scenario-kind" data-bench-scenario-kind data-visible="false">Stress cases</span>
          <div class="composer-bench__scenario-nav">
            <button type="button" data-bench-scenario-prev aria-label="Previous scenario">‹</button>
            <output data-bench-scenario-name>Custom</output>
            <button type="button" data-bench-scenario-next aria-label="Next scenario">›</button>
          </div>
          <p data-bench-scenario-description>Adjust any control or browse the demo sequence.</p>
        </section>
        ${composerBenchGroup(
          "composition",
          "Composition",
          composerBenchRow(
            "Surface",
            composerBenchSegmented("surface", [
              ["chat", "Chat"],
              ["new", "New"],
            ]),
          ) +
            composerBenchRow(
              "Content",
              composerBenchSegmented("content", [
                ["empty", "Empty"],
                ["one", "1 line"],
                ["multiline", "Multi"],
                ["giant", "Huge"],
              ]),
            ) +
            composerBenchDisclosure("Attachments", "attachments", [
              ["none", "None"],
              ["image", "1 image"],
              ["annotation", "Browser annotation"],
              ["mixed", "Mixed"],
            ]) +
            composerBenchDisclosure("Plus menu", "capabilities", [
              ["attachments", "Attachments only"],
              ["available", "Capabilities"],
              ["overrides", "Session overrides"],
            ]) +
            composerBenchWhen(
              "content",
              composerBenchRow(
                "Menus",
                composerBenchSegmented("menu", [
                  ["closed", "Closed"],
                  ["slash", "Slash"],
                  ["skills", "Skills"],
                ]),
              ),
            ),
        )}
        ${composerBenchGroup(
          "execution",
          "Execution",
          composerBenchStacked("Run", "run", [
            ["idle", "Idle"],
            ["running", "Running"],
            ["steering", "Running + steered item"],
            ["approval", "Waiting for approval"],
            ["interrupted", "Interrupted"],
          ]) +
            composerBenchRow(
              "Follow-up",
              composerBenchSegmented("followUpMode", [
                ["queue", "Queue"],
                ["steer", "Steer"],
                ["collect", "Collect"],
                ["interrupt", "Interrupt"],
              ]),
            ) +
            composerBenchRow(
              "Tasks",
              composerBenchSegmented("tasks", [
                ["none", "None"],
                ["one", "1"],
                ["three", "3"],
              ]),
            ) +
            composerBenchRow(
              "Plan",
              composerBenchSegmented("plan", [
                ["none", "None"],
                ["active", "Active"],
                ["complete", "Complete"],
              ]),
            ) +
            composerBenchWhen(
              "plan",
              composerBenchDisclosure("Inset", "inset", [
                ["none", "None"],
                ["reply", "Reply preview"],
                ["goal", "Goal"],
                ["compaction", "Compaction"],
                ["fallback", "Model fallback"],
                ["banner-archived", "Archived session"],
                ["banner-restart", "Restart recovery"],
                ["banner-model", "Model setup required"],
                ["question", "Question takeover"],
              ]),
            ) +
            composerBenchRow(
              "Queue",
              composerBenchSegmented("queue", [
                ["none", "None"],
                ["one", "1 item"],
                ["three", "3 items"],
              ]),
            ) +
            composerBenchWhen(
              "queue",
              composerBenchRow(
                "Queue edit",
                composerBenchSegmented("queueEdit", [
                  ["closed", "Closed"],
                  ["editing", "Editing"],
                ]),
              ) +
                composerBenchDisclosure("Delivery", "queueState", [
                  ["ready", "Ready"],
                  ["waiting-model", "Applying settings"],
                  ["waiting-idle", "Waiting for run"],
                  ["executing-command", "Running command"],
                  ["waiting-reconnect", "Waiting for reconnect"],
                  ["unconfirmed", "Needs review"],
                  ["failed", "Failed"],
                ]) +
                composerBenchStacked("Queue row", "queueRow", [
                  ["text", "Text"],
                  ["attachments", "Attachments only"],
                  ["command", "Local command"],
                  ["member", "Member attributed"],
                  ["run-attached", "Attached to run"],
                ]) +
                composerBenchDisclosure("State", "status", [
                  ["focused", "Focused"],
                  ["sending", "Sending"],
                  ["disabled", "Disabled"],
                  ["catalog", "Catalog view-only"],
                  ["error", "Error"],
                  ["offline", "Offline"],
                ]) +
                composerBenchRow(
                  "Order",
                  `<output class="composer-bench__order" data-bench-queue-order>—</output>`,
                ),
            ),
        )}
        ${composerBenchGroup(
          "context",
          "Context",
          composerBenchRow(
            "Privacy",
            composerBenchSegmented("visibility", [
              ["normal", "Normal"],
              ["draft", "Draft"],
              ["incognito", "Incognito"],
            ]),
          ) +
            composerBenchWhen(
              "surface-new",
              composerBenchDisclosure("New action", "newAction", [
                ["start", "Start"],
                ["terminal", "Start in terminal"],
                ["blocked", "Preparing"],
                ["locked", "Placement locked"],
                ["invalid-worktree", "Invalid worktree"],
                ["outcome-unknown", "Outcome unknown"],
                ["placement-interrupted", "Placement interrupted"],
                ["catalog", "Catalog target"],
              ]),
            ) +
            composerBenchRow(
              "Usage",
              composerBenchSegmented("usage", [
                ["context", "Context"],
                ["plan", "Plan"],
              ]),
            ) +
            composerBenchDisclosure("Above composer", "neighbor", [
              ["none", "None"],
              ["approval", "Approval"],
              ["task-suggestion", "Task suggestion"],
              ["session-suggestion", "Session suggestion"],
              ["pull-request", "Pull request"],
              ["swarm", "Swarm progress"],
              ["disk-warning", "Disk warning"],
              ["disk-critical", "Disk critical"],
              ["workspace-conflict", "Workspace conflict"],
              ["placement", "Placement startup"],
              ["placement-failed", "Placement failed"],
              ["error", "Chat error"],
            ]),
        )}
        ${composerBenchGroup(
          "composer-selectable",
          "Composer-selectable",
          composerBenchDisclosure("Permission", "permission", [
            ["default", "Default"],
            ["full", "Full access"],
            ["workspace", "Workspace"],
            ["guarded", "Guarded"],
            ["read-only", "Read only"],
          ]) +
            composerBenchRow(
              "Model",
              composerBenchSegmented("model", [
                ["default", "Inherited"],
                ["opus", "Opus"],
                ["gpt", "GPT"],
              ]),
            ) +
            composerBenchDisclosure("Reasoning", "reasoning", [
              ["default", "Default"],
              ["off", "Off"],
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
            ]) +
            composerBenchRow(
              "Fast mode",
              composerBenchSegmented("fastMode", [
                ["off", "Off"],
                ["on", "On"],
              ]),
            ) +
            `<div data-bench-voice-options>${composerBenchDisclosure("Voice", "voice", [
              ["off", "Off"],
              ["connecting", "Connecting"],
              ["listening", "Listening"],
              ["thinking", "Thinking"],
              ["camera", "Camera"],
              ["camera-pending", "Camera pending"],
              ["camera-error", "Camera error"],
              ["error", "Error"],
            ])}</div><div class="composer-bench__row" data-bench-voice-unavailable hidden><span>Voice</span><span class="composer-bench__muted">Chat only</span></div>` +
            composerBenchDisclosure("Dictation", "dictate", [
              ["off", "Off"],
              ["connecting", "Starting"],
              ["recording", "Recording"],
              ["finalizing", "Finishing"],
            ]) +
            composerBenchDisclosure("Microphone", "voiceInput", [
              ["available", "Available inputs"],
              ["unsupported", "List unsupported"],
              ["none", "No input found"],
              ["permission", "Permission blocked"],
              ["busy", "Input busy"],
              ["inactive", "Page inactive"],
              ["failed", "Access failed"],
            ]),
          false,
        )}
      </aside>
      <main class="composer-bench__stage" data-composer-bench-stage data-composer-production-owner="renderChatComposer"></main>
      <nav class="composer-bench__view-controls" aria-label="View controls">
        <div class="composer-bench__row composer-bench__row--slider" data-bench-slider="width" role="slider" tabindex="0" aria-label="Width" aria-valuemin="360" aria-valuemax="1200" aria-valuenow="900" aria-valuetext="Desktop"><span>Width</span><output data-bench-width-value>Desktop</output></div>
        ${composerBenchRow(
          "Theme",
          composerBenchSegmented("theme", [
            ["dark", "Dark"],
            ["light", "Light"],
          ]),
        )}
      </nav>
    </div>
    <script type="module" src="/src/test-helpers/composer-bench.ts"></script>
  </body>
</html>`;
