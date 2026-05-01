import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendAiChat } from './aiChat';

const { mockGetIdToken, mockAuth } = vi.hoisted(() => ({
  mockGetIdToken: vi.fn(async () => 'firebase-token'),
  mockAuth: {
    currentUser: {
      getIdToken: () => Promise.resolve('firebase-token'),
    } as { getIdToken: () => Promise<string> } | null,
  },
}));

vi.mock('./firebase', () => ({
  auth: mockAuth,
}));

describe('aiChat client helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = {
      getIdToken: () => mockGetIdToken(),
    };
  });

  it('posts question with firebase bearer token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        answer: 'Portfolio up 4.2% month-to-date.',
        model: 'gemini-2.5-flash',
        latencyMs: 123,
        contextSummary: 'Portfolio Family has 2 assets.',
      }),
    })));

    const result = await sendAiChat({ portfolioId: 'portfolio-1', question: 'How is my portfolio doing?' });

    expect(result.answer).toContain('4.2%');
    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer firebase-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('throws clear error when signed out', async () => {
    mockAuth.currentUser = null;

    await expect(sendAiChat({ portfolioId: 'portfolio-1', question: 'What changed today?' })).rejects.toThrow('signed in');
  });

  it('surfaces backend error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'AI key missing' }),
    })));

    await expect(sendAiChat({ portfolioId: 'portfolio-1', question: 'test' })).rejects.toThrow('AI key missing');
  });
});
