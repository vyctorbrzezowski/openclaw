import type { SessionsUsageResult } from "../../api/types.ts";
import type { ApplicationContext } from "../../app/context.ts";
import { renderAgentScopeControl } from "../../components/agent-scope-control.ts";
import { renderSettingsWorkspace } from "../../components/settings-workspace.ts";
import type { UsageProps } from "./types.ts";
import { renderUsage } from "./view.ts";

export function renderUsagePageShell(
  context: ApplicationContext,
  result: SessionsUsageResult | null,
  props: UsageProps,
) {
  const additionalAgentIds =
    result?.sessions
      .map((entry) => entry.agentId)
      .filter((agentId): agentId is string => Boolean(agentId?.trim())) ?? [];
  return renderSettingsWorkspace(
    renderUsage(
      props,
      renderAgentScopeControl({
        agents: context.agents.state.agentsList?.agents ?? [],
        additionalAgentIds,
        selection: context.agentSelection,
      }),
    ),
  );
}
