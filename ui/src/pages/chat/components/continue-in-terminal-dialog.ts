import { html } from "lit";
import { renderConnectCommand } from "../../../components/connect-command.ts";
import "../../../components/modal-dialog.ts";
import { t } from "../../../i18n/index.ts";

export function renderContinueInTerminalDialog(params: { command: string; onClose: () => void }) {
  const title = t("chat.sessionHeader.continueInTerminal.title");
  const description = t("chat.sessionHeader.continueInTerminal.description");
  return html`
    <openclaw-modal-dialog
      class="continue-in-terminal-dialog"
      label=${title}
      description=${description}
      @modal-cancel=${params.onClose}
    >
      <section class="dialog-surface">
        <header class="dialog-header">
          <div class="dialog-heading">
            <h2 class="dialog-title">${title}</h2>
            <p class="dialog-subtitle">${description}</p>
          </div>
        </header>
        <div class="dialog-body">${renderConnectCommand(params.command)}</div>
        <p class="dialog-note">${t("chat.sessionHeader.continueInTerminal.authNote")}</p>
        <footer class="dialog-footer">
          <button type="button" class="btn primary" @click=${params.onClose}>
            ${t("common.close")}
          </button>
        </footer>
      </section>
    </openclaw-modal-dialog>
  `;
}
