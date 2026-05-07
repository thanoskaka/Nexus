import { ALLOWED_COUNTRIES, COUNTRY_CURRENCY_MAP, type OnboardingCountry } from '../../lib/onboardingConfig.js';

export const ONBOARDING_COLLECTION = 'user_onboarding';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface OnboardingMember {
  email: string;
  role: 'owner' | 'partner';
}

export interface OnboardingProviderSelection {
  providerId: string;
  enabled: boolean;
  config?: Record<string, string>;
}

export interface OnboardingIntegrationSelection {
  integrationId: string;
  enabled: boolean;
  config?: Record<string, string>;
}

export interface OnboardingDocument {
  uid: string;
  status: OnboardingStatus;
  currentStep: number;
  primaryCountry: string | null;
  primaryCurrency: string | null;
  secondaryCountry: string | null;
  secondaryCurrency: string | null;
  selectedAssetClasses: string[];
  providerSelections: OnboardingProviderSelection[];
  integrationSelections: OnboardingIntegrationSelection[];
  members: OnboardingMember[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface OnboardingResponse {
  onboarding: OnboardingDocument | null;
}

export type OnboardingPutBody = Partial<{
  currentStep: number;
  primaryCountry: string;
  primaryCurrency: string;
  secondaryCountry: string;
  secondaryCurrency: string;
  selectedAssetClasses: string[];
  providerSelections: OnboardingProviderSelection[];
  integrationSelections: OnboardingIntegrationSelection[];
  members: OnboardingMember[];
}>;

const ALLOWED_CURRENCIES = ['USD', 'CAD', 'INR'];
const ALLOWED_ROLES = ['owner', 'partner'];

export function validateOnboardingInput(body: OnboardingPutBody): string | null {
  if (body.primaryCountry !== undefined) {
    if (!ALLOWED_COUNTRIES.includes(body.primaryCountry as OnboardingCountry)) {
      return 'Invalid primary country. Allowed: US, CA, IN.';
    }
    const expectedCurrency = COUNTRY_CURRENCY_MAP[body.primaryCountry as OnboardingCountry];
    if (body.primaryCurrency !== undefined && body.primaryCurrency !== expectedCurrency) {
      return `Primary currency must be ${expectedCurrency} for ${body.primaryCountry}.`;
    }
  }

  if (body.primaryCurrency !== undefined && body.primaryCountry === undefined) {
    if (!ALLOWED_CURRENCIES.includes(body.primaryCurrency)) {
      return 'Invalid primary currency.';
    }
  }

  if (body.secondaryCountry !== undefined && body.secondaryCountry !== null) {
    if (!ALLOWED_COUNTRIES.includes(body.secondaryCountry as OnboardingCountry)) {
      return 'Invalid secondary country. Allowed: US, CA, IN.';
    }
    if (body.secondaryCountry === body.primaryCountry) {
      return 'Secondary country must differ from primary country.';
    }
    const expectedCurrency = COUNTRY_CURRENCY_MAP[body.secondaryCountry as OnboardingCountry];
    if (body.secondaryCurrency !== undefined && body.secondaryCurrency !== expectedCurrency) {
      return `Secondary currency must be ${expectedCurrency} for ${body.secondaryCountry}.`;
    }
  }

  if (body.secondaryCurrency !== undefined && body.secondaryCountry === undefined) {
    if (body.secondaryCurrency !== null && !ALLOWED_CURRENCIES.includes(body.secondaryCurrency)) {
      return 'Invalid secondary currency.';
    }
  }

  if (body.currentStep !== undefined) {
    if (typeof body.currentStep !== 'number' || body.currentStep < 0 || !Number.isInteger(body.currentStep)) {
      return 'currentStep must be a non-negative integer.';
    }
  }

  if (body.selectedAssetClasses !== undefined) {
    if (!Array.isArray(body.selectedAssetClasses)) {
      return 'selectedAssetClasses must be an array.';
    }
  }

  if (body.providerSelections !== undefined) {
    if (!Array.isArray(body.providerSelections)) {
      return 'providerSelections must be an array.';
    }
  }

  if (body.integrationSelections !== undefined) {
    if (!Array.isArray(body.integrationSelections)) {
      return 'integrationSelections must be an array.';
    }
  }

  if (body.members !== undefined) {
    if (!Array.isArray(body.members)) {
      return 'members must be an array.';
    }
    for (const m of body.members) {
      if (!m.email || !ALLOWED_ROLES.includes(m.role)) {
        return 'Each member must have a valid email and role (owner or partner).';
      }
    }
  }

  return null;
}

export function getEmptyOnboardingDocument(uid: string): OnboardingDocument {
  const now = Date.now();
  return {
    uid,
    status: 'not_started',
    currentStep: 0,
    primaryCountry: null,
    primaryCurrency: null,
    secondaryCountry: null,
    secondaryCurrency: null,
    selectedAssetClasses: [],
    providerSelections: [],
    integrationSelections: [],
    members: [],
    createdAt: now,
    updatedAt: now,
  };
}
