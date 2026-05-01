import { describe, expect, it } from 'vitest';
import { validateAiChatBody } from './validation.js';

describe('validateAiChatBody', () => {
  it('accepts valid payload', () => {
    const result = validateAiChatBody({
      portfolioId: 'portfolio-1',
      question: 'How much do I have in CAD?',
      threadId: 'thread-1',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        portfolioId: 'portfolio-1',
        question: 'How much do I have in CAD?',
        threadId: 'thread-1',
      },
    });
  });

  it('rejects missing portfolioId', () => {
    const result = validateAiChatBody({ question: 'Q' });
    expect(result).toEqual({ ok: false, error: 'portfolioId is required.' });
  });

  it('rejects missing question', () => {
    const result = validateAiChatBody({ portfolioId: 'p-1' });
    expect(result).toEqual({ ok: false, error: 'question is required.' });
  });
});
