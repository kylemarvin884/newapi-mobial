export interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  email: string;
  group: string;
  quota: number;
  used_quota: number;
  request_count: number;
}

export interface AuthResponse {
  access_token: string | null;
  token_type: 'bearer';
  requires_two_factor: boolean;
  challenge_token: string | null;
  user: UserProfile | null;
}

export interface MessageResponse {
  message: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  email: string;
  verification_code: string;
}

export interface Balance {
  currency_symbol: string;
  quota_per_unit: number;
  available: number;
  used: number;
  available_quota: number;
  used_quota: number;
  request_count: number;
  used_tokens: number;
}

export interface ApiKey {
  id: number;
  name: string;
  key_masked: string;
  status: number;
  created_time: number;
  accessed_time: number;
  expired_time: number;
  remain_quota: number;
  used_quota: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits: string;
  allow_ips: string;
  group: string;
}

export interface ApiKeyInput {
  name: string;
  expired_time: number;
  remain_quota: number;
  unlimited_quota: boolean;
  model_limits: string[];
  allow_ips: string[];
  group: string;
}

export interface ModelInfo {
    id: string;
    owned_by: string;
}

export interface UserGroup {
  id: string;
  description: string;
  ratio: string;
}

export interface ModelGroup extends UserGroup {
  models: string[];
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  kind?: 'text' | 'image';
  images?: GeneratedImage[];
  usage?: Usage | null;
  quota_used?: number;
  duration_ms?: number;
  model?: string;
  created_at?: number;
}

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface GeneratedImage {
  url: string;
  b64_json: string;
  revised_prompt: string;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  finish_reason: string | null;
  usage: Usage | null;
  quota_used: number;
  duration_ms: number;
}

export interface ImageGenerationResponse {
  created: number;
  model: string;
  images: GeneratedImage[];
  usage: Usage | null;
  quota_used: number;
  duration_ms: number;
}
