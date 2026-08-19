import Constants from 'expo-constants';

import type {
  ApiKey,
  ApiKeyInput,
  AuthResponse,
  Balance,
  ChatMessage,
  ChatResponse,
  ImageGenerationResponse,
  MessageResponse,
  ModelGroup,
  ModelInfo,
  RegisterInput,
  UserGroup,
  UserProfile,
} from '@/types/api';

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.apiBaseUrl ??
  ''
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & { token?: string | null };

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!apiBaseUrl || /example\.com/i.test(apiBaseUrl)) {
    throw new ApiError('App API 地址未配置，请设置 EXPO_PUBLIC_API_BASE_URL 后重新构建', 0);
  }
  const { token, headers, ...init } = options;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(payload.detail ?? '请求失败，请稍后重试', response.status);
  }
  return payload as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  sendRegistrationCode: (email: string) =>
    request<MessageResponse>('/auth/verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  register: (input: RegisterInput) =>
    request<MessageResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  verifyTwoFactor: (challengeToken: string, code: string) =>
    request<AuthResponse>('/auth/two-factor', {
      method: 'POST',
      body: JSON.stringify({ challenge_token: challengeToken, code }),
    }),
  logout: (token: string) =>
    request<void>('/auth/logout', { method: 'POST', token }),
  me: (token: string) => request<UserProfile>('/account/me', { token }),
  balance: (token: string) => request<Balance>('/account/balance', { token }),
  keys: (token: string) => request<ApiKey[]>('/keys', { token }),
  keyGroups: (token: string) => request<UserGroup[]>('/keys/groups', { token }),
  createKey: (token: string, input: ApiKeyInput) =>
    request<ApiKey>('/keys', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    }),
  toggleKey: (token: string, id: number) =>
    request<ApiKey>(`/keys/${id}/toggle`, { method: 'POST', token }),
  revealKey: (token: string, id: number) =>
    request<{ key: string }>(`/keys/${id}/reveal`, { method: 'POST', token }),
  deleteKey: (token: string, id: number) =>
    request<void>(`/keys/${id}`, { method: 'DELETE', token }),
  models: (token: string) => request<ModelInfo[]>('/chat/models', { token }),
  modelGroups: (token: string) => request<ModelGroup[]>('/chat/model-groups', { token }),
  chat: (
    token: string,
    input: {
      tokenId: number;
      model: string;
      messages: ChatMessage[];
    },
  ) =>
    request<ChatResponse>('/chat/completions', {
      method: 'POST',
      token,
      body: JSON.stringify({
        token_id: input.tokenId,
        model: input.model,
        messages: input.messages.map(({ role, content }) => ({ role, content })),
      }),
    }),
  generateImage: (
    token: string,
    input: {
      tokenId: number;
      model: string;
      prompt: string;
      size: string;
      quality: string;
    },
  ) =>
    request<ImageGenerationResponse>('/chat/images', {
      method: 'POST',
      token,
      body: JSON.stringify({
        token_id: input.tokenId,
        model: input.model,
        prompt: input.prompt,
        n: 1,
        size: input.size,
        quality: input.quality,
      }),
    }),
};
