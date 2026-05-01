import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Settings, Sparkles, X } from 'lucide-react';
import { sendAiChat } from '../lib/aiChat';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  role: MessageRole;
  content: string;
}

const STARTER_PROMPTS = [
  'What is my total portfolio value by currency?',
  'Which holdings are largest right now?',
  'Show my top 5 mutual funds by current value.',
  'Where are my biggest concentration risks?',
  'What should I review this week in my portfolio?',
];

function getSessionKey(userId: string, portfolioId: string | null) {
  return `nexus-ai-chat:${userId}:${portfolioId || 'none'}`;
}

function readStoredMessages(userId: string, portfolioId: string | null): ChatMessage[] {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(getSessionKey(userId, portfolioId));
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const role = (entry as { role?: string }).role;
        const content = (entry as { content?: string }).content;
        if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim()) {
          return { role, content: content.trim() } as ChatMessage;
        }
        return null;
      })
      .filter((entry): entry is ChatMessage => Boolean(entry));
  } catch {
    return [];
  }
}

export function AiChatWidget({ userId, portfolioId }: { userId: string | null; portfolioId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setInput('');
      setError(null);
      return;
    }
    setMessages(readStoredMessages(userId, portfolioId));
    setInput('');
    setError(null);
  }, [userId, portfolioId]);

  useEffect(() => {
    if (!userId) return;
    try {
      sessionStorage.setItem(getSessionKey(userId, portfolioId), JSON.stringify(messages));
    } catch {
      // Ignore transient storage failures (privacy mode, quota limits).
    }
  }, [messages, userId, portfolioId]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, loading]);

  const placeholder = useMemo(() => (loading ? 'Thinking...' : 'Ask about your portfolio'), [loading]);

  const sendMessage = async (next?: string) => {
    const content = (next ?? input).trim();
    if (!content || loading) return;
    if (!portfolioId) {
      setError('No active portfolio selected.');
      return;
    }

    setLoading(true);
    setError(null);

    const userMessage: ChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');

    try {
      const result = await sendAiChat({ portfolioId, question: content });
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to process AI request right now.');
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[40] inline-flex h-14 w-14 items-center justify-center rounded-full border bg-[linear-gradient(135deg,#66e8af_0%,#0aa06b_100%)] text-[#042a1d] shadow-[0_20px_42px_rgba(16,185,129,0.42)] transition hover:scale-[1.03]"
          style={{ borderColor: 'rgba(255,255,255,0.35)' }}
          aria-label="Open Nexus AI assistant"
        >
          <Sparkles size={22} />
        </button>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[2px]" onClick={() => setIsOpen(false)}>
          <div
            className="absolute bottom-0 right-0 flex h-[82vh] w-full flex-col border-l border-t border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:h-screen lg:max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-100 p-2 text-[#00875A] dark:bg-slate-900">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Nexus AI Assistant</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Powered by your portfolio data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                aria-label="Close Nexus AI assistant"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Try one of these prompts:</p>
                  <div className="space-y-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-[#00875A]/45 hover:text-[#00875A] disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'ml-auto bg-[#00875A] text-white'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'
                  }`}
                >
                  {message.content}
                </div>
              ))}

              {loading ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking...
                </div>
              ) : null}

              {error ? (
                <div className={`rounded-xl border px-3 py-2 text-xs ${
                  error.includes('API key is not configured')
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300'
                }`}>
                  {error.includes('API key is not configured') ? (
                    <div className="flex flex-col gap-2">
                      <span>AI API key not configured.</span>
                      <a
                        href="/settings?section=pricing"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                      >
                        <Settings className="h-3 w-3" />
                        Configure in Settings
                      </a>
                    </div>
                  ) : (
                    error
                  )}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={placeholder}
                  className="max-h-28 min-h-[44px] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-[#00875A] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#00875A] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
