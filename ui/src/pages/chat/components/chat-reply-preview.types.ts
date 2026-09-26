import type { normalizeMessage } from "../../../lib/chat/message-normalizer.ts";
import type { renderChatAuthorAvatar } from "./chat-author-avatar.ts";
import type { MessageReplyTarget } from "./chat-message-markdown.ts";

export type LoadedReplySource = {
  message: unknown;
  messageId: string;
  senderLabel: string;
};

export type ReplyPreview = MessageReplyTarget & {
  sourceMessageId: string;
  sender?: ReturnType<typeof normalizeMessage>["sender"];
  isLoaded?: boolean;
  /** The run a source prompt started, from its persisted user-turn identity. */
  turnRunId?: string;
  agentAvatar?: Parameters<typeof renderChatAuthorAvatar>[2];
};

/** The lookup confirmed that the referenced message is inaccessible. */
export type MissingReplyPreview = { missing: true };

export type ReplyPreviewLookup = (
  replyToId: string,
) => ReplyPreview | MissingReplyPreview | undefined;
