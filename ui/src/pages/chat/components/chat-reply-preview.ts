// Reply-preview resolution: memoized quoted-source previews served from
// already-loaded transcript rows first, then the reply-message access loader.
import { normalizeRoleForGrouping } from "../../../lib/chat/message-normalizer.ts";
import { DEFAULT_AGENT_ID } from "../../../lib/sessions/session-key.ts";
import { userTurnRunId } from "../chat-thread-items.ts";
import { persistedMessageEntryId } from "../chat-thread.ts";
import { prepareChatMessageRender, resolveMessageReplyText } from "./chat-message-markdown.ts";
import { resolveMessageGroupSenderLabel } from "./chat-message-sender.ts";
import type {
  LoadedReplySource,
  MissingReplyPreview,
  OversizedReplyPreview,
  PendingReplyPreview,
  ReplyPreview,
  ReplyPreviewLookup,
} from "./chat-reply-preview.types.ts";
import { resolveAssistantDisplayAvatar } from "./chat-welcome.ts";

type ResolvedReplyPreview = ReplyPreview | undefined;
const MISSING_REPLY_PREVIEW: MissingReplyPreview = { missing: true };
const PENDING_REPLY_PREVIEW: PendingReplyPreview = { pending: true };
const OVERSIZED_REPLY_PREVIEW: OversizedReplyPreview = { oversized: true };
type ReplyPreviewProps = Omit<
  Parameters<typeof resolveAssistantDisplayAvatar>[0],
  "assistantAvatar"
> & {
  assistantAvatar?: string | null;
  assistantName: string;
  userId?: string | null;
  userName?: string | null;
  senderAgentAvatars?: ReadonlyMap<string, string | null>;
  replyMessageAccess?: {
    read: (messageId: string) => unknown;
    missing?: (messageId: string) => boolean;
    oversized?: (messageId: string) => boolean;
    pending?: (messageId: string) => boolean;
  };
};

function projectResolvedReplyPreview(
  message: unknown,
  replyToId: string,
  props: ReplyPreviewProps,
  loaded?: LoadedReplySource,
): ResolvedReplyPreview {
  const { normalizedMessage: normalized, displayMarkdown } = prepareChatMessageRender(message);
  const text = resolveMessageReplyText(message, normalized, displayMarkdown);
  const persistedId = persistedMessageEntryId(message);
  // A persisted original names its author even when it has no text (image-only, etc.).
  if (!text && !persistedId) {
    return undefined;
  }
  const group = {
    ...normalized,
    messages: [{ message }],
  };
  const sourceMessageId = persistedId ?? replyToId;
  const senderLabel = loaded?.senderLabel ?? resolveMessageGroupSenderLabel(group, props);
  const isAssistant = normalizeRoleForGrouping(normalized.role) === "assistant";
  const agentId = normalized.senderSession?.agentId ?? props.currentAgentId ?? DEFAULT_AGENT_ID;
  const isCurrentAgent = agentId === (props.currentAgentId ?? DEFAULT_AGENT_ID);
  return {
    messageId: loaded?.messageId ?? sourceMessageId,
    sourceMessageId: loaded ? replyToId : sourceMessageId,
    senderLabel,
    sender: isAssistant
      ? {
          ...normalized.sender,
          name: senderLabel,
          identity: normalized.sender?.identity ?? { type: "agent", id: agentId },
        }
      : normalized.sender,
    ...(isAssistant
      ? {
          agentAvatar: resolveAssistantDisplayAvatar({
            currentAgentId: agentId,
            agents: props.agents,
            assistantAvatar: isCurrentAgent ? (props.assistantAvatar ?? null) : null,
            assistantAvatarUrl: isCurrentAgent
              ? props.assistantAvatarUrl
              : props.senderAgentAvatars?.get(agentId),
          }),
        }
      : {}),
    isLoaded: Boolean(loaded),
    ...(isAssistant ? {} : { turnRunId: userTurnRunId(message) ?? undefined }),
    text,
  };
}

export function createReplyPreviewResolver(
  loadedReplySources: ReadonlyMap<string, LoadedReplySource>,
  props: ReplyPreviewProps,
): ReplyPreviewLookup {
  const resolved = new Map<string, ReturnType<ReplyPreviewLookup>>();
  return (replyToId) => {
    if (resolved.has(replyToId)) {
      return resolved.get(replyToId);
    }
    const loaded = loadedReplySources.get(replyToId);
    const loadedPreview = loaded
      ? projectResolvedReplyPreview(loaded.message, replyToId, props, loaded)
      : undefined;
    if (loadedPreview) {
      resolved.set(replyToId, loadedPreview);
      return loadedPreview;
    }
    const message = props.replyMessageAccess?.read(replyToId);
    const preview = message
      ? projectResolvedReplyPreview(message, replyToId, props)
      : props.replyMessageAccess?.missing?.(replyToId)
        ? MISSING_REPLY_PREVIEW
        : props.replyMessageAccess?.oversized?.(replyToId)
          ? OVERSIZED_REPLY_PREVIEW
          : props.replyMessageAccess?.pending?.(replyToId)
            ? PENDING_REPLY_PREVIEW
            : undefined;
    resolved.set(replyToId, preview);
    return preview;
  };
}
