/**
 * Guards against repeated tool-loop compactions that never make progress.
 */
import { createSubsystemLogger } from "../../logging/subsystem.js";

/**
 * Detects identical tool-call loops immediately after automatic compaction.
 *
 * The guard only observes a small post-compaction window; if compaction failed to break an
 * identical args/result loop, the runner aborts before spending unbounded tokens.
 */
const log = createSubsystemLogger("agents/post-compaction-guard");

const DEFAULT_WINDOW_SIZE = 3;

// Bounded recent-call tail kept across the whole run so arming can snapshot what the
// model was doing right before compaction. Without it, re-reads of summarized content
// inside the post-compaction window leave no recorded fact at all.
const BASELINE_WINDOW_SIZE = 16;

type PostCompactionGuardObservation = {
  toolName: string;
  argsHash: string;
  resultHash: string;
};

type PostCompactionGuardVerdict =
  | { shouldAbort: false; armed: boolean; remainingAttempts: number }
  | {
      shouldAbort: true;
      armed: boolean;
      remainingAttempts: number;
      detector: "compaction_loop_persisted";
      count: number;
      toolName: string;
      message: string;
    };

type PostCompactionLoopGuard = {
  armPostCompaction: () => void;
  closePostCompactionWindow: () => void;
  observe: (call: PostCompactionGuardObservation) => PostCompactionGuardVerdict;
  snapshot: () => { armed: boolean; remainingAttempts: number };
};

type GuardState = {
  enabled: boolean;
  windowSize: number;
  remainingAttempts: number;
  history: PostCompactionGuardObservation[];
  recentCalls: PostCompactionGuardObservation[];
  baselineSignatures: Set<string> | undefined;
  windowObserved: number;
  windowRepeats: number;
  repeatTools: Set<string>;
};

const observationSignature = (call: PostCompactionGuardObservation): string =>
  `${call.toolName}\0${call.argsHash}`;

/** Creates a stateful post-compaction loop detector for one embedded run. */
export function createPostCompactionLoopGuard(options?: {
  enabled?: boolean;
}): PostCompactionLoopGuard {
  const state: GuardState = {
    enabled: options?.enabled ?? true,
    windowSize: DEFAULT_WINDOW_SIZE,
    remainingAttempts: 0,
    history: [],
    recentCalls: [],
    baselineSignatures: undefined,
    windowObserved: 0,
    windowRepeats: 0,
    repeatTools: new Set<string>(),
  };

  const closeWindow = (summarize: boolean): void => {
    if (!state.baselineSignatures) {
      return;
    }
    if (summarize) {
      const tools = [...state.repeatTools].toSorted().join(",");
      log.info(
        `post-compaction window closed: toolCalls=${state.windowObserved} ` +
          `preCompactionRepeats=${state.windowRepeats}${tools ? ` tools=${tools}` : ""}`,
      );
    }
    state.remainingAttempts = 0;
    state.baselineSignatures = undefined;
    state.history = [];
    state.windowObserved = 0;
    state.windowRepeats = 0;
    state.repeatTools = new Set<string>();
  };

  const closePostCompactionWindow = (): void => closeWindow(true);

  const armPostCompaction = (): void => {
    // A new compaction ends the prior diagnostic window even when it observed
    // fewer than three calls; otherwise re-arming silently drops those facts.
    closePostCompactionWindow();
    state.baselineSignatures = state.enabled
      ? new Set(state.recentCalls.map(observationSignature))
      : undefined;
    state.remainingAttempts = state.enabled ? state.windowSize : 0;
    if (state.enabled) {
      log.info(`post-compaction guard armed for ${state.windowSize} attempts`);
    }
  };

  const observe = (call: PostCompactionGuardObservation): PostCompactionGuardVerdict => {
    if (!state.enabled) {
      return { shouldAbort: false, armed: false, remainingAttempts: 0 };
    }
    state.recentCalls.push(call);
    if (state.recentCalls.length > BASELINE_WINDOW_SIZE) {
      state.recentCalls.shift();
    }
    if (state.remainingAttempts <= 0) {
      return { shouldAbort: false, armed: false, remainingAttempts: 0 };
    }
    state.remainingAttempts -= 1;
    state.windowObserved += 1;
    if (state.baselineSignatures?.has(observationSignature(call))) {
      state.windowRepeats += 1;
      state.repeatTools.add(call.toolName);
    }
    state.history.push(call);
    const armedAfter = state.remainingAttempts > 0;

    // Compare full tool name + args + result. Repeated args alone can be legitimate polling;
    // identical results after compaction prove the compression did not change the loop.
    const matches = state.history.filter(
      (entry) =>
        entry.toolName === call.toolName &&
        entry.argsHash === call.argsHash &&
        entry.resultHash === call.resultHash,
    );

    if (matches.length >= state.windowSize) {
      log.error(
        `post-compaction loop persisted: tool=${call.toolName} repeated ${matches.length} times with identical args+result post-compaction`,
      );
      closeWindow(false);
      return {
        shouldAbort: true,
        armed: false,
        remainingAttempts: state.remainingAttempts,
        detector: "compaction_loop_persisted",
        count: matches.length,
        toolName: call.toolName,
        message: `CRITICAL: tool ${call.toolName} repeated ${matches.length} times with identical arguments and identical results within ${state.windowSize} attempts after auto-compaction. The compaction did not break the loop. Aborting to prevent runaway resource use.`,
      };
    }

    if (!armedAfter) {
      closePostCompactionWindow();
    }

    return { shouldAbort: false, armed: armedAfter, remainingAttempts: state.remainingAttempts };
  };

  const snapshot = () => ({
    armed: state.remainingAttempts > 0,
    remainingAttempts: state.remainingAttempts,
  });

  return { armPostCompaction, closePostCompactionWindow, observe, snapshot };
}

/** Error raised when the post-compaction loop guard aborts a run. */
export class PostCompactionLoopPersistedError extends Error {
  readonly detector: "compaction_loop_persisted";
  readonly count: number;
  readonly toolName: string;

  constructor(
    message: string,
    details: {
      detector: "compaction_loop_persisted";
      count: number;
      toolName: string;
    },
  ) {
    super(message);
    this.name = "PostCompactionLoopPersistedError";
    this.detector = details.detector;
    this.count = details.count;
    this.toolName = details.toolName;
  }

  static fromVerdict(
    verdict: Extract<PostCompactionGuardVerdict, { shouldAbort: true }>,
  ): PostCompactionLoopPersistedError {
    return new PostCompactionLoopPersistedError(verdict.message, {
      detector: verdict.detector,
      count: verdict.count,
      toolName: verdict.toolName,
    });
  }
}
