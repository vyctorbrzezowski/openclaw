import { html, nothing, type TemplateResult } from "lit";

type EndcapContent = TemplateResult | typeof nothing;

export function renderSessionRowEndcap(params: {
  treeControl?: EndcapContent;
  duration?: EndcapContent;
  restSummary?: EndcapContent;
  management?: EndcapContent;
  auxiliary?: EndcapContent;
  primary?: EndcapContent;
  child: boolean;
}) {
  const {
    treeControl = nothing,
    duration = nothing,
    restSummary = nothing,
    management = nothing,
    auxiliary = nothing,
    primary = nothing,
    child,
  } = params;
  return html`<span class="session-row-endcap" data-session-endcap=${child ? "child" : "parent"}>
    ${treeControl}
    ${duration === nothing
      ? nothing
      : html`<span class="session-row-endcap__duration">${duration}</span>`}
    ${child
      ? html`${auxiliary}<span class="session-row-endcap__primary">${primary}</span>`
      : html`<span class="session-row-endcap__swap">
          <span class="session-row-endcap__rest-summary">${restSummary}${primary}</span>
          <span class="session-row-endcap__management">${management}</span>
        </span>`}
  </span>`;
}
