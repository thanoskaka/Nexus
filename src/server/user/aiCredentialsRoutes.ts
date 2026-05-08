import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseUser } from '../auth/requireFirebaseUser.js';
import {
  getAiCredentials,
  upsertAiCredentials,
  deleteAiCredentials,
  resolveAiCredentialsResponse,
} from './aiCredentialsStore.js';
import {
  type AiProvider,
  type AiCredentialsPutRequest,
  isAiProvider,
  validateApiKey,
  AI_PROVIDER_DEFAULT_MODEL,
  AI_PROVIDER_LABELS,
} from './aiCredentialsTypes.js';

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}

const PROVIDERS_LIST = 'gemini, deepseek, openai, anthropic';

export function createAiCredentialsRouter() {
  const router = Router();

  router.get('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const response = await resolveAiCredentialsResponse(user.uid);
      return res.json(response);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.put('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const body = req.body as AiCredentialsPutRequest;

    if (!body.provider || !isAiProvider(body.provider)) {
      return res.status(400).json({ error: `Invalid or missing provider. Supported: ${PROVIDERS_LIST}.` });
    }

    const provider: AiProvider = body.provider;
    const apiKey = (body.apiKey || '').trim();
    const validationError = validateApiKey(provider, apiKey);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const model = (body.model || '').trim() || AI_PROVIDER_DEFAULT_MODEL[provider];

    try {
      const result = await upsertAiCredentials(user.uid, provider, model, apiKey);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.delete('/', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      await deleteAiCredentials(user.uid);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: safeError(error) });
    }
  });

  router.post('/test', requireFirebaseUser, async (req: Request, res: Response) => {
    const user = req.user!;

    try {
      const { resolveAiApiKey } = await import('./aiCredentialsStore.js');
      const resolved = await resolveAiApiKey(user.uid);

      if (!resolved) {
        return res.status(400).json({
          success: false,
          error: `No AI credentials configured. Set an API key in Settings or configure an environment variable (e.g. GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY).`,
        });
      }

      const { provider, model, apiKey } = resolved;

      if (provider === 'gemini') {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const testResponse = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
          }),
        });

        if (!testResponse.ok) {
          const text = await testResponse.text().catch(() => '');
          return res.status(400).json({
            success: false,
            error: `${AI_PROVIDER_LABELS[provider]} test failed: ${text.slice(0, 200) || `HTTP ${testResponse.status}`}`,
          });
        }

        return res.json({ success: true, provider, model, message: `${AI_PROVIDER_LABELS[provider]} connection successful.` });
      }

      if (provider === 'deepseek') {
        const testResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
            max_tokens: 10,
          }),
        });

        if (!testResponse.ok) {
          const text = await testResponse.text().catch(() => '');
          return res.status(400).json({
            success: false,
            error: `${AI_PROVIDER_LABELS[provider]} test failed: ${text.slice(0, 200) || `HTTP ${testResponse.status}`}`,
          });
        }

        return res.json({ success: true, provider, model, message: `${AI_PROVIDER_LABELS[provider]} connection successful.` });
      }

      if (provider === 'openai') {
        const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
            max_tokens: 10,
          }),
        });

        if (!testResponse.ok) {
          const text = await testResponse.text().catch(() => '');
          return res.status(400).json({
            success: false,
            error: `${AI_PROVIDER_LABELS[provider]} test failed: ${text.slice(0, 200) || `HTTP ${testResponse.status}`}`,
          });
        }

        return res.json({ success: true, provider, model, message: `${AI_PROVIDER_LABELS[provider]} connection successful.` });
      }

      if (provider === 'anthropic') {
        const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
          }),
        });

        if (!testResponse.ok) {
          const text = await testResponse.text().catch(() => '');
          return res.status(400).json({
            success: false,
            error: `${AI_PROVIDER_LABELS[provider]} test failed: ${text.slice(0, 200) || `HTTP ${testResponse.status}`}`,
          });
        }

        return res.json({ success: true, provider, model, message: `${AI_PROVIDER_LABELS[provider]} connection successful.` });
      }

      return res.status(400).json({ success: false, error: `Unknown provider: ${provider}` });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Connection test failed: ${safeError(error)}`,
      });
    }
  });

  return router;
}
