import { html, nothing, type TemplateResult } from "lit";
import { renderWizardStepControls } from "../../components/wizard-step-controls.ts";
import { t } from "../../i18n/index.ts";
import "../../components/modal-dialog.ts";
import type { ModelSetupWizardState } from "./state.ts";

const WIZARD_TEXT_INPUT_ID = "model-setup-wizard-text-input";

type WizardViewProps = {
  mode: "auth" | "prepare";
  state: ModelSetupWizardState;
  refreshWarning: string | null;
  value: unknown;
  onValueChange: (value: unknown) => void;
  onAnswer: (value: unknown, includeValue?: boolean) => void;
  onCancel: () => void;
  onClose: () => void;
};

export function renderModelSetupWizard(props: WizardViewProps): TemplateResult | typeof nothing {
  if (props.state.phase === "idle") {
    return nothing;
  }
  const canCancel =
    props.state.phase === "starting" ||
    props.state.phase === "step" ||
    props.state.phase === "done";
  return html`
    <openclaw-modal-dialog
      class="dialog-md"
      label=${t(
        props.mode === "prepare"
          ? "modelSetup.wizard.prepareDialogLabel"
          : "modelSetup.wizard.dialogLabel",
      )}
      @modal-cancel=${canCancel ? props.onCancel : props.onClose}
    >
      <div class="dialog-surface dialog-surface--divided model-setup-wizard">
        <div class="dialog-header">
          <div class="dialog-heading">
            <h2 class="dialog-title">
              ${props.state.phase === "step" && props.state.step.title
                ? props.state.step.title
                : t(
                    props.mode === "prepare"
                      ? "modelSetup.wizard.prepareTitle"
                      : "modelSetup.wizard.title",
                  )}
            </h2>
          </div>
        </div>
        <div class="dialog-body dialog-body--stack model-setup-wizard__body">
          ${props.refreshWarning
            ? html`<div class="callout warning" role="alert">${props.refreshWarning}</div>`
            : nothing}
          ${props.state.phase === "starting"
            ? html`<div role="status">
                ${t(
                  props.mode === "prepare"
                    ? "modelSetup.wizard.prepareStarting"
                    : "modelSetup.wizard.starting",
                )}
              </div>`
            : props.state.phase === "done"
              ? html`<div role="status">${t("modelSetup.wizard.checking")}</div>`
              : props.state.phase === "error" || props.state.phase === "cancelled"
                ? html`<div class="callout danger" role="alert">${props.state.message}</div>`
                : html`
                    ${props.state.validationError
                      ? html`<div class="callout danger" role="alert">
                          ${props.state.validationError}
                        </div>`
                      : nothing}
                    ${renderWizardStepControls({
                      step: props.state.step,
                      value: props.value,
                      busy: props.state.busy,
                      inputId: WIZARD_TEXT_INPUT_ID,
                      confirmAffirmativeLabel:
                        props.mode === "prepare" && props.state.step.type === "confirm"
                          ? t("modelSetup.wizard.continue")
                          : undefined,
                      leadingAction: html`<button
                        type="button"
                        class="btn"
                        @click=${props.onCancel}
                      >
                        ${t("common.cancel")}
                      </button>`,
                      onValueChange: props.onValueChange,
                      onAnswer: props.onAnswer,
                    })}
                    ${props.state.busy
                      ? html`<div role="status">${t("modelSetup.wizard.working")}</div>`
                      : nothing}
                  `}
        </div>
        ${props.state.phase === "step"
          ? nothing
          : html`
              <div class="dialog-footer">
                <button
                  type="button"
                  class="btn"
                  @click=${canCancel ? props.onCancel : props.onClose}
                >
                  ${canCancel ? t("common.cancel") : t("common.close")}
                </button>
              </div>
            `}
      </div>
    </openclaw-modal-dialog>
  `;
}
