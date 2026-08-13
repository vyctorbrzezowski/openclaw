/** Ref callback that marks single-line text only while it is genuinely clipped. */
export function createOverflowFadeRef() {
  let target: HTMLElement | null = null;
  let observer: ResizeObserver | null = null;

  const sync = () => {
    target?.toggleAttribute("data-overflow-fade", target.scrollWidth > target.clientWidth + 1);
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
  };
}
