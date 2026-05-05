export type ProviderCredentialId = 'gemini' | 'deepseek' | 'massive' | 'alpha_vantage' | 'logo_dev';

export type ProviderPreference = 'hosted' | 'user';

export type StorageType = 'encrypted-server' | 'local-only';

export interface ProviderStatus {
  providerId: ProviderCredentialId;
  label: string;
  description: string;
  hasHostedDefault: boolean;
  userKeyConfigured: boolean;
  apiKeyLast4: string | null;
  lastUpdated: number | null;
  storageType: StorageType;
  preference: ProviderPreference;
  signUpUrl: string | null;
}

export interface LocalCredentialEntry {
  key: string;
  last4: string;
  updatedAt: number;
}

export const PROVIDER_DEFS: Record<ProviderCredentialId, {
  label: string;
  description: string;
  storageType: StorageType;
  signUpUrl: string | null;
}> = {
  gemini: { label: 'Google Gemini', description: 'AI assistant, portfolio Q&A, and screenshot OCR', storageType: 'encrypted-server', signUpUrl: 'https://aistudio.google.com/apikey' },
  deepseek: { label: 'DeepSeek', description: 'Alternative AI provider for chat and reasoning', storageType: 'encrypted-server', signUpUrl: 'https://platform.deepseek.com/api_keys' },
  massive: { label: 'Massive', description: 'U.S. stock close-price data', storageType: 'local-only', signUpUrl: 'https://massive.com' },
  alpha_vantage: { label: 'Alpha Vantage', description: 'Stock/ETF price data and forex rates', storageType: 'local-only', signUpUrl: 'https://www.alphavantage.co/support/#api-key' },
  logo_dev: { label: 'Logo.dev', description: 'Company and ticker logos', storageType: 'local-only', signUpUrl: 'https://logo.dev' },
};

export const ALL_PROVIDER_IDS: ProviderCredentialId[] = ['gemini', 'deepseek', 'massive', 'alpha_vantage', 'logo_dev'];
