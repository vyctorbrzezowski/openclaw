// Single admission funnel for every composer attachment intake path (file
// input, drop, image paste, large-text paste, data-URL paste, annotation
// handoff). Enforces the hello-advertised decoded-size ceilings before
// encoding — an oversized base64 frame would exceed the gateway's WS payload
// cap and hard-drop the whole connection (1009) for every pane — and rejects
// zero-byte files, which the payload assembler would otherwise drop silently
// after send.
import { t } from "../../../i18n/index.ts";
import { showToast, type ToastSeverity } from "../../../lib/toast.ts";

function skippedFilesToast(
  messageKey: string,
  skipped: readonly File[],
  severity: ToastSeverity,
): void {
  if (skipped.length === 0) {
    return;
  }
  showToast({
    message: t(messageKey, {
      names: skipped
        .slice(0, 3)
        .map((file) => file.name)
        .join(", "),
      more: skipped.length > 3 ? ` +${skipped.length - 3}` : "",
    }),
    severity,
  });
}

export function admitAttachmentFiles(
  candidates: readonly File[],
  limits: { maxBytes: number; maxImageBytes: number } | undefined,
): File[] {
  const fileLimit = (file: File) =>
    file.type.startsWith("image/") ? limits?.maxImageBytes : limits?.maxBytes;
  const empty = candidates.filter((file) => file.size === 0);
  const oversized = candidates.filter(
    (file) => file.size > 0 && limits !== undefined && file.size > (fileLimit(file) ?? Infinity),
  );
  skippedFilesToast("chat.attachments.readFailed", empty, "danger");
  skippedFilesToast("chat.attachments.tooLarge", oversized, "warning");
  return candidates.filter((file) => !empty.includes(file) && !oversized.includes(file));
}
