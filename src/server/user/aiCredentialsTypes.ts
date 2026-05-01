export type AiProvider = 'gemini' | 'deepseek';

export type AiCredentials = {
  uid: string;
  provider: AiProvider;
  model: string;
  apiKeyEncrypted: {
    alg: 'aes-256-gcm';
    iv: string;
    tag: string;
    ciphertext: string;
  };
  apiKeyLast4: string;
  createdAt: number;
  updatedAt: number;
};

export type AiCredentialsResponse = {
  provider: AiProvider;
  model: string;
  apiKeyLast4: string;
};

export type AiCredentialsPutRequest = {
  provider: AiProvider;
  model?: string;
  apiKey: string;
};

export const AI_PROVIDER_MODELS: Record<AiProvider, { label: string; value: string }[]> = {
  gemini: [
    { label: 'Gemini 2.5 Flash (fast, good accuracy)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro (best accuracy)', value: 'gemini-2.5-pro' },
    { label: 'Gemini 2.5 Flash Lite (fastest, text-only)', value: 'gemini-2.5-flash-lite' },
  ],
  deepseek: [
    { label: 'DeepSeek Chat (V3, general purpose)', value: 'deepseek-chat' },
    { label: 'DeepSeek Reasoner (R1, reasoning)', value: 'deepseek-reasoner' },
  ],
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
};

export const AI_PROVIDER_DEFAULT_MODEL: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  deepseek: 'deepseek-chat',
};

export const AI_CREDENTIALS_COLLECTION = 'user_ai_credentials';

export function isAiProvider(value: string): value is AiProvider {
  return value === 'gemini' || value === 'deepseek';
}

export function validateApiKey(provider: AiProvider, apiKey: string): string | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return 'API key is required.';

  if (provider === 'gemini') {
    if (trimmed.length < 10) return 'Gemini API key seems too short.';
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return 'Gemini API key contains invalid characters.';
    return null;
  }

  if (provider === 'deepseek') {
    if (trimmed.length < 10) return 'DeepSeek API key seems too short.';
    if (!/^(sk-)?[A-Za-z0-9_-]+$/.test(trimmed)) return 'DeepSeek API key contains invalid characters.';
    return null;
  }

  return 'Unknown provider.';
}
