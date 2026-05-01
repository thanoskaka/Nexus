// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantCard } from './AiAssistantCard';

vi.mock('../lib/aiChat', () => ({
  sendAiChat: vi.fn(),
}));

describe('AiAssistantCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits question and renders answer', async () => {
    const { sendAiChat } = await import('../lib/aiChat');
    vi.mocked(sendAiChat).mockResolvedValue({
      answer: 'Largest gain came from US equity holdings.',
      model: 'gemini-2.5-flash',
      latencyMs: 111,
      contextSummary: 'Portfolio has 3 assets.',
    });
    const user = userEvent.setup();

    render(<AiAssistantCard portfolioId="portfolio-1" />);
    await user.type(screen.getByLabelText('Ask Nexus AI'), 'Where did gains come from?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(sendAiChat).toHaveBeenCalledWith(expect.objectContaining({
        portfolioId: 'portfolio-1',
        question: 'Where did gains come from?',
      }));
    });
    expect(screen.getByText(/Largest gain/)).toBeTruthy();
  });

  it('shows backend error to user', async () => {
    const { sendAiChat } = await import('../lib/aiChat');
    vi.mocked(sendAiChat).mockRejectedValue(new Error('AI endpoint not configured'));
    const user = userEvent.setup();

    render(<AiAssistantCard portfolioId="portfolio-1" />);
    await user.type(screen.getByLabelText('Ask Nexus AI'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('AI endpoint not configured')).toBeTruthy();
    });
  });
});
