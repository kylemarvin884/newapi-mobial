import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'zh' | 'en';

const storageKey = 'kyle-ai-language';

const zh = {
  login: '登录', register: '注册', username: '用户名', email: '邮箱', password: '密码',
  confirmPassword: '确认密码', emailCode: '邮箱验证码', sendCode: '发送验证码', sending: '发送中',
  loginSubtitle: '登录你的 AI 账户', registerSubtitle: '注册新的 AI 账户', twoFactorSubtitle: '完成两步验证',
  twoFactorCode: '两步验证码或备用码', verifyLogin: '验证并登录', registerLogin: '注册并登录',
  passwordHint: '密码（至少 8 位）', passwordMismatch: '两次输入的密码不一致',
  codeSent: '验证码已发送，请检查邮箱', codeFailed: '验证码发送失败', loginFailed: '登录失败', registerFailed: '注册失败',
  chat: '聊天', balance: '余额', keys: '密钥', profile: '我的',
  newChat: '新对话', history: '历史对话', conversations: '个对话', emptyChat: '空白对话',
  selectGroupedModel: '按分组选择模型', selectModel: '选择模型', selectKey: '选择密钥', hidden: '已隐藏',
  loadChatFailed: '加载聊天配置失败', startChat: '选择模型和密钥后开始对话', inputMessage: '输入消息',
  inputPrompt: '描述你想生成的图片', send: '发送', generate: '生成', deleteChat: '删除对话',
  deleteChatConfirm: '确定删除这个对话吗？', cancel: '取消', delete: '删除', sendFailed: '发送失败', close: '关闭',
  chatMode: '对话', imageMode: '生图', imageSize: '尺寸', imageQuality: '质量', standard: '标准', high: '高清',
  noImageModel: '当前分组未识别到生图模型，可手动尝试其他模型。', generationFailed: '图片生成失败',
  quota: '额度', tokens: 'Token', duration: '耗时', model: '模型', milliseconds: '毫秒',
  accountOverview: '账户概览', availableBalance: '可用余额', totalUsed: '累计消耗', requests: '请求次数',
  totalTokens: '累计 Token', balanceFailed: '获取余额失败',
  unbound: '未绑定', group: '分组', version: '版本', latest: '最新', language: '语言', chinese: '中文', english: 'English',
  shareTitle: '把 Kyle AI 分享给朋友', shareDescription: '多模型聊天、生图、余额查询和密钥管理，一个 App 全部搞定。',
  shareHint: '点击分享后可选择微信、QQ 等应用', shareApp: '分享 Kyle AI', checkUpdate: '检查更新',
  refreshAccount: '刷新账户', logout: '退出登录', downloadVersion: '下载新版本',
  widgetHint: '桌面小组件会显示最近同步的余额和累计 Token。',
  credentials: '访问凭证', createKey: '创建 API Key', noKey: '还没有 API Key', noKeyHint: '创建一个密钥后即可开始聊天',
  operationFailed: '操作失败', tryAgain: '请稍后重试', revealFailed: '无法显示密钥', copied: '已复制', copiedHint: 'API Key 已复制到剪贴板',
  deleteKey: '删除 API Key', deleteKeyConfirm: '确定删除这个 API Key 吗？', deleteFailed: '删除失败', createFailed: '创建失败', keysFailed: '获取密钥失败',
  unlimited: '不限额度', fixedQuota: '固定额度', remaining: '剩余', neverExpires: '永不过期', hideKey: '隐藏密钥', revealKey: '显示密钥', copyKey: '复制密钥',
  name: '名称', nameExample: '例如：手机聊天', chooseGroup: '选择分组', ratio: '倍率', validity: '有效期', forever: '永久', days: '天', quotaAmount: '额度（元）', chooseKeyGroup: '选择密钥分组',
} as const;

const en: Record<keyof typeof zh, string> = {
  login: 'Sign in', register: 'Register', username: 'Username', email: 'Email', password: 'Password',
  confirmPassword: 'Confirm password', emailCode: 'Email verification code', sendCode: 'Send code', sending: 'Sending',
  loginSubtitle: 'Sign in to your AI account', registerSubtitle: 'Create a new AI account', twoFactorSubtitle: 'Complete two-factor verification',
  twoFactorCode: '2FA code or backup code', verifyLogin: 'Verify and sign in', registerLogin: 'Register and sign in',
  passwordHint: 'Password (at least 8 characters)', passwordMismatch: 'Passwords do not match',
  codeSent: 'Verification code sent. Check your inbox.', codeFailed: 'Failed to send verification code', loginFailed: 'Sign in failed', registerFailed: 'Registration failed',
  chat: 'Chat', balance: 'Balance', keys: 'API Keys', profile: 'Profile',
  newChat: 'New chat', history: 'Chat history', conversations: 'chats', emptyChat: 'Empty chat',
  selectGroupedModel: 'Choose model by group', selectModel: 'Choose model', selectKey: 'Choose key', hidden: 'Hidden',
  loadChatFailed: 'Failed to load chat settings', startChat: 'Choose a model and API key to begin', inputMessage: 'Type a message',
  inputPrompt: 'Describe the image you want to create', send: 'Send', generate: 'Generate', deleteChat: 'Delete chat',
  deleteChatConfirm: 'Delete this chat?', cancel: 'Cancel', delete: 'Delete', sendFailed: 'Failed to send', close: 'Close',
  chatMode: 'Chat', imageMode: 'Image', imageSize: 'Size', imageQuality: 'Quality', standard: 'Standard', high: 'High',
  noImageModel: 'No image model was recognized in this group. You can still try another model.', generationFailed: 'Image generation failed',
  quota: 'Cost', tokens: 'Tokens', duration: 'Time', model: 'Model', milliseconds: 'ms',
  accountOverview: 'Account overview', availableBalance: 'Available balance', totalUsed: 'Total spent', requests: 'Requests',
  totalTokens: 'Total tokens', balanceFailed: 'Failed to load balance',
  unbound: 'Not linked', group: 'Group', version: 'Version', latest: 'Latest', language: 'Language', chinese: '中文', english: 'English',
  shareTitle: 'Share Kyle AI with friends', shareDescription: 'Chat, image generation, balance, and API key management in one app.',
  shareHint: 'Share through any app installed on your phone', shareApp: 'Share Kyle AI', checkUpdate: 'Check for updates',
  refreshAccount: 'Refresh account', logout: 'Sign out', downloadVersion: 'Download version',
  widgetHint: 'The home screen widget shows the most recently synced balance and total tokens.',
  credentials: 'Access credentials', createKey: 'Create API Key', noKey: 'No API keys yet', noKeyHint: 'Create a key to start chatting',
  operationFailed: 'Operation failed', tryAgain: 'Please try again later', revealFailed: 'Unable to reveal key', copied: 'Copied', copiedHint: 'API Key copied to clipboard',
  deleteKey: 'Delete API Key', deleteKeyConfirm: 'Delete this API key?', deleteFailed: 'Delete failed', createFailed: 'Creation failed', keysFailed: 'Failed to load API keys',
  unlimited: 'Unlimited', fixedQuota: 'Fixed quota', remaining: 'Remaining', neverExpires: 'Never expires', hideKey: 'Hide key', revealKey: 'Reveal key', copyKey: 'Copy key',
  name: 'Name', nameExample: 'Example: Mobile chat', chooseGroup: 'Choose group', ratio: 'Ratio', validity: 'Validity', forever: 'Forever', days: 'days', quotaAmount: 'Quota amount', chooseKeyGroup: 'Choose key group',
};

export type TranslationKey = keyof typeof zh;

interface LanguageContextValue {
  language: Language;
  setLanguage(language: Language): void;
  t(key: TranslationKey): string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    void AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored === 'zh' || stored === 'en') setLanguageState(stored);
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage(nextLanguage) {
      setLanguageState(nextLanguage);
      void AsyncStorage.setItem(storageKey, nextLanguage);
    },
    t: (key) => (language === 'en' ? en[key] : zh[key]),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
