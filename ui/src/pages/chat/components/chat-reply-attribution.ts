import { html, nothing } from "lit";
import "./chat-attribution.css";
import { resolveLocalUserName } from "../../../app/user-identity.ts";
import { icons } from "../../../components/icons.ts";
import { t } from "../../../i18n/index.ts";
import type { MessageGroup, NormalizedMessage } from "../../../lib/chat/chat-types.ts";
import { normalizeMessage } from "../../../lib/chat/message-normalizer.ts";
import { formatSenderLabel, type SenderIdentity } from "../../../lib/chat/sender-label.ts";
import { persistedMessageEntryId } from "../chat-thread.ts";
import { renderChatAuthorAvatar } from "./chat-author-avatar.ts";
import type { ReplyPreview, ReplyPreviewLookup } from "./chat-reply-preview.types.ts";

/**
 * Whether a reply reference adds context: unresolved references and a 1:1 turn
 * answering its own prompt stay hidden; a confirmed-missing target keeps only a
 * known sender name ("unavailable"), or none when its reserved row holds a
 * placeholder.
 */
export type ReplyAttribution = {
  presentation: "hidden" | "full" | "unavailable";
  sender: SenderIdentity;
  name: string;
  agentAvatar?: ReplyPreview["agentAvatar"];
  target?: NormalizedMessage["replyTarget"];
  loadedMessageId?: string | null;
  /** Hidden only: an unresolved id that still asks for its origin. */
  resolveMessageId?: string;
  /** Hidden only: the lookup is in flight, so the strip row stays reserved. */
  pending?: boolean;
};

type ReplyTarget = NormalizedMessage["replyTarget"];
type ReplyGroup = Pick<
  MessageGroup,
  | "role"
  | "messages"
  | "runId"
  | "replyShared"
  | "replyTurnSource"
  | "replyCurrentSource"
  | "replyToSender"
  | "replyToMessage"
>;

// Transcript rows are immutable; re-renders reuse their normalized form.
const normalizedMessages = new WeakMap<object, NormalizedMessage>();

function normalizeReplyMessage(message: unknown): NormalizedMessage {
  if (!message || typeof message !== "object") {
    return normalizeMessage(message);
  }
  let normalized = normalizedMessages.get(message);
  if (!normalized) {
    normalized = normalizeMessage(message);
    normalizedMessages.set(message, normalized);
  }
  return normalized;
}

export function isReplyAttributionVisible(
  attribution: ReplyAttribution | undefined,
): attribution is ReplyAttribution {
  return Boolean(attribution && attribution.presentation !== "hidden");
}

/** A visible strip, or the reserved row of one whose lookup is still in flight. */
export function holdsReplyAttributionRow(attribution: ReplyAttribution | undefined): boolean {
  return attribution?.pending === true || isReplyAttributionVisible(attribution);
}

const hiddenAttribution = (
  target: ReplyTarget,
  resolveMessageId?: string,
  pending?: boolean,
): ReplyAttribution => ({
  presentation: "hidden",
  sender: {},
  name: "",
  target,
  resolveMessageId,
  ...(pending ? { pending } : {}),
});

const fullAttribution = (
  name: string,
  sender: SenderIdentity | undefined,
  preview: ReplyPreview | undefined,
  target: ReplyTarget,
  id?: string | null,
): ReplyAttribution => ({
  presentation: "full",
  sender: { ...sender, name },
  name,
  agentAvatar: preview?.agentAvatar,
  target,
  loadedMessageId: preview?.isLoaded ? id : undefined,
});

function lookupReply(resolveReplyPreview: ReplyPreviewLookup | undefined, id: string) {
  const result = resolveReplyPreview?.(id);
  if (!result || "pending" in result || "oversized" in result) {
    return undefined;
  }
  return "missing" in result ? null : result;
}

/** A `null` lookup confirmed the origin is inaccessible. */
function resolveTargetAttribution(
  target: Extract<NonNullable<ReplyTarget>, { kind: "id" }>,
  snapshot: NormalizedMessage["replyPreview"],
  resolveReplyPreview: ReplyPreviewLookup | undefined,
  group?: ReplyGroup,
): ReplyAttribution {
  const result = resolveReplyPreview?.(target.id);
  const resolved = lookupReply(resolveReplyPreview, target.id);
  // Reserve the row only when the answer can fill it: a 1:1 turn whose prompt
  // is not loaded may be answering that prompt, which stays hidden.
  const reservesRow = !group || Boolean(group.replyShared || group.replyTurnSource);
  if (resolved === null) {
    // Known snapshot facts only: no inferred avatar and nothing to navigate to.
    // A reserved row keeps its height as an anonymous placeholder.
    const known = snapshot?.senderLabel || "";
    return known || reservesRow
      ? { presentation: "unavailable", sender: known ? { name: known } : {}, name: known, target }
      : hiddenAttribution(target);
  }
  // Snapshot text alone names no author; only its sender label or the source does.
  // An oversized original exists, so a name-only snapshot still names it.
  const exists = Boolean(snapshot?.text || (result && "oversized" in result));
  const name =
    (resolved
      ? resolved.senderLabel || formatSenderLabel(resolved.sender)
      : exists && snapshot?.senderLabel) || "";
  // A 1:1 turn answering its own prompt adds nothing. A prompt paged out of the
  // loaded history is still this turn's by run ownership.
  const turnSource =
    group &&
    !group.replyShared &&
    ((group.replyTurnSource &&
      persistedMessageEntryId(group.replyTurnSource.message) === target.id) ||
      (group.runId && resolved?.turnRunId === group.runId));
  if (name && !turnSource) {
    return fullAttribution(name, resolved?.sender, resolved, target, target.id);
  }
  if (resolved || name) {
    return hiddenAttribution(target);
  }
  const pending = Boolean(result && "pending" in result) && reservesRow;
  return hiddenAttribution(target, target.id, pending);
}

/** Attribution to a transcript row the group already knows (automatic or resolved current). */
function resolveSourceAttribution(
  source: unknown,
  sender: SenderIdentity | undefined,
  resolveReplyPreview: ReplyPreviewLookup | undefined,
): ReplyAttribution | undefined {
  const sourceId = source ? persistedMessageEntryId(source) : null;
  const resolved = sourceId ? lookupReply(resolveReplyPreview, sourceId) || undefined : undefined;
  const sourceSender = sender ?? resolved?.sender;
  const name = resolved?.senderLabel || formatSenderLabel(sourceSender);
  return name
    ? fullAttribution(
        name,
        sourceSender,
        resolved,
        sourceId ? { kind: "id", id: sourceId } : { kind: "current" },
        sourceId,
      )
    : undefined;
}

export function resolveMessageReplyAttribution(
  message: NormalizedMessage,
  resolveReplyPreview?: ReplyPreviewLookup,
  userId?: string | null,
): ReplyAttribution | undefined {
  const target = message.replyTarget;
  if (target?.kind !== "id") {
    // A bare reply_to_current names no origin outside its turn context.
    return target ? hiddenAttribution(target) : undefined;
  }
  const attribution = resolveTargetAttribution(target, message.replyPreview, resolveReplyPreview);
  if (
    attribution.presentation === "full" &&
    attribution.sender.identity?.type === "profile" &&
    attribution.sender.identity.id === userId
  ) {
    attribution.name = resolveLocalUserName();
  }
  return attribution;
}

export function resolveReplyAttribution(
  group: ReplyGroup,
  resolveReplyPreview?: ReplyPreviewLookup,
  replyMessages: MessageGroup["messages"] = group.messages,
): ReplyAttribution | undefined {
  if (group.role !== "assistant") {
    return undefined;
  }
  const messages = group.messages.map(({ message }) => normalizeReplyMessage(message));
  const snapshots = replyMessages.map(({ message }) => normalizeReplyMessage(message));
  const find = (list: NormalizedMessage[], kind: "id" | "current") =>
    list.find((message) => message.replyTarget?.kind === kind);
  const ownCurrent = find(messages, "current");
  const explicit = find(messages, "id") ?? (ownCurrent ? undefined : find(snapshots, "id"));
  if (explicit?.replyTarget?.kind === "id") {
    const target = explicit.replyTarget;
    const matching = snapshots.filter(
      (message) => message.replyTarget?.kind === "id" && message.replyTarget.id === target.id,
    );
    const snapshot =
      matching.find((message) => message.replyPreview?.text)?.replyPreview ??
      matching.find((message) => message.replyPreview)?.replyPreview;
    return resolveTargetAttribution(target, snapshot, resolveReplyPreview, group);
  }
  const current = ownCurrent ?? find(snapshots, "current");
  if (current) {
    // An unresolved reply_to_current never guesses its origin, not even the latest prompt.
    const source = group.replyCurrentSource;
    const attribution =
      source &&
      resolveSourceAttribution(
        source.message,
        normalizeReplyMessage(source.message).sender,
        resolveReplyPreview,
      );
    return attribution && (group.replyShared || source?.key !== group.replyTurnSource?.key)
      ? attribution
      : hiddenAttribution(current.replyTarget);
  }
  // Automatic attribution: several people share this thread.
  return group.replyToSender
    ? resolveSourceAttribution(
        group.replyToMessage?.message,
        group.replyToSender,
        resolveReplyPreview,
      )
    : undefined;
}

type ReplyAttributionActions = {
  onOpenReply?: (id: string) => void;
  onResolveReply?: (id: string) => void;
  replyNavigationId?: string | null;
};

/**
 * `inline` renders inside a message bubble; `peer` is the strip above a human
 * quote. Every variant navigates to a known original, loaded or not; a
 * confirmed-missing one stays plain text.
 */
export function renderReplyAttribution(
  attribution: ReplyAttribution | undefined,
  { onOpenReply, onResolveReply, replyNavigationId }: ReplyAttributionActions,
  variant?: "inline" | "peer",
) {
  const inline = variant === "inline";
  const rowClass = `chat-reply-attribution chat-reply-attribution--${inline ? "inline" : "reply"}`;
  const label = () => html`<span class="chat-reply-attribution__label"
    >${inline ? nothing : html`<span class="chat-reply-attribution__mobile-icon" aria-hidden="true">${icons.cornerUpLeft}</span>`}${t("chat.messages.replyingToLabel")}</span
  >`;
  if (!attribution || attribution.presentation === "hidden") {
    // Nothing to show yet, but an unresolved id still asks for its origin.
    if (attribution?.resolveMessageId) {
      onResolveReply?.(attribution.resolveMessageId);
    }
    // An in-flight lookup keeps the row so the answer fills it in place.
    return attribution?.pending
      ? html`<div class="${rowClass} chat-reply-attribution--pending" aria-hidden="true">
          ${label()}
        </div>`
      : nothing;
  }
  const { name, target } = attribution;
  const unavailable = attribution.presentation === "unavailable";
  const targetId = target?.kind === "id" ? target.id : undefined;
  const sourceId = unavailable ? undefined : targetId || attribution.loadedMessageId;
  const loading = Boolean(targetId) && replyNavigationId === targetId;
  const person = html`
    ${unavailable ? nothing : renderChatAuthorAvatar(attribution.sender, undefined, attribution.agentAvatar)}
    <span class="chat-reply-attribution__name" title=${name}>${name}</span>
  `;
  return html`<div class=${rowClass}>
    ${label()}
    ${
      sourceId && onOpenReply
        ? html`<button
            class="chat-reply-attribution__person chat-reply-attribution__target"
            type="button"
            aria-label=${t("chat.messages.replyingTo", { name })}
            ?disabled=${loading}
            aria-busy=${loading ? "true" : "false"}
            @click=${() => onOpenReply(sourceId)}
          >
            ${person}
          </button>`
        : name
          ? html`<span class="chat-reply-attribution__person">${person}</span>`
          : nothing
    }
    ${
      unavailable
        ? html`<span class="chat-reply-attribution__unavailable"
            >${t("chat.messages.replyOriginalUnavailable")}</span
          >`
        : nothing
    }
  </div>`;
}
