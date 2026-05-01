import { describe, it, expect } from 'vitest';
import { isAiProvider, validateApiKey, AI_PROVIDER_DEFAULT_MODEL } from './aiCredentialsTypes.js';

describe('isAiProvider', () => {
  it('returns true for gemini', () => {
    expect(isAiProvider('gemini')).toBe(true);
  });

  it('returns true for deepseek', () => {
    expect(isAiProvider('deepseek')).toBe(true);
  });

  it('returns false for unknown provider', () => {
    expect(isAiProvider('openai')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAiProvider('')).toBe(false);
  });
});

describe('validateApiKey', () => {
  describe('gemini', () => {
    it('returns null for a valid key', () => {
      expect(validateApiKey('gemini', 'AIzaSyABC123DEF456GHI789JKL012MNO345PQR678')).toBeNull();
    });

    it('returns error for empty key', () => {
      expect(validateApiKey('gemini', '')).toBe('API key is required.');
    });

    it('returns error for whitespace-only key', () => {
      expect(validateApiKey('gemini', '   ')).toBe('API key is required.');
    });

    it('returns error for too-short key', () => {
      expect(validateApiKey('gemini', 'short')).toBe('Gemini API key seems too short.');
    });

    it('returns error for key with spaces', () => {
      expect(validateApiKey('gemini', 'AIza SyABC123')).toBe('Gemini API key contains invalid characters.');
    });

    it('returns error for key with special chars', () => {
      expect(validateApiKey('gemini', 'AIzaSy!@#$')).toBe('Gemini API key contains invalid characters.');
    });

    it('accepts alphanumeric, underscore, and hyphen', () => {
      expect(validateApiKey('gemini', 'A1b2_C3-d4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0')).toBeNull();
    });
  });

  describe('deepseek', () => {
    it('returns null for a sk-prefixed key', () => {
      expect(validateApiKey('deepseek', 'sk-abc123def456ghi789jkl012')).toBeNull();
    });

    it('returns null for a key without sk- prefix', () => {
      expect(validateApiKey('deepseek', 'abc123def456ghi789jkl012')).toBeNull();
    });

    it('returns error for empty key', () => {
      expect(validateApiKey('deepseek', '')).toBe('API key is required.');
    });

    it('returns error for too-short key', () => {
      expect(validateApiKey('deepseek', 'short')).toBe('DeepSeek API key seems too short.');
    });

    it('returns error for key with spaces', () => {
      expect(validateApiKey('deepseek', 'sk-abc def')).toBe('DeepSeek API key contains invalid characters.');
    });
  });
});

describe('AI_PROVIDER_DEFAULT_MODEL', () => {
  it('has a default model for gemini', () => {
    expect(AI_PROVIDER_DEFAULT_MODEL.gemini).toBe('gemini-2.5-flash');
  });

  it('has a default model for deepseek', () => {
    expect(AI_PROVIDER_DEFAULT_MODEL.deepseek).toBe('deepseek-chat');
  });
});
