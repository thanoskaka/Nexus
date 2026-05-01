import React from 'react';
import { Bot, Send, Settings } from 'lucide-react';
import { sendAiChat } from '../lib/aiChat';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

const MISSING_KEY_MESSAGE = 'AI API key is not configured. Set one in Settings';

export function AiAssistantCard({ portfolioId }: { portfolioId: string | null }) {
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [contextSummary, setContextSummary] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleAsk = async () => {
    if (!portfolioId) {
      setError('No active portfolio selected. Select a portfolio and retry.');
      return;
    }
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setContextSummary(null);
    try {
      const result = await sendAiChat({
        portfolioId,
        question: trimmed,
      });
      setAnswer(result.answer);
      setContextSummary(result.contextSummary);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Unable to get AI answer right now.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isMissingKey = error?.includes('AI API key is not configured');

  return (
    <Card className="border-none shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <CardTitle>Nexus AI Assistant</CardTitle>
        </div>
        <CardDescription>Ask a portfolio question. Uses your signed-in Firebase identity and Nexus backend.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask: What changed most in my portfolio this month?"
            aria-label="Ask Nexus AI"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleAsk();
              }
            }}
            disabled={loading || !portfolioId}
          />
          <Button
            onClick={() => void handleAsk()}
            disabled={loading || !question.trim() || !portfolioId}
            className="rounded-full bg-[#00875A] text-white hover:bg-[#007A51] sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            {loading ? 'Asking...' : 'Send'}
          </Button>
        </div>

        {error ? (
          <div className={`rounded-xl border px-3 py-2 text-sm ${
            isMissingKey
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
          }`}>
            {isMissingKey ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>AI API key is not configured. Set one in Settings to use the AI assistant.</span>
                <a
                  href="/settings?section=pricing"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Go to Settings
                </a>
              </div>
            ) : (
              error
            )}
          </div>
        ) : null}

        {answer ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 whitespace-pre-wrap">
            {answer}
          </div>
        ) : null}

        {contextSummary ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Context used: {contextSummary}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
