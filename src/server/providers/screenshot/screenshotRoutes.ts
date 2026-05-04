import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { requireFirebaseUser } from '../../auth/requireFirebaseUser.js';
import { resolveAiApiKey } from '../../user/aiCredentialsStore.js';
import type { AiProviderConfig } from '../../ai/geminiClient.js';
import type { AiProvider } from '../../user/aiCredentialsTypes.js';

export type ExtractedAsset = {
  name: string;
  ticker?: string;
  quantity: number;
  price?: number;
  value?: number;
  currency?: string;
  country?: string;
  assetClass?: string;
  isin?: string;
  notes?: string;
  confidence: number;
  warnings: string[];
};

type ExtractResponse = {
  candidates: ExtractedAsset[];
  errors: string[];
};

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return 'Unknown error';
}

function buildExtractionPrompt(): string {
  return [
    'You are a financial document OCR assistant. Extract all investment holdings visible in this image.',
    'The image is a screenshot or photo of a portfolio/broker holdings page, or a transaction receipt.',
    '',
    'Return ONLY valid JSON with NO markdown formatting, NO code fences, NO trailing punctuation.',
    '',
    'The JSON must be an array of objects with these fields:',
    '- name (string, REQUIRED): holding name/scheme name/security name',
    '- ticker (string, optional): ticker symbol if visible',
    '- quantity (number, REQUIRED): number of units/shares held, or 0 if not visible',
    '- price (number, optional): current price per unit/share if visible',
    '- value (number, optional): total market value if visible',
    '- currency (string, optional): currency code like INR, CAD, USD',
    '- country (string, optional): India or Canada if determinable',
    '- assetClass (string, optional): type like Stocks, Mutual Funds, Gold, ETF, FD, etc.',
    '- isin (string, optional): ISIN number if visible',
    '- notes (string, optional): any additional context from the image',
    '- confidence (number, 0.0 to 1.0): how confident you are in this extraction',
    '- warnings (array of strings): any concerns about data quality',
    '',
    'Be precise with numbers. Do not include currency symbols in numeric fields.',
    'If you cannot see any holdings in the image, return an empty array.',
    '',
    'IMPORTANT: The response must be parseable as raw JSON. No markdown, no backticks, no formatting.',
  ].join('\n');
}

type AiOcrResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type DeepSeekOcrResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

function extractTextFromGeminiResponse(response: AiOcrResponse): string {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  return '';
}

async function callGeminiOcr(
  config: AiProviderConfig,
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const { model, apiKey } = config;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { temperature: 0.1 },
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text.slice(0, 300) || `Gemini OCR request failed with status ${response.status}`);
    }

    const payload = await response.json() as AiOcrResponse;
    if (payload.error?.message) throw new Error(payload.error.message.slice(0, 300));

    const text = extractTextFromGeminiResponse(payload);
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callDeepSeekOcr(
  config: AiProviderConfig,
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const { model, apiKey } = config;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.05,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text.slice(0, 300) || `DeepSeek OCR request failed with status ${response.status}`);
    }

    const payload = await response.json() as DeepSeekOcrResponse;
    if (payload.error?.message) throw new Error(payload.error.message.slice(0, 300));

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('DeepSeek returned an empty response.');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callAiOcr(
  config: AiProviderConfig,
  imageBase64: string,
  mimeType: string,
): Promise<ExtractedAsset[]> {
  const prompt = buildExtractionPrompt();

  let rawText: string;
  if (config.provider === 'deepseek') {
    rawText = await callDeepSeekOcr(config, imageBase64, mimeType, prompt);
  } else {
    rawText = await callGeminiOcr(config, imageBase64, mimeType, prompt);
  }

  return parseExtractedJson(rawText);
}

function parseExtractedJson(text: string): ExtractedAsset[] {
  let cleaned = text.trim();

  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      cleaned = match[1].trim();
    }
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed.map((item: Record<string, unknown>): ExtractedAsset | null => {
      const name = String(item.name || '').trim();
      if (!name) return null;

      const quantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity)
        ? item.quantity
        : typeof item.quantity === 'string'
          ? parseFloat(item.quantity) || 0
          : 0;

      const confidence = typeof item.confidence === 'number' && Number.isFinite(item.confidence)
        ? Math.max(0, Math.min(1, item.confidence))
        : 0.5;

      const warnings = Array.isArray(item.warnings) ? item.warnings.map(String) : [];

      return {
        name,
        ticker: item.ticker ? String(item.ticker).trim() : undefined,
        quantity,
        price: typeof item.price === 'number' ? item.price : undefined,
        value: typeof item.value === 'number' ? item.value : undefined,
        currency: item.currency ? String(item.currency).trim().toUpperCase() : undefined,
        country: item.country ? String(item.country).trim() : undefined,
        assetClass: item.assetClass ? String(item.assetClass).trim() : undefined,
        isin: item.isin ? String(item.isin).trim() : undefined,
        notes: item.notes ? String(item.notes).trim() : undefined,
        confidence,
        warnings,
      } satisfies ExtractedAsset;
    }).filter((item): item is ExtractedAsset => item !== null);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${safeError(error)}. Raw text: ${cleaned.slice(0, 200)}`);
  }
}

export function createScreenshotRouter() {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/heic',
        'image/heif',
        'application/pdf',
      ];
      if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(png|jpe?g|webp|heic|heif|pdf)$/i)) {
        cb(null, true);
        return;
      }
      cb(new Error('Please upload an image (PNG, JPEG, WebP, HEIC) or PDF file.'));
    },
  });

  router.post(
    '/import',
    requireFirebaseUser,
    upload.array('screenshots', 10),
    async (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No screenshot files provided.' });
      }

      const user = req.user!;
      const aiConfig = await resolveAiApiKey(user.uid);
      if (!aiConfig) {
        return res.status(500).json({
          candidates: [],
          errors: ['AI API key is not configured. Set one in Settings → Pricing → AI Provider & API Key, or add GEMINI_API_KEY to .env.local.'],
        });
      }

      const allCandidates: ExtractedAsset[] = [];
      const allErrors: string[] = [];

      for (const file of files) {
        try {
          const mimeType = file.mimetype || 'image/png';
          const base64 = file.buffer.toString('base64');
          const candidates = await callAiOcr(aiConfig, base64, mimeType);
          allCandidates.push(
            ...candidates.map((c) => ({
              ...c,
              notes: c.notes
                ? `source_file:${file.originalname} | ${c.notes}`
                : `source_file:${file.originalname}`,
              warnings: c.confidence < 0.5
                ? [...c.warnings, 'Low confidence extraction; please verify manually.']
                : c.warnings,
            })),
          );
        } catch (error) {
          allErrors.push(`File "${file.originalname}": ${safeError(error)}`);
        }
      }

      const result: ExtractResponse = {
        candidates: allCandidates,
        errors: allErrors,
      };

      return res.json(result);
    },
  );

  return router;
}
