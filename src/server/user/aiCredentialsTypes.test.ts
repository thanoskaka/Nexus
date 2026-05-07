import { describe, it, expect } from 'vitest';
import { isAiProvider, validateApiKey, AI_PROVIDER_DEFAULT_MODEL, AI_PROVIDER_LABELS, isVisionCapable } from './aiCredentialsTypes.js';

describe('isAiProvider', () => {
  it('returns true for gemini', () => {
    expect(isAiProvider('gemini')).toBe(true);
  });

  it('returns true for deepseek', () => {
    expect(isAiProvider('deepseek')).toBe(true);
  });

  it('returns true for openai', () => {
    expect(isAiProvider('openai')).toBe(true);
  });

  it('returns true for anthropic', () => {
    expect(isAiProvider('anthropic')).toBe(true);
  });

  it('returns false for unknown provider', () => {
    expect(isAiProvider('unknown')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAiProvider('')).toBe(false);
  });
});

describe('AI_PROVIDER_LABELS', () => {
  it('has labels for all providers', () => {
    expect(AI_PROVIDER_LABELS.gemini).toBe('Google Gemini');
    expect(AI_PROVIDER_LABELS.deepseek).toBe('DeepSeek');
    expect(AI_PROVIDER_LABELS.openai).toBe('OpenAI');
    expect(AI_PROVIDER_LABELS.anthropic).toBe('Anthropic');
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

  describe('openai', () => {
    it('returns null for an sk-prefixed key', () => {
      expect(validateApiKey('openai', 'sk-proj-abc123def456ghi789jkl012')).toBeNull();
    });

    it('returns null for an sk- key without extra prefix', () => {
      expect(validateApiKey('openai', 'sk-abc123def456ghi789jkl012mno345pqr')).toBeNull();
    });

    it('returns error for empty key', () => {
      expect(validateApiKey('openai', '')).toBe('API key is required.');
    });

    it('returns error for too-short key', () => {
      expect(validateApiKey('openai', 'short')).toBe('OpenAI API key seems too short.');
    });

    it('returns error for key with spaces', () => {
      expect(validateApiKey('openai', 'sk-abc def')).toBe('OpenAI API key contains invalid characters.');
    });

    it('accepts key that does not start with sk- if long enough', () => {
      expect(validateApiKey('openai', 'abcdefghijklmnopqrstuvwxyz')).toBeNull();
    });
  });

  describe('anthropic', () => {
    it('returns null for an sk-ant-prefixed key', () => {
      expect(validateApiKey('anthropic', 'sk-ant-abc123def456ghi789jkl012')).toBeNull();
    });

    it('returns error for empty key', () => {
      expect(validateApiKey('anthropic', '')).toBe('API key is required.');
    });

    it('returns error for too-short key', () => {
      expect(validateApiKey('anthropic', 'short')).toBe('Anthropic API key seems too short.');
    });

    it('returns error for key with spaces', () => {
      expect(validateApiKey('anthropic', 'sk-ant-abc def')).toBe('Anthropic API key contains invalid characters.');
    });

    it('accepts key that does not start with sk-ant- if long enough', () => {
      expect(validateApiKey('anthropic', 'abcdefghijklmnopqrstuvwxyz0123456789')).toBeNull();
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

  it('has a default model for openai', () => {
    expect(AI_PROVIDER_DEFAULT_MODEL.openai).toBe('gpt-4o-mini');
  });

  it('has a default model for anthropic', () => {
    expect(AI_PROVIDER_DEFAULT_MODEL.anthropic).toBe('claude-3-5-haiku-latest');
  });
});

describe('isVisionCapable', () => {
  it('gemini models are always vision capable', () => {
    expect(isVisionCapable('gemini', 'gemini-2.5-flash')).toBe(true);
    expect(isVisionCapable('gemini', 'gemini-2.5-pro')).toBe(true);
  });

  it('deepseek-chat is vision capable', () => {
    expect(isVisionCapable('deepseek', 'deepseek-chat')).toBe(true);
  });

  it('deepseek-reasoner is not vision capable', () => {
    expect(isVisionCapable('deepseek', 'deepseek-reasoner')).toBe(false);
  });

  it('openai models are vision capable', () => {
    expect(isVisionCapable('openai', 'gpt-4o-mini')).toBe(true);
    expect(isVisionCapable('openai', 'gpt-4o')).toBe(true);
  });

  it('anthropic models are vision capable', () => {
    expect(isVisionCapable('anthropic', 'claude-3-5-haiku-latest')).toBe(true);
    expect(isVisionCapable('anthropic', 'claude-3-5-sonnet-latest')).toBe(true);
  });
});
