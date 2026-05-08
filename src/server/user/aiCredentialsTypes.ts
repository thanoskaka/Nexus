export type AiProvider = 'gemini' | 'deepseek' | 'openai' | 'anthropic';

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
  provider: AiProvider | null;
  model: string | null;
  apiKeyLast4: string | null;
  source: 'user' | 'server-default' | 'none';
  defaultUsageCap: string | null;
};

export type AiCredentialsPutRequest = {
  provider: AiProvider;
  model?: string;
  apiKey: string;
};

export type AiTestResult = {
  success: boolean;
  provider?: AiProvider;
  model?: string;
  message?: string;
  error?: string;
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
  openai: [
    { label: 'GPT-4o mini (fast, cost-effective)', value: 'gpt-4o-mini' },
    { label: 'GPT-4o (best accuracy)', value: 'gpt-4o' },
  ],
  anthropic: [
    { label: 'Claude 3.5 Haiku (fast, cost-effective)', value: 'claude-3-5-haiku-latest' },
    { label: 'Claude 3.5 Sonnet (best accuracy)', value: 'claude-3-5-sonnet-latest' },
  ],
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

export const AI_PROVIDER_DEFAULT_MODEL: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
};

export const AI_CREDENTIALS_COLLECTION = 'user_ai_credentials';

export function isAiProvider(value: string): value is AiProvider {
  return value === 'gemini' || value === 'deepseek' || value === 'openai' || value === 'anthropic';
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

  if (provider === 'openai') {
    if (trimmed.length < 10) return 'OpenAI API key seems too short.';
    if (!/^sk-[A-Za-z0-9_-]+$/.test(trimmed) && !/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
      return 'OpenAI API key contains invalid characters.';
    }
    return null;
  }

  if (provider === 'anthropic') {
    if (trimmed.length < 10) return 'Anthropic API key seems too short.';
    if (!/^sk-ant-[A-Za-z0-9_-]+$/.test(trimmed) && !/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
      return 'Anthropic API key contains invalid characters.';
    }
    return null;
  }

  return 'Unknown provider.';
}

export function isVisionCapable(provider: AiProvider, model: string): boolean {
  if (provider === 'gemini') return true;
  if (provider === 'deepseek') return model === 'deepseek-chat';
  if (provider === 'openai') return true;
  if (provider === 'anthropic') return true;
  return false;
}

export function getDefaultUsageCap(): string | null {
  const cap = process.env.NEXUS_AI_DEFAULT_MONTHLY_CAP?.trim();
  return cap || null;
}

export function getServerDefaultProvider(): AiProvider {
  const raw = process.env.NEXUS_AI_PROVIDER?.trim().toLowerCase() || 'gemini';
  if (isAiProvider(raw)) return raw;
  return 'gemini';
}

export function getServerDefaultModel(): string {
  return (process.env.NEXUS_AI_MODEL || AI_PROVIDER_DEFAULT_MODEL[getServerDefaultProvider()]).trim();
}

export function getServerDefaultApiKey(): string | null {
  const provider = getServerDefaultProvider();
  if (provider === 'gemini') return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim() || null;
  if (provider === 'deepseek') return (process.env.DEEPSEEK_API_KEY || '').trim() || null;
  if (provider === 'openai') return (process.env.OPENAI_API_KEY || '').trim() || null;
  if (provider === 'anthropic') return (process.env.ANTHROPIC_API_KEY || '').trim() || null;
  return null;
}
