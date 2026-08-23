import type { ReactiveController, ReactiveControllerHost } from "lit";

// Polled output is user-visible, so timers stay armed only while the tab is
// visible; otherwise background polls and per-second wakeups run invisibly.
// Becoming visible fires one immediate catch-up tick so a returning user
// lands on fresh data without waiting a full interval. With a Lit host the
// element lifecycle drives start/stop; standalone callers (no host) call
// them directly — start/stop own the visibility listener either way.
export class PollController implements ReactiveController {
  private timer: ReturnType<typeof globalThis.setInterval> | null = null;
  private started = false;

  constructor(
    private readonly host: ReactiveControllerHost | null,
    private readonly intervalMs: number,
    private readonly tick: () => void,
    private readonly autoStart = true,
  ) {
    this.host?.addController(this);
  }

  hostConnected(): void {
    if (this.autoStart) {
      this.start();
    }
  }

  hostDisconnected(): void {
    this.stop();
  }

  start(): boolean {
    const wasStopped = !this.started;
    this.started = true;
    // Duplicate add/remove of the same listener is a no-op, so restarts stay
    // correct without tracking attachment state separately.
    document.addEventListener("visibilitychange", this);
    if (this.timer === null && document.visibilityState === "visible") {
      this.arm();
    }
    return wasStopped;
  }

  stop(): void {
    this.started = false;
    document.removeEventListener("visibilitychange", this);
    this.disarm();
  }

  handleEvent(): void {
    if (!this.started) {
      return;
    }
    // Catch-up tick only after a hidden pause; a redundant visible event on an
    // already-armed interval must not fire an extra tick.
    const resuming = this.timer === null;
    this.disarm();
    if (document.visibilityState !== "visible") {
      return;
    }
    if (resuming) {
      this.tick();
    }
    this.arm();
  }

  private arm(): void {
    this.timer = globalThis.setInterval(() => this.tick(), this.intervalMs);
  }

  private disarm(): void {
    if (this.timer !== null) {
      globalThis.clearInterval(this.timer);
      this.timer = null;
    }
  }
}
