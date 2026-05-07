import { auth } from './firebase';
import { assertHostedMode } from './workspaceGuard';

export type AiProvider = 'gemini' | 'deepseek' | 'openai' | 'anthropic';

export type AiCredentialsResponse = {
  provider: AiProvider | null;
  model: string | null;
  apiKeyLast4: string | null;
  source: 'user' | 'server-default' | 'none';
  defaultUsageCap: string | null;
};

export type AiTestResult = {
  success: boolean;
  provider?: AiProvider;
  model?: string;
  message?: string;
  error?: string;
};

async function requireAuthHeaders() {
  assertHostedMode('AI Credentials');
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in.');
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: string }).error || 'Request failed')
      : 'Request failed';
    throw new Error(message);
  }
  if (!payload) throw new Error('Server returned an empty response.');
  return payload as T;
}

export async function getAiCredentials(): Promise<AiCredentialsResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/ai-credentials', { headers });
  return parseJsonResponse<AiCredentialsResponse>(response);
}

export async function saveAiCredentials(input: {
  provider: AiProvider;
  model?: string;
  apiKey: string;
}): Promise<AiCredentialsResponse> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/ai-credentials', {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });
  return parseJsonResponse<AiCredentialsResponse>(response);
}

export async function deleteAiCredentials(): Promise<{ success: boolean }> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/ai-credentials', {
    method: 'DELETE',
    headers,
  });
  return parseJsonResponse<{ success: boolean }>(response);
}

export async function testAiCredentials(): Promise<AiTestResult> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/ai-credentials/test', {
    method: 'POST',
    headers,
  });
  return parseJsonResponse<AiTestResult>(response);
}
