import { html, nothing, type TemplateResult } from "lit";

type EndcapContent = TemplateResult | typeof nothing;

export function renderSessionRowEndcap(params: {
  treeControl?: EndcapContent;
  duration?: EndcapContent;
  auxiliary?: EndcapContent;
  actions?: EndcapContent;
  primary?: EndcapContent;
  child: boolean;
}) {
  const {
    treeControl = nothing,
    duration = nothing,
    auxiliary = nothing,
    actions = nothing,
    primary = nothing,
    child,
  } = params;
  return html`<span class="session-row-endcap" data-session-endcap=${child ? "child" : "parent"}>
    ${treeControl}
    ${duration === nothing
      ? nothing
      : html`<span class="session-row-endcap__duration">${duration}</span>`}
    ${child
      ? auxiliary
      : html`<span class="session-row-endcap__auxiliary">
          <span class="session-row-endcap__resting">${auxiliary}</span>
          <span class="session-row-endcap__actions">${actions}</span>
        </span>`}
    <span class="session-row-endcap__primary">${primary}</span>
  </span>`;
}
