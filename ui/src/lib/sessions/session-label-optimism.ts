import type { GatewaySessionRow } from "../../api/types.ts";
import type { SessionListScope } from "./session-capability.ts";

type LabelFields = Pick<GatewaySessionRow, "label" | "displayName">;
type PendingLabel = {
  token: symbol;
  previous: LabelFields;
  next: LabelFields;
  sessionId?: string;
  publishing: boolean;
  decoratedRows: WeakMap<object, GatewaySessionRow>;
};

type LabelOptimismHost = {
  publishedRow: (
    matches: (row: GatewaySessionRow, agentId?: string | null) => boolean,
  ) => GatewaySessionRow | undefined;
  sessionIdentity: (key: string, agentId?: string | null) => string;
  redecorateLists: () => void;
};

export type PendingLabelHandle = {
  confirm: () => void;
  settle: (completed: boolean, connectionCurrent: boolean) => void;
};

const rowFields = (row: GatewaySessionRow): LabelFields => ({
  label: row.label,
  displayName: row.displayName,
});

const labelFields = (label: string | null | undefined): LabelFields => ({
  label: label ?? undefined,
  displayName: label ?? undefined,
});

export function createSessionLabelOptimism(host: LabelOptimismHost) {
  const pendingLabels = new Map<string, PendingLabel>();

  return {
    get active() {
      return pendingLabels.size > 0;
    },
    start(params: {
      key: string;
      agentId?: string;
      expectedSessionId?: string;
      label: string | null | undefined;
    }): PendingLabelHandle | null {
      const identity = host.sessionIdentity(params.key, params.agentId);
      const row = host.publishedRow(
        (candidate, agentId) =>
          host.sessionIdentity(candidate.key, candidate.agentId ?? agentId) === identity,
      );
      // A dialog may outlive its row generation. Let the Gateway reject that
      // captured identity without ever painting over its replacement.
      if (!row || (params.expectedSessionId && row.sessionId !== params.expectedSessionId)) {
        return null;
      }
      const previous = pendingLabels.get(identity);
      const token = Symbol("session-label-patch");
      const next = labelFields(params.label);
      const pending: PendingLabel = {
        token,
        previous: previous?.previous ?? rowFields(row),
        next,
        sessionId: params.expectedSessionId ?? row.sessionId,
        publishing: true,
        decoratedRows: previous?.decoratedRows ?? new WeakMap(),
      };
      pendingLabels.set(identity, pending);
      try {
        host.redecorateLists();
      } finally {
        pending.publishing = false;
      }
      return {
        confirm() {
          const current = pendingLabels.get(identity);
          if (current && current.token !== token) {
            current.previous = next;
          }
        },
        settle(completed, connectionCurrent) {
          const current = pendingLabels.get(identity);
          if (!current || current.token !== token) {
            return;
          }
          if (!completed && connectionCurrent) {
            current.next = current.previous;
            host.redecorateLists();
          }
          pendingLabels.delete(identity);
        },
      };
    },
    decorate(
      row: GatewaySessionRow,
      decorated: GatewaySessionRow,
      owner: { scope: SessionListScope },
    ): GatewaySessionRow {
      const identity = host.sessionIdentity(row.key, row.agentId ?? owner.scope.agentId);
      const pending = pendingLabels.get(identity);
      if (!pending || (pending.sessionId && row.sessionId !== pending.sessionId)) {
        return decorated;
      }
      const previouslyDecorated = pending.decoratedRows.get(owner);
      // Re-decoration must not mistake its own overlay for a canonical update.
      // A new event/list row becomes the rollback baseline instead.
      if (previouslyDecorated !== row && !pending.publishing) {
        pending.previous = rowFields(row);
      }
      const next =
        decorated.label === pending.next.label && decorated.displayName === pending.next.displayName
          ? decorated
          : { ...decorated, ...pending.next };
      pending.decoratedRows.set(owner, next);
      return next;
    },
    clear: () => pendingLabels.clear(),
  };
}
