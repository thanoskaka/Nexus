import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

vi.mock('../firebaseAdmin.js', () => ({
  getFirebaseAdminFirestore: () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
  }),
}));

import { getEmptyOnboardingDocument } from './onboardingTypes.js';
import { getOnboardingState, saveOnboardingStep, completeOnboarding, resetOnboarding } from './onboardingStore.js';

function setupMockDoc(data: unknown | null) {
  mockCollection.mockReturnValue({ doc: mockDoc });
  mockDoc.mockReturnValue({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  });
  if (data === null) {
    mockGet.mockResolvedValue({ exists: false });
  } else {
    mockGet.mockResolvedValue({ exists: true, data: () => data });
  }
}

describe('onboardingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOnboardingState', () => {
    it('returns null when no doc exists', async () => {
      setupMockDoc(null);
      const result = await getOnboardingState('uid-1');
      expect(result.onboarding).toBeNull();
    });

    it('returns existing onboarding document', async () => {
      setupMockDoc({ uid: 'uid-1', status: 'in_progress', currentStep: 2 });
      const result = await getOnboardingState('uid-1');
      expect(result.onboarding?.status).toBe('in_progress');
      expect(result.onboarding?.currentStep).toBe(2);
    });
  });

  describe('saveOnboardingStep', () => {
    it('creates new doc and sets status to in_progress', async () => {
      setupMockDoc(null);
      await saveOnboardingStep('uid-1', { primaryCountry: 'US', primaryCurrency: 'USD' });

      expect(mockSet).toHaveBeenCalledTimes(1);
      const doc = mockSet.mock.calls[0][0];
      expect(doc.uid).toBe('uid-1');
      expect(doc.status).toBe('in_progress');
      expect(doc.primaryCountry).toBe('US');
    });

    it('merges with existing document', async () => {
      setupMockDoc({
        uid: 'uid-1',
        status: 'in_progress',
        currentStep: 0,
        primaryCountry: 'US',
        primaryCurrency: 'USD',
        selectedAssetClasses: [],
        providerSelections: [],
        integrationSelections: [],
        members: [],
      });

      await saveOnboardingStep('uid-1', { currentStep: 1, selectedAssetClasses: ['us-stocks'] });

      expect(mockSet).toHaveBeenCalledTimes(1);
      const doc = mockSet.mock.calls[0][0];
      expect(doc.currentStep).toBe(1);
      expect(doc.primaryCountry).toBe('US');
      expect(doc.selectedAssetClasses).toEqual(['us-stocks']);
    });

    it('uses merge: true for firestore writes', async () => {
      setupMockDoc(null);
      await saveOnboardingStep('uid-1', { primaryCountry: 'CA' });

      expect(mockSet).toHaveBeenCalledWith(expect.anything(), { merge: true });
    });
  });

  describe('completeOnboarding', () => {
    it('marks status as completed', async () => {
      setupMockDoc({ uid: 'uid-1', status: 'in_progress' });
      await completeOnboarding('uid-1');

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', completedAt: expect.any(Number) }),
        { merge: true },
      );
    });

    it('creates doc if does not exist and marks completed', async () => {
      mockCollection.mockReturnValue({ doc: mockDoc });
      const existingDoc = { uid: 'uid-1', status: 'in_progress' };
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { exists: false };
        return { exists: true, data: () => existingDoc };
      });
      mockDoc.mockReturnValue({ get: mockGet, set: mockSet, delete: mockDelete });

      const result = await completeOnboarding('uid-1');

      expect(mockSet).toHaveBeenCalled();
      expect(result.onboarding?.status).toBe('completed');
    });
  });

  describe('resetOnboarding', () => {
    it('deletes the document', async () => {
      setupMockDoc(null);
      await resetOnboarding('uid-1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});

describe('getEmptyOnboardingDocument', () => {
  it('creates doc with not_started status', () => {
    const doc = getEmptyOnboardingDocument('uid-1');
    expect(doc.uid).toBe('uid-1');
    expect(doc.status).toBe('not_started');
    expect(doc.currentStep).toBe(0);
    expect(doc.primaryCountry).toBeNull();
    expect(doc.selectedAssetClasses).toEqual([]);
  });
});
