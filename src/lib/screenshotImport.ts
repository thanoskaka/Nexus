import { auth } from './firebase';
import { assertHostedMode } from './workspaceGuard';
import type { ExtractedAsset } from '../server/providers/screenshot/screenshotRoutes.js';

export type { ExtractedAsset };

export type ScreenshotImportResponse = {
  candidates: ExtractedAsset[];
  errors: string[];
};

export type ScreenshotImportProgress = {
  status: 'uploading' | 'processing' | 'done' | 'error';
  message: string;
  currentFile?: number;
  totalFiles?: number;
};

type ScreenshotImportCandidate = ExtractedAsset & {
  _sourceId: string;
  _rawDescription: string;
};

async function requireAuthToken(): Promise<string> {
  assertHostedMode('Screenshot Import');
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to import screenshots.');
  }
  return currentUser.getIdToken();
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text().catch(() => '');
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: string }).error || `Request failed (${response.status})`)
      : text.trim() || `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (payload == null) {
    throw new Error('Server returned an empty response. Please retry.');
  }
  return payload as T;
}

export async function extractAssetsFromScreenshots(
  files: File[],
  onProgress?: (progress: ScreenshotImportProgress) => void,
): Promise<ScreenshotImportResponse> {
  const token = await requireAuthToken();

  onProgress?.({ status: 'uploading', message: `Uploading ${files.length} file(s)...`, totalFiles: files.length, currentFile: 0 });

  const form = new FormData();
  for (const file of files) {
    form.append('screenshots', file, file.name);
  }

  onProgress?.({ status: 'processing', message: 'AI is analyzing screenshots...', totalFiles: files.length, currentFile: files.length });

  const response = await fetch('/api/connections/screenshot/import', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const result = await parseJsonResponse<ScreenshotImportResponse>(response);

  onProgress?.({ status: 'done', message: `Extracted ${result.candidates.length} asset(s) from ${files.length} file(s).` });

  return result;
}

export function buildImportPayload(
  candidates: ExtractedAsset[],
  source: string = 'screenshot',
): ScreenshotImportCandidate[] {
  return candidates.map((c, index) => ({
    ...c,
    _sourceId: `screenshot-${source}-${Date.now()}-${index}`,
    _rawDescription: `source_file:${c.notes || 'unknown'} | ${source}`,
  }));
}
