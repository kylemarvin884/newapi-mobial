import {
  Bot,
  Check,
  ChevronDown,
  History,
  ImageIcon,
  KeyRound,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image as RNImage,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { api } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  conversationTitle,
  createConversation,
  emptyChatHistory,
  readChatHistory,
  writeChatHistory,
  type ChatConversation,
  type ChatHistory,
} from '@/storage/chat';
import type { ApiKey, Balance, ChatMessage, ModelGroup, Usage } from '@/types/api';

type ComposerMode = 'chat' | 'image';

interface SelectorItem {
  id: string;
  label: string;
  caption?: string;
}

interface SelectorModalProps {
  title: string;
  items: SelectorItem[];
  selectedId: string;
  visible: boolean;
  onClose(): void;
  onSelect(id: string): void;
}

interface ModelSection {
  id: string;
  title: string;
  caption: string;
  data: string[];
}

function SelectorModal({
  title,
  items,
  selectedId,
  visible,
  onClose,
  onSelect,
}: SelectorModalProps) {
  const { t } = useLanguage();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable style={styles.selectorSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityLabel={t('close')} hitSlop={10} onPress={onClose}>
              <X color={colors.text} size={22} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
                style={styles.selectorRow}>
                <View style={styles.selectorText}>
                  <Text numberOfLines={1} style={styles.selectorLabel}>{item.label}</Text>
                  {item.caption ? <Text style={styles.selectorCaption}>{item.caption}</Text> : null}
                </View>
                {selectedId === item.id ? <Check color={colors.primary} size={20} /> : null}
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModelSelectorModal({
  sections,
  selectedModel,
  visible,
  onClose,
  onSelect,
}: {
  sections: ModelSection[];
  selectedModel: string;
  visible: boolean;
  onClose(): void;
  onSelect(model: string): void;
}) {
  const { t } = useLanguage();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable style={styles.selectorSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('selectGroupedModel')}</Text>
            <Pressable accessibilityLabel={t('close')} hitSlop={10} onPress={onClose}>
              <X color={colors.text} size={22} />
            </Pressable>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCaption}>{section.caption}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={styles.selectorRow}>
                <Text numberOfLines={1} style={[styles.selectorLabel, styles.modelLabel]}>{item}</Text>
                {selectedModel === item ? <Check color={colors.primary} size={20} /> : null}
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ConversationModal({
  activeId,
  conversations,
  visible,
  onClose,
  onCreate,
  onDelete,
  onSelect,
}: {
  activeId: string | null;
  conversations: ChatConversation[];
  visible: boolean;
  onClose(): void;
  onCreate(): void;
  onDelete(id: string): void;
  onSelect(id: string): void;
}) {
  const { language, t } = useLanguage();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable style={styles.historySheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>{t('history')}</Text>
              <Text style={styles.historyCount}>{conversations.length} {t('conversations')}</Text>
            </View>
            <View style={styles.sheetActions}>
              <Pressable accessibilityLabel={t('newChat')} onPress={onCreate} style={styles.smallActionButton}>
                <MessageSquarePlus color={colors.primary} size={20} />
              </Pressable>
              <Pressable accessibilityLabel={t('close')} onPress={onClose} style={styles.smallActionButton}>
                <X color={colors.text} size={20} />
              </Pressable>
            </View>
          </View>
          <FlatList
            contentContainerStyle={styles.historyList}
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const preview = [...item.messages].reverse().find((message) => message.content)?.content;
              return (
                <View style={[styles.historyRow, activeId === item.id && styles.historyRowActive]}>
                  <Pressable
                    onPress={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    style={styles.historyMain}>
                    <Text numberOfLines={1} style={styles.historyTitle}>{item.title}</Text>
                    <Text numberOfLines={1} style={styles.historyPreview}>{preview || t('emptyChat')}</Text>
                    <Text style={styles.historyDate}>{new Date(item.updatedAt).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')}</Text>
                  </Pressable>
                  <Pressable accessibilityLabel={t('deleteChat')} onPress={() => onDelete(item.id)} style={styles.historyDelete}>
                    <Trash2 color={colors.danger} size={18} />
                  </Pressable>
                </View>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function newMessage(
  role: ChatMessage['role'],
  content: string,
  details: Partial<Omit<ChatMessage, 'id' | 'role' | 'content'>> = {},
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    created_at: Date.now(),
    ...details,
  };
}

function isImageModel(model: string): boolean {
  return /(image|dall[-_. ]?e|flux|midjourney|stable[-_. ]?diffusion|sdxl|ideogram|recraft)/i.test(model);
}

function totalTokens(usage?: Usage | null): number {
  if (!usage) return 0;
  return usage.total_tokens ??
    (usage.input_tokens ?? usage.prompt_tokens ?? 0) +
    (usage.output_tokens ?? usage.completion_tokens ?? 0);
}

function modelsForKey(groups: ModelGroup[], key?: ApiKey): string[] {
  const exactGroup = key?.group ? groups.find((group) => group.id === key.group) : undefined;
  const source = exactGroup ? exactGroup.models : groups.flatMap((group) => group.models);
  return [...new Set(source)];
}

function ensureActiveConfiguration(
  history: ChatHistory,
  keys: ApiKey[],
  modelGroups: ModelGroup[],
): ChatHistory {
  const active = history.conversations.find((conversation) => conversation.id === history.activeConversationId);
  if (!active) return history;
  const selectedKey = keys.find((key) => String(key.id) === active.keyId) ?? keys[0];
  const keyId = selectedKey ? String(selectedKey.id) : '';
  const models = modelsForKey(modelGroups, selectedKey);
  const modelId = models.includes(active.modelId) ? active.modelId : models[0] ?? '';
  if (active.keyId === keyId && active.modelId === modelId) return history;
  return {
    ...history,
    conversations: history.conversations.map((conversation) =>
      conversation.id === active.id ? { ...conversation, keyId, modelId } : conversation,
    ),
  };
}

export default function ChatScreen() {
  const { token, user } = useAuth();
  const { language, t } = useLanguage();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const keysRef = useRef<ApiKey[]>([]);
  const modelGroupsRef = useRef<ModelGroup[]>([]);
  const [history, setHistory] = useState<ChatHistory>(() => emptyChatHistory());
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [input, setInput] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>('chat');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState<'standard' | 'hd'>('standard');
  const [sendingConversationId, setSendingConversationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selector, setSelector] = useState<'key' | 'model' | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  const activeConversation = history.conversations.find(
    (conversation) => conversation.id === history.activeConversationId,
  );
  const messages = activeConversation?.messages ?? [];
  const selectedKeyId = activeConversation?.keyId ?? '';
  const selectedModel = activeConversation?.modelId ?? '';
  const selectedKey = keys.find((key) => String(key.id) === selectedKeyId);
  const historyReady = !!user?.id && loadedUserId === user.id;

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => { active = false; };
    void readChatHistory(user.id).then((stored) => {
      if (!active) return;
      let nextHistory: ChatHistory;
      if (stored.conversations.length) {
        nextHistory = stored;
      } else {
        const conversation = createConversation();
        nextHistory = { activeConversationId: conversation.id, conversations: [conversation] };
      }
      setHistory(ensureActiveConfiguration(nextHistory, keysRef.current, modelGroupsRef.current));
      setLoadedUserId(user.id);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!historyReady || !user?.id) return;
    void writeChatHistory(user.id, history);
  }, [history, historyReady, user?.id]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void Promise.all([api.keys(token), api.modelGroups(token), api.balance(token)])
      .then(([keyList, groupList, accountBalance]) => {
        if (!active) return;
        const activeKeys = keyList.filter((key) => key.status === 1);
        keysRef.current = activeKeys;
        modelGroupsRef.current = groupList;
        setKeys(activeKeys);
        setModelGroups(groupList);
        setBalance(accountBalance);
        setHistory((current) => ensureActiveConfiguration(current, activeKeys, groupList));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : t('loadChatFailed'));
      });
    return () => {
      active = false;
    };
  }, [t, token]);

  const keyItems = keys.map((key) => ({
    id: String(key.id),
    label: key.name,
    caption: `${key.group || 'default'} · ${key.key_masked || t('hidden')}`,
  }));

  const exactModelGroup = selectedKey?.group
    ? modelGroups.find((group) => group.id === selectedKey.group && group.models.length)
    : undefined;
  const visibleModelGroups = exactModelGroup
    ? [exactModelGroup]
    : modelGroups.filter((group) => group.models.length);
  const allModelSections: ModelSection[] = visibleModelGroups.map((group) => ({
    id: group.id,
    title: group.description || group.id,
    caption: `${group.id}${group.ratio ? ` · ${language === 'en' ? 'ratio' : '倍率'} ${group.ratio}` : ''}`,
    data: group.models,
  }));
  const imageModelSections = allModelSections
    .map((section) => ({ ...section, data: section.data.filter(isImageModel) }))
    .filter((section) => section.data.length);
  const modelSections = composerMode === 'image' && imageModelSections.length
    ? imageModelSections
    : allModelSections;

  const updateConversation = (
    conversationId: string,
    updater: (conversation: ChatConversation) => ChatConversation,
    moveToTop = false,
  ) => {
    setHistory((current) => {
      const original = current.conversations.find((conversation) => conversation.id === conversationId);
      if (!original) return current;
      const updated = updater(original);
      const others = current.conversations.filter((conversation) => conversation.id !== conversationId);
      return {
        ...current,
        conversations: moveToTop
          ? [updated, ...others]
          : current.conversations.map((conversation) => conversation.id === conversationId ? updated : conversation),
      };
    });
  };

  const selectKey = (keyId: string) => {
    if (!activeConversation) return;
    const key = keys.find((item) => String(item.id) === keyId);
    const availableModels = modelsForKey(modelGroups, key);
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      keyId,
      modelId: availableModels.includes(conversation.modelId)
        ? conversation.modelId
        : availableModels[0] ?? '',
    }));
  };

  const selectModel = (modelId: string) => {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({ ...conversation, modelId }));
  };

  const selectComposerMode = (mode: ComposerMode) => {
    setComposerMode(mode);
    if (mode !== 'image' || isImageModel(selectedModel)) return;
    const firstImageModel = imageModelSections[0]?.data[0];
    if (firstImageModel) selectModel(firstImageModel);
  };

  const createNewConversation = () => {
    const key = keys[0];
    const conversation = createConversation({
      keyId: key ? String(key.id) : '',
      modelId: modelsForKey(modelGroups, key)[0] ?? '',
    });
    setHistory((current) => ({
      activeConversationId: conversation.id,
      conversations: [conversation, ...current.conversations].slice(0, 40),
    }));
    setInput('');
    setError('');
    setHistoryVisible(false);
  };

  const deleteConversation = (conversationId: string) => {
    const conversation = history.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    Alert.alert(t('deleteChat'), t('deleteChatConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          setHistory((current) => {
            const remaining = current.conversations.filter((item) => item.id !== conversationId);
            if (!remaining.length) {
              const next = createConversation({
                keyId: keys[0] ? String(keys[0].id) : '',
                modelId: modelsForKey(modelGroups, keys[0])[0] ?? '',
              });
              return { activeConversationId: next.id, conversations: [next] };
            }
            return {
              activeConversationId:
                current.activeConversationId === conversationId
                  ? remaining[0].id
                  : current.activeConversationId,
              conversations: remaining,
            };
          });
        },
      },
    ]);
  };

  const send = async () => {
    const content = input.trim();
    if (
      !token ||
      !activeConversation ||
      !content ||
      !selectedKeyId ||
      !selectedModel ||
      sendingConversationId
    ) return;
    const conversationId = activeConversation.id;
    const userMessage = newMessage('user', content, {
      kind: composerMode === 'image' ? 'image' : 'text',
    });
    const nextMessages = [...messages, userMessage].slice(-80);
    updateConversation(
      conversationId,
      (conversation) => ({
        ...conversation,
        title: conversation.messages.length ? conversation.title : conversationTitle(content),
        messages: nextMessages,
        updatedAt: Date.now(),
      }),
      true,
    );
    setInput('');
    setSendingConversationId(conversationId);
    setError('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    try {
      let assistantMessage: ChatMessage;
      if (composerMode === 'image') {
        const response = await api.generateImage(token, {
            tokenId: Number(selectedKeyId),
            model: selectedModel,
            prompt: content,
            size: imageSize,
            quality: imageQuality,
          });
        assistantMessage = newMessage('assistant', response.images[0]?.revised_prompt || content, {
          kind: 'image',
          images: response.images,
          usage: response.usage,
          quota_used: response.quota_used,
          duration_ms: response.duration_ms,
          model: response.model,
        });
      } else {
        const response = await api.chat(token, {
            tokenId: Number(selectedKeyId),
            model: selectedModel,
            messages: nextMessages.filter((message) => message.kind !== 'image'),
          });
        assistantMessage = newMessage('assistant', response.content, {
          kind: 'text',
          usage: response.usage,
          quota_used: response.quota_used,
          duration_ms: response.duration_ms,
          model: response.model,
        });
      }
      updateConversation(
        conversationId,
        (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, assistantMessage].slice(-80),
          updatedAt: Date.now(),
        }),
        true,
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : composerMode === 'image' ? t('generationFailed') : t('sendFailed'));
    } finally {
      setSendingConversationId(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={66}
        style={styles.container}>
        <View style={styles.chatHeader}>
          <View style={styles.chatIdentity}>
            <Text style={styles.chatEyebrow}>Kyle AI</Text>
            <Text numberOfLines={1} style={styles.chatTitle}>{activeConversation?.title || t('newChat')}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel={t('history')} onPress={() => setHistoryVisible(true)} style={styles.iconButton}>
              <History color={colors.textMuted} size={19} />
            </Pressable>
            <Pressable accessibilityLabel={t('newChat')} onPress={createNewConversation} style={styles.iconButton}>
              <MessageSquarePlus color={colors.primary} size={19} />
            </Pressable>
            <Pressable
              accessibilityLabel={t('deleteChat')}
              disabled={!activeConversation}
              onPress={() => activeConversation && deleteConversation(activeConversation.id)}
              style={styles.iconButton}>
              <Trash2 color={activeConversation ? colors.danger : colors.disabled} size={19} />
            </Pressable>
          </View>
        </View>

        <View style={styles.modeSwitch}>
          {(['chat', 'image'] as ComposerMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => selectComposerMode(mode)}
              style={[styles.modeButton, composerMode === mode && styles.modeButtonActive]}>
              {mode === 'chat'
                ? <Bot color={composerMode === mode ? colors.primary : colors.textMuted} size={17} />
                : <ImageIcon color={composerMode === mode ? colors.primary : colors.textMuted} size={17} />}
              <Text style={[styles.modeText, composerMode === mode && styles.modeTextActive]}>
                {mode === 'chat' ? t('chatMode') : t('imageMode')}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.configBar}>
          <Pressable onPress={() => setSelector('model')} style={styles.configControl}>
            <Sparkles color={colors.primary} size={17} />
            <Text numberOfLines={1} style={styles.configText}>{selectedModel || t('selectModel')}</Text>
            <ChevronDown color={colors.textMuted} size={16} />
          </Pressable>
          <Pressable onPress={() => setSelector('key')} style={styles.configControl}>
            <KeyRound color={colors.accent} size={17} />
            <Text numberOfLines={1} style={styles.configText}>{selectedKey?.name || t('selectKey')}</Text>
            <ChevronDown color={colors.textMuted} size={16} />
          </Pressable>
        </View>

        {composerMode === 'image' ? (
          <View style={styles.imageOptions}>
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{t('imageSize')}</Text>
              {['1024x1024', '1536x1024', '1024x1536'].map((size) => (
                <Pressable key={size} onPress={() => setImageSize(size)} style={[styles.optionChip, imageSize === size && styles.optionChipActive]}>
                  <Text style={[styles.optionChipText, imageSize === size && styles.optionChipTextActive]}>{size}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{t('imageQuality')}</Text>
              {(['standard', 'hd'] as const).map((quality) => (
                <Pressable key={quality} onPress={() => setImageQuality(quality)} style={[styles.optionChip, imageQuality === quality && styles.optionChipActive]}>
                  <Text style={[styles.optionChipText, imageQuality === quality && styles.optionChipTextActive]}>
                    {quality === 'standard' ? t('standard') : t('high')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!imageModelSections.length ? <Text style={styles.imageWarning}>{t('noImageModel')}</Text> : null}
          </View>
        ) : null}

        {error ? <Text style={styles.chatError}>{error}</Text> : null}
        <FlatList
          ref={listRef}
          contentContainerStyle={messages.length ? styles.messageList : styles.emptyList}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState description={t('startChat')} icon={composerMode === 'image' ? ImageIcon : Bot} title={t('newChat')} />
          }
          ListFooterComponent={
            sendingConversationId === activeConversation?.id ? (
              <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : null
          }
          onContentSizeChange={() => messages.length && listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const tokenCount = totalTokens(item.usage);
            const quotaAmount = balance && item.quota_used
              ? item.quota_used / balance.quota_per_unit
              : 0;
            return (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                {item.role === 'assistant' && item.kind === 'image' ? (
                  <View style={styles.generatedImages}>
                    {item.images?.map((image, index) => {
                      const uri = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : '');
                      return uri ? <RNImage key={`${item.id}-${index}`} resizeMode="cover" source={{ uri }} style={styles.generatedImage} /> : null;
                    })}
                    {item.content ? <Text style={styles.imageCaption}>{item.content}</Text> : null}
                  </View>
                ) : item.role === 'assistant' ? (
                  <Markdown style={markdownStyles}>{item.content}</Markdown>
                ) : (
                  <Text style={styles.userMessage}>{item.content}</Text>
                )}
                {item.role === 'assistant' && item.model ? (
                  <View style={styles.messageMeta}>
                    <Text numberOfLines={1} style={styles.metaText}>{t('model')}: {item.model}</Text>
                    <Text style={styles.metaText}>{t('tokens')}: {tokenCount.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')}</Text>
                    <Text style={styles.metaText}>
                      {t('quota')}: {balance?.currency_symbol ?? '¥'}{quotaAmount.toFixed(4)}
                    </Text>
                    <Text style={styles.metaText}>{t('duration')}: {item.duration_ms ?? 0} {t('milliseconds')}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            blurOnSubmit={false}
            maxLength={20_000}
            multiline
            onChangeText={setInput}
            placeholder={composerMode === 'image' ? t('inputPrompt') : t('inputMessage')}
            placeholderTextColor={colors.disabled}
            style={styles.composerInput}
            value={input}
          />
          <Pressable
            accessibilityLabel={composerMode === 'image' ? t('generate') : t('send')}
            disabled={!input.trim() || !selectedKeyId || !selectedModel || !!sendingConversationId}
            onPress={send}
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || !selectedKeyId || !selectedModel || !!sendingConversationId) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}>
            <Send color="#FFFFFF" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <SelectorModal
        items={keyItems}
        onClose={() => setSelector(null)}
        onSelect={selectKey}
        selectedId={selectedKeyId}
        title={t('selectKey')}
        visible={selector === 'key'}
      />
      <ModelSelectorModal
        onClose={() => setSelector(null)}
        onSelect={selectModel}
        sections={modelSections}
        selectedModel={selectedModel}
        visible={selector === 'model'}
      />
      <ConversationModal
        activeId={history.activeConversationId}
        conversations={history.conversations}
        onClose={() => setHistoryVisible(false)}
        onCreate={createNewConversation}
        onDelete={deleteConversation}
        onSelect={(id) => {
          setHistory((current) => ensureActiveConfiguration(
            { ...current, activeConversationId: id },
            keys,
            modelGroups,
          ));
          setError('');
        }}
        visible={historyVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIdentity: { flex: 1, minWidth: 0, paddingRight: 8 },
  chatEyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  chatTitle: { color: colors.text, fontSize: 23, fontWeight: '800', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  modeSwitch: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 3,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
  },
  modeButton: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.small,
  },
  modeButtonActive: { backgroundColor: colors.surface },
  modeText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  modeTextActive: { color: colors.primary },
  configBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  configControl: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  configText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  imageOptions: { paddingHorizontal: 16, paddingBottom: 8, gap: 7 },
  optionGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionLabel: { width: 42, color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  optionChip: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    backgroundColor: colors.surface,
  },
  optionChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  optionChipTextActive: { color: colors.primary },
  imageWarning: { color: colors.warning, fontSize: 11, lineHeight: 16 },
  chatError: { color: colors.danger, paddingHorizontal: 16, paddingVertical: 6 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  emptyList: { flexGrow: 1 },
  bubble: { maxWidth: '88%', borderRadius: radius.medium, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingBubble: { minWidth: 54, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  userMessage: { color: '#FFFFFF', fontSize: 16, lineHeight: 23 },
  generatedImages: { gap: 8 },
  generatedImage: { width: 256, maxWidth: '100%', aspectRatio: 1, borderRadius: radius.small, backgroundColor: colors.surfaceMuted },
  imageCaption: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  messageMeta: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  metaText: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 132,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: { backgroundColor: colors.disabled },
  sendPressed: { opacity: 0.82 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,32,27,0.38)' },
  selectorSheet: {
    maxHeight: '76%',
    minHeight: 280,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    paddingBottom: 28,
  },
  historySheet: {
    maxHeight: '78%',
    minHeight: 340,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    paddingBottom: 24,
  },
  sheetHeader: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sheetActions: { flexDirection: 'row', gap: 6 },
  smallActionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
  },
  selectorRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectorText: { flex: 1, paddingRight: 12 },
  selectorLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  selectorCaption: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  modelLabel: { flex: 1, paddingRight: 12 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  sectionCaption: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  historyCount: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  historyList: { padding: 12, gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.background,
  },
  historyRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  historyMain: { flex: 1, minWidth: 0, padding: 12 },
  historyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  historyPreview: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  historyDate: { color: colors.disabled, fontSize: 10, marginTop: 5 },
  historyDelete: { width: 46, height: 50, alignItems: 'center', justifyContent: 'center' },
});

const markdownStyles = {
  body: { color: colors.text, fontSize: 16, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  code_inline: { backgroundColor: colors.surfaceMuted, color: colors.text, paddingHorizontal: 4 },
  code_block: { backgroundColor: colors.surfaceMuted, color: colors.text, padding: 10 },
  fence: { backgroundColor: colors.surfaceMuted, color: colors.text, padding: 10 },
  link: { color: colors.primary },
};
