import { getStorageAdapter } from '../storage/index.js';
import {
  ONBOARDING_COLLECTION,
  type OnboardingDocument,
  type OnboardingResponse,
  type OnboardingPutBody,
  getEmptyOnboardingDocument,
} from './onboardingTypes.js';

function now() {
  return Date.now();
}

function toResponse(doc: OnboardingDocument): OnboardingResponse {
  return { onboarding: doc };
}

export async function getOnboardingState(uid: string): Promise<OnboardingResponse> {
  const doc = await getStorageAdapter().getDoc<OnboardingDocument>(ONBOARDING_COLLECTION, uid);
  if (!doc) return { onboarding: null };
  return toResponse(doc);
}

export async function saveOnboardingStep(
  uid: string,
  body: OnboardingPutBody,
): Promise<OnboardingResponse> {
  const existing = await getStorageAdapter().getDoc<OnboardingDocument>(ONBOARDING_COLLECTION, uid);
  const timestamp = now();

  const base = existing || getEmptyOnboardingDocument(uid);

  const merged: OnboardingDocument = {
    ...base,
    uid,
    status: base.status === 'not_started' ? 'in_progress' : base.status,
    currentStep: body.currentStep ?? base.currentStep,
    primaryCountry: body.primaryCountry !== undefined ? body.primaryCountry : base.primaryCountry,
    primaryCurrency: body.primaryCurrency !== undefined ? body.primaryCurrency : base.primaryCurrency,
    secondaryCountry: body.secondaryCountry !== undefined ? body.secondaryCountry : base.secondaryCountry,
    secondaryCurrency: body.secondaryCurrency !== undefined ? body.secondaryCurrency : base.secondaryCurrency,
    selectedAssetClasses: body.selectedAssetClasses !== undefined ? body.selectedAssetClasses : base.selectedAssetClasses,
    providerSelections: body.providerSelections !== undefined ? body.providerSelections : base.providerSelections,
    integrationSelections: body.integrationSelections !== undefined ? body.integrationSelections : base.integrationSelections,
    members: body.members !== undefined ? body.members : base.members,
    createdAt: base.createdAt || timestamp,
    updatedAt: timestamp,
  };

  await getStorageAdapter().setDoc(ONBOARDING_COLLECTION, uid, merged as unknown as Record<string, unknown>, true);
  return toResponse(merged);
}

export async function completeOnboarding(uid: string): Promise<OnboardingResponse> {
  const existing = await getStorageAdapter().getDoc<OnboardingDocument>(ONBOARDING_COLLECTION, uid);
  if (!existing) {
    const empty = getEmptyOnboardingDocument(uid);
    empty.status = 'completed';
    empty.completedAt = now();
    empty.updatedAt = now();
    await getStorageAdapter().setDoc(ONBOARDING_COLLECTION, uid, empty as unknown as Record<string, unknown>, true);
    return toResponse(empty);
  }

  const timestamp = now();
  await getStorageAdapter().setDoc(
    ONBOARDING_COLLECTION,
    uid,
    { status: 'completed', completedAt: timestamp, updatedAt: timestamp } as unknown as Record<string, unknown>,
    true,
  );

  const updated = await getStorageAdapter().getDoc<OnboardingDocument>(ONBOARDING_COLLECTION, uid);
  return toResponse(updated!);
}

export async function resetOnboarding(uid: string): Promise<void> {
  await getStorageAdapter().deleteDoc(ONBOARDING_COLLECTION, uid);
}
