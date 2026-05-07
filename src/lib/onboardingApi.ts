import { auth } from './firebase';
import type {
  OnboardingDocument,
  OnboardingPutBody,
  OnboardingResponse,
} from '../server/user/onboardingTypes';

async function requireAuthHeaders() {
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

export async function getOnboardingState(): Promise<OnboardingDocument | null> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/onboarding', { headers });
  const result = await parseJsonResponse<OnboardingResponse>(response);
  return result.onboarding;
}

export async function saveOnboardingStep(step: OnboardingPutBody): Promise<OnboardingDocument> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/onboarding', {
    method: 'PUT',
    headers,
    body: JSON.stringify(step),
  });
  const result = await parseJsonResponse<OnboardingResponse>(response);
  if (!result.onboarding) throw new Error('Failed to save onboarding step.');
  return result.onboarding;
}

export async function completeOnboarding(): Promise<OnboardingDocument> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/onboarding/complete', {
    method: 'POST',
    headers,
  });
  const result = await parseJsonResponse<OnboardingResponse>(response);
  if (!result.onboarding) throw new Error('Failed to complete onboarding.');
  return result.onboarding;
}

export async function resetOnboarding(): Promise<void> {
  const headers = await requireAuthHeaders();
  const response = await fetch('/api/user/onboarding/reset', {
    method: 'POST',
    headers,
  });
  await parseJsonResponse<{ ok: boolean }>(response);
}
