const COMPOSER_AUTOTYPE_EXEMPT_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='combobox'], [role='listbox'], [role='textbox'], [data-chat-autotype-exempt]";
const SPACE_ACTIVATION_SELECTOR =
  "a[href], button, summary, [role='button'], [role='checkbox'], [role='link'], [role='radio'], [role='switch']";

function eventPathMatches(event: KeyboardEvent, selector: string): boolean {
  return event
    .composedPath()
    .some((target) => target instanceof Element && target.matches(selector));
}

export function shouldFocusComposerForPrintableKey(event: KeyboardEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.key.length === 1 &&
    !eventPathMatches(event, COMPOSER_AUTOTYPE_EXEMPT_SELECTOR) &&
    !(event.key === " " && eventPathMatches(event, SPACE_ACTIVATION_SELECTOR)) &&
    !document.openClawModalLayers?.size &&
    !document.querySelector("[aria-modal='true']")
  );
}
