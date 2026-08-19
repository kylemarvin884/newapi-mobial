import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage } from '@/types/api';

const legacyChatKey = 'kyle-ai-chat-history';
const maxConversations = 40;
const maxMessagesPerConversation = 80;
const writeQueues = new Map<number, Promise<void>>();

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  keyId: string;
  modelId: string;
}

export interface ChatHistory {
  activeConversationId: string | null;
  conversations: ChatConversation[];
}

export const emptyChatHistory = (): ChatHistory => ({
  activeConversationId: null,
  conversations: [],
});

export function createConversation(
  options: Partial<Pick<ChatConversation, 'keyId' | 'modelId' | 'title'>> = {},
): ChatConversation {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    title: options.title || '新对话',
    createdAt: now,
    updatedAt: now,
    messages: [],
    keyId: options.keyId || '',
    modelId: options.modelId || '',
  };
}

export function conversationTitle(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length > 28 ? `${normalized.slice(0, 28)}…` : normalized || '新对话';
}

function storageKey(userId: number): string {
  return `kyle-ai-chat-history-v2:${userId}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessage>;
  const validImages = message.images === undefined || (
    Array.isArray(message.images) && message.images.every((image) =>
      !!image && typeof image === 'object' &&
      typeof image.url === 'string' && typeof image.b64_json === 'string',
    )
  );
  return (
    typeof message.id === 'string' &&
    typeof message.content === 'string' &&
    (message.role === 'system' || message.role === 'user' || message.role === 'assistant') &&
    (message.kind === undefined || message.kind === 'text' || message.kind === 'image') &&
    validImages
  );
}

function normalizeConversation(value: unknown): ChatConversation | null {
  if (!value || typeof value !== 'object') return null;
  const conversation = value as Partial<ChatConversation>;
  if (typeof conversation.id !== 'string') return null;
  const now = Date.now();
  return {
    id: conversation.id,
    title: typeof conversation.title === 'string' && conversation.title ? conversation.title : '新对话',
    createdAt: typeof conversation.createdAt === 'number' ? conversation.createdAt : now,
    updatedAt: typeof conversation.updatedAt === 'number' ? conversation.updatedAt : now,
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.filter(isChatMessage).slice(-maxMessagesPerConversation)
      : [],
    keyId: typeof conversation.keyId === 'string' ? conversation.keyId : '',
    modelId: typeof conversation.modelId === 'string' ? conversation.modelId : '',
  };
}

function normalizeHistory(value: unknown): ChatHistory {
  if (!value || typeof value !== 'object') return emptyChatHistory();
  const history = value as Partial<ChatHistory>;
  const conversations = Array.isArray(history.conversations)
    ? history.conversations
        .map(normalizeConversation)
        .filter((item): item is ChatConversation => item !== null)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, maxConversations)
    : [];
  const requestedActiveId =
    typeof history.activeConversationId === 'string' ? history.activeConversationId : null;
  return {
    activeConversationId: conversations.some((item) => item.id === requestedActiveId)
      ? requestedActiveId
      : conversations[0]?.id ?? null,
    conversations,
  };
}

export async function readChatHistory(userId: number): Promise<ChatHistory> {
  const value = await AsyncStorage.getItem(storageKey(userId));
  if (value) {
    try {
      return normalizeHistory(JSON.parse(value));
    } catch {
      return emptyChatHistory();
    }
  }

  const legacyValue = await AsyncStorage.getItem(legacyChatKey);
  if (!legacyValue) return emptyChatHistory();
  try {
    const messages = (JSON.parse(legacyValue) as unknown[]).filter(isChatMessage);
    if (!messages.length) return emptyChatHistory();
    const firstUserMessage = messages.find((message) => message.role === 'user');
    const conversation = createConversation({
      title: firstUserMessage ? conversationTitle(firstUserMessage.content) : '历史对话',
    });
    conversation.messages = messages.slice(-maxMessagesPerConversation);
    conversation.updatedAt = Date.now();
    const migrated = {
      activeConversationId: conversation.id,
      conversations: [conversation],
    };
    await writeChatHistory(userId, migrated);
    await AsyncStorage.removeItem(legacyChatKey);
    return migrated;
  } catch {
    return emptyChatHistory();
  }
}

export async function writeChatHistory(userId: number, history: ChatHistory): Promise<void> {
  const normalized = normalizeHistory(history);
  const previous = writeQueues.get(userId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized)));
  writeQueues.set(userId, next);
  try {
    await next;
  } finally {
    if (writeQueues.get(userId) === next) writeQueues.delete(userId);
  }
}

export async function clearChatHistory(userId: number): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
