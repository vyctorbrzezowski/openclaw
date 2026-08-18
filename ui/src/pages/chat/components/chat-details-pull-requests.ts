import { html, nothing } from "lit";
import type {
  ControlUiSessionBranch,
  ControlUiSessionPullRequest,
} from "../../../../../src/gateway/control-ui-contract.js";
import { icons } from "../../../components/icons.ts";

export function renderChatDetailsPullRequests(props: {
  pullRequests: readonly ControlUiSessionPullRequest[];
  branch?: ControlUiSessionBranch;
  onOpenSessionDiff?: () => void;
}) {
  const pullRequest = props.pullRequests[0];
  if (!pullRequest && !props.branch) {
    return nothing;
  }
  if (!pullRequest && props.branch) {
    return html`<button class="chat-details__row" type="button" @click=${props.onOpenSessionDiff}>
      <span class="chat-details__row-icon" aria-hidden="true">${icons.diff}</span>
      <span class="chat-details__row-label">${props.branch.branch}</span>
      ${renderDiff(props.branch)}
      <span class="chat-details__row-trailing" aria-hidden="true">${icons.chevronRight}</span>
    </button>`;
  }
  if (!pullRequest) {
    return nothing;
  }
  const checks = pullRequest.checks;
  return html`<a
    class="chat-details__row chat-details__pr"
    href=${pullRequest.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="chat-details__row-icon" aria-hidden="true">${icons.gitPullRequest}</span>
    <span class="chat-details__row-label">#${pullRequest.number} ${pullRequest.repo}</span>
    ${renderDiff(pullRequest)}
    ${checks
      ? html`<span class="chat-details__pr-checks" data-state=${checks.state}
          >${checks.passed}✓ ${checks.failed}× ${checks.running}…</span
        >`
      : nothing}
    <span class="chat-details__row-trailing" aria-hidden="true">${icons.externalLink}</span>
  </a>`;
}

function renderDiff(item: { additions?: number; deletions?: number }) {
  if (item.additions === undefined && item.deletions === undefined) {
    return nothing;
  }
  return html`<span class="chat-details__diff"
    ><span>+${item.additions ?? 0}</span><span>−${item.deletions ?? 0}</span></span
  >`;
}
