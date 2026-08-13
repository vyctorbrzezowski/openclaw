/** Ref callback that marks single-line text only while it is genuinely clipped. */
export function createOverflowFadeRef(options: { revealTrailingActions?: boolean } = {}) {
  let target: HTMLElement | null = null;
  let observer: ResizeObserver | null = null;

  const sync = () => {
    if (!target) {
      return;
    }
    const contentWidth = target.scrollWidth;
    const restingWidth = target.clientWidth;
    target.toggleAttribute("data-overflow-fade", contentWidth > restingWidth + 1);
    const management = options.revealTrailingActions
      ? target
          .closest<HTMLElement>(".session-row-host")
          ?.querySelector<HTMLElement>(".session-row-endcap__management")
      : null;
    const managementReserve = management?.offsetWidth ?? 0;
    const revealDistance = Math.max(0, contentWidth - (restingWidth - managementReserve));
    target.toggleAttribute("data-overflow-reveal", revealDistance > 1);
    const direction = getComputedStyle(target).direction === "rtl" ? 1 : -1;
    target.style.setProperty("--overflow-reveal-translate", `${direction * revealDistance}px`);
  };

  return (element?: Element) => {
    const next = element instanceof HTMLElement ? element : null;
    if (next === target) {
      sync();
      return;
    }
    observer?.disconnect();
    target = next;
    observer = null;
    if (!target) {
      return;
    }
    sync();
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(sync);
      observer.observe(target);
    }
    queueMicrotask(sync);
  };
}
