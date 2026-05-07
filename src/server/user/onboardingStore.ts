import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';
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

function getDocRef(uid: string) {
  return getFirebaseAdminFirestore().collection(ONBOARDING_COLLECTION).doc(uid);
}

function toResponse(doc: OnboardingDocument): OnboardingResponse {
  return { onboarding: doc };
}

export async function getOnboardingState(uid: string): Promise<OnboardingResponse> {
  const snapshot = await getDocRef(uid).get();
  if (!snapshot.exists) return { onboarding: null };
  return toResponse(snapshot.data() as OnboardingDocument);
}

export async function saveOnboardingStep(
  uid: string,
  body: OnboardingPutBody,
): Promise<OnboardingResponse> {
  const existing = await getDocRef(uid).get();
  const timestamp = now();

  const base = existing.exists
    ? (existing.data() as OnboardingDocument)
    : getEmptyOnboardingDocument(uid);

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

  await getDocRef(uid).set(merged, { merge: true });
  return toResponse(merged);
}

export async function completeOnboarding(uid: string): Promise<OnboardingResponse> {
  const existing = await getDocRef(uid).get();
  if (!existing.exists) {
    const empty = getEmptyOnboardingDocument(uid);
    empty.status = 'completed';
    empty.completedAt = now();
    empty.updatedAt = now();
    await getDocRef(uid).set(empty, { merge: true });
    return toResponse(empty);
  }

  const timestamp = now();
  await getDocRef(uid).set(
    { status: 'completed', completedAt: timestamp, updatedAt: timestamp },
    { merge: true },
  );

  const updated = await getDocRef(uid).get();
  return toResponse(updated.data() as OnboardingDocument);
}

export async function resetOnboarding(uid: string): Promise<void> {
  await getDocRef(uid).delete();
}
