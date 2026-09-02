import { html, type TemplateResult } from "lit";
import type { SessionFixtureSeed } from "./sidebar-bench-fixtures.ts";
import type { BadgeState, BenchState } from "./sidebar-bench-state.ts";

type ControlsParams = {
  state: BenchState;
  sessions: readonly SessionFixtureSeed[];
  onChange: (next: Partial<BenchState>) => void;
  onBadgeChange: (name: keyof BadgeState, checked: boolean) => void;
  onSelectSession: (id: string) => void;
  onReset: () => void;
};

const choice = <T extends string>(
  label: string,
  value: T,
  options: readonly (readonly [T, string])[],
  onChange: (value: T) => void,
): TemplateResult => html`<label class="sidebar-bench__field">
  <span>${label}</span>
  <select @change=${(event: Event) => onChange((event.target as HTMLSelectElement).value as T)}>
    ${options.map(
      ([optionValue, optionLabel]) =>
        html`<option value=${optionValue} ?selected=${optionValue === value}>
          ${optionLabel}
        </option>`,
    )}
  </select>
</label>`;

const toggle = (
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
) => html` <label class="sidebar-bench__toggle">
  <span>${label}</span>
  <input
    type="checkbox"
    .checked=${checked}
    @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}
  />
</label>`;

export function renderSidebarBenchControls(params: ControlsParams): TemplateResult {
  const { state } = params;
  return html`<aside class="sidebar-bench__controls">
    <header>
      <div>
        <span>Component bench</span>
        <h1>Sidebar</h1>
      </div>
      <button type="button" @click=${params.onReset}>Reset</button>
    </header>
    <div class="sidebar-bench__control-scroll">
      <section>
        <h2>Selection</h2>
        ${choice(
          "Session",
          state.selectedSessionId,
          params.sessions.map((session) => [session.id, session.label] as const),
          params.onSelectSession,
        )}
      </section>
      <section>
        <h2>Viewport</h2>
        ${choice(
          "Target row",
          state.target,
          [
            ["session", "Session"],
            ["page", "Page"],
          ],
          (target) => params.onChange({ target }),
        )}
        ${choice(
          "Layout",
          state.layout,
          [
            ["desktop", "Desktop"],
            ["narrow", "Narrow"],
            ["collapsed", "Collapsed"],
          ],
          (layout) => params.onChange({ layout }),
        )}
        ${choice(
          "Theme",
          state.theme,
          [
            ["dark", "Dark"],
            ["light", "Light"],
          ],
          (theme) => params.onChange({ theme }),
        )}
        ${toggle("Touch targets", state.touch, (touch) => params.onChange({ touch }))}
      </section>
      <section>
        <h2>Row state</h2>
        ${choice(
          "Run",
          state.run,
          [
            ["idle", "Idle"],
            ["queued", "Queued"],
            ["running", "Running"],
            ["done", "Done"],
            ["failed", "Failed"],
            ["killed", "Killed"],
            ["timeout", "Timeout"],
          ],
          (run) => params.onChange({ run }),
        )}
        ${choice(
          "Attention",
          state.attention,
          [
            ["none", "None"],
            ["question", "Question"],
            ["approval", "Approval"],
            ["agent", "Agent status"],
            ["error", "Error"],
          ],
          (attentionState) => params.onChange({ attention: attentionState }),
        )}
        ${choice(
          "Subtitle",
          state.subtitle,
          [
            ["none", "None"],
            ["preview", "Last message"],
            ["work", "Work context"],
            ["narration", "Live narration"],
          ],
          (subtitle) => params.onChange({ subtitle }),
        )}
        ${choice(
          "Identity",
          state.identity,
          [
            ["none", "None"],
            ["icon", "Icon"],
            ["emoji", "Emoji"],
            ["owner", "Owner + viewers"],
          ],
          (identity) => params.onChange({ identity }),
        )}
        ${toggle("Active", state.active, (active) => params.onChange({ active }))}
        ${toggle("Multi-selected", state.selected, (selected) => params.onChange({ selected }))}
        ${toggle("Unread", state.unread, (unread) => params.onChange({ unread }))}
        ${toggle("Pinned", state.pinned, (pinned) => params.onChange({ pinned }))}
        ${toggle("Archived", state.archived, (archived) => params.onChange({ archived }))}
        ${toggle("Draft session", state.draftVisibility, (draftVisibility) =>
          params.onChange({ draftVisibility }),
        )}
        ${toggle("Forked", state.forked, (forked) => params.onChange({ forked }))}
      </section>
      <section>
        <h2>Hierarchy</h2>
        ${choice(
          "Subagents",
          state.children,
          [
            ["none", "None"],
            ["one-running", "1 running"],
            ["two-running", "2 running"],
            ["two-done", "2 done"],
            ["three-failed", "3 failed"],
            ["mixed-3", "3 mixed"],
            ["mixed-6", "6 mixed"],
          ],
          (children) => params.onChange({ children }),
        )}
        ${toggle("Children expanded", state.childrenExpanded, (childrenExpanded) =>
          params.onChange({ childrenExpanded }),
        )}
        ${toggle("Section collapsed", state.sectionCollapsed, (sectionCollapsed) =>
          params.onChange({ sectionCollapsed }),
        )}
      </section>
      <section>
        <h2>Badges</h2>
        ${toggle("Incognito", state.badges.incognito, (value) =>
          params.onBadgeChange("incognito", value),
        )}
        ${toggle("Automation", state.badges.automation, (value) =>
          params.onBadgeChange("automation", value),
        )}
        ${toggle("Pull request", state.badges.pullRequest, (value) =>
          params.onBadgeChange("pullRequest", value),
        )}
        ${toggle("Pending approval", state.badges.approval, (value) =>
          params.onBadgeChange("approval", value),
        )}
        ${toggle("Outbox attention", state.badges.outbox, (value) =>
          params.onBadgeChange("outbox", value),
        )}
        ${toggle("Composer draft", state.badges.draft, (value) =>
          params.onBadgeChange("draft", value),
        )}
        ${toggle("Cloud placement", state.badges.cloud, (value) =>
          params.onBadgeChange("cloud", value),
        )}
        ${toggle("Disk warning", state.badges.disk, (value) => params.onBadgeChange("disk", value))}
        ${toggle("Workspace conflicts", state.badges.conflict, (value) =>
          params.onBadgeChange("conflict", value),
        )}
      </section>
      <section>
        <h2>Interaction</h2>
        ${toggle("Force hover", state.forceHover, (forceHover) => params.onChange({ forceHover }))}
        ${toggle("Keyboard focus", state.forceFocus, (forceFocus) =>
          params.onChange({ forceFocus }),
        )}
        ${toggle("Hovercard", state.hovercard, (hovercard) => params.onChange({ hovercard }))}
      </section>
    </div>
  </aside>`;
}
