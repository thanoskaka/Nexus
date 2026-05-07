import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Globe, Wallet, X, Users, PieChart, Sliders, Link2, ClipboardCheck, Loader2, Save, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import {
  ALLOWED_COUNTRIES,
  COUNTRY_CURRENCY_MAP,
  COUNTRY_LABELS,
  CURRENCY_LABELS,
  getAssetClassesForCountry,
  getProvidersForSelections,
  getIntegrationsForSelections,
  PRICING_PROVIDERS,
  type OnboardingCountry,
  type AssetClassOption,
  type ProviderOption,
  type IntegrationOption,
} from '../lib/onboardingConfig';
import {
  getOnboardingState,
  saveOnboardingStep,
  completeOnboarding,
} from '../lib/onboardingApi';
import type {
  OnboardingDocument,
  OnboardingMember,
  OnboardingProviderSelection,
  OnboardingIntegrationSelection,
} from '../server/user/onboardingTypes';

const STEPS = [
  { id: 'primary-country', title: 'Primary Country', description: 'Choose your primary country and currency' },
  { id: 'secondary-country', title: 'Secondary Country', description: 'Add a secondary country (optional)' },
  { id: 'asset-classes', title: 'Asset Classes', description: 'Select the asset classes you track' },
  { id: 'providers', title: 'Pricing Providers', description: 'Configure price data providers' },
  { id: 'integrations', title: 'Integrations', description: 'Connect your brokerage and data sources' },
  { id: 'members', title: 'Family Members', description: 'Add family members to your portfolio' },
  { id: 'review', title: 'Review & Finish', description: 'Review your selections before finishing' },
];

interface WizardFormState {
  primaryCountry: string;
  primaryCurrency: string;
  secondaryCountry: string;
  secondaryCurrency: string;
  selectedAssetClasses: string[];
  providerSelections: OnboardingProviderSelection[];
  integrationSelections: OnboardingIntegrationSelection[];
  members: OnboardingMember[];
}

type WizardAction =
  | { type: 'SET_PRIMARY_COUNTRY'; value: string }
  | { type: 'SET_SECONDARY_COUNTRY'; value: string }
  | { type: 'TOGGLE_ASSET_CLASS'; value: string }
  | { type: 'TOGGLE_PROVIDER'; value: string }
  | { type: 'SET_PROVIDER_CONFIG'; providerId: string; config: Record<string, string> }
  | { type: 'TOGGLE_INTEGRATION'; value: string }
  | { type: 'ADD_MEMBER' }
  | { type: 'REMOVE_MEMBER'; index: number }
  | { type: 'SET_MEMBER_EMAIL'; index: number; email: string }
  | { type: 'SET_MEMBER_ROLE'; index: number; role: 'owner' | 'partner' }
  | { type: 'LOAD_SERVER_STATE'; state: WizardFormState; currentStep: number };

function wizardReducer(state: WizardFormState, action: WizardAction): WizardFormState {
  switch (action.type) {
    case 'SET_PRIMARY_COUNTRY': {
      const country = action.value;
      const currency = COUNTRY_CURRENCY_MAP[country as OnboardingCountry] || '';
      return {
        ...state,
        primaryCountry: country,
        primaryCurrency: currency,
        secondaryCountry: state.secondaryCountry === country ? '' : state.secondaryCountry,
        secondaryCurrency: state.secondaryCountry === country ? '' : state.secondaryCurrency,
        selectedAssetClasses: [],
        providerSelections: [],
        integrationSelections: [],
      };
    }
    case 'SET_SECONDARY_COUNTRY': {
      const country = action.value;
      const currency = country ? (COUNTRY_CURRENCY_MAP[country as OnboardingCountry] || '') : '';
      return {
        ...state,
        secondaryCountry: country,
        secondaryCurrency: currency,
        selectedAssetClasses: state.selectedAssetClasses.filter((id) => {
          if (!country) return true;
          const classes = getAssetClassesForCountry(country).map((c) => c.id);
          return !classes.includes(id);
        }),
      };
    }
    case 'TOGGLE_ASSET_CLASS': {
      const id = action.value;
      const has = state.selectedAssetClasses.includes(id);
      return {
        ...state,
        selectedAssetClasses: has
          ? state.selectedAssetClasses.filter((x) => x !== id)
          : [...state.selectedAssetClasses, id],
      };
    }
    case 'TOGGLE_PROVIDER': {
      const id = action.value;
      const has = state.providerSelections.find((p) => p.providerId === id);
      return {
        ...state,
        providerSelections: has
          ? state.providerSelections.filter((p) => p.providerId !== id)
          : [...state.providerSelections, { providerId: id, enabled: true }],
      };
    }
    case 'SET_PROVIDER_CONFIG': {
      return {
        ...state,
        providerSelections: state.providerSelections.map((p) =>
          p.providerId === action.providerId ? { ...p, config: action.config } : p,
        ),
      };
    }
    case 'TOGGLE_INTEGRATION': {
      const id = action.value;
      const has = state.integrationSelections.find((i) => i.integrationId === id);
      return {
        ...state,
        integrationSelections: has
          ? state.integrationSelections.filter((i) => i.integrationId !== id)
          : [...state.integrationSelections, { integrationId: id, enabled: true }],
      };
    }
    case 'ADD_MEMBER':
      return {
        ...state,
        members: [...state.members, { email: '', role: 'partner' }],
      };
    case 'REMOVE_MEMBER':
      return {
        ...state,
        members: state.members.filter((_, i) => i !== action.index),
      };
    case 'SET_MEMBER_EMAIL':
      return {
        ...state,
        members: state.members.map((m, i) =>
          i === action.index ? { ...m, email: action.email } : m,
        ),
      };
    case 'SET_MEMBER_ROLE':
      return {
        ...state,
        members: state.members.map((m, i) =>
          i === action.index ? { ...m, role: action.role } : m,
        ),
      };
    case 'LOAD_SERVER_STATE':
      return action.state;
    default:
      return state;
  }
}

const INITIAL_FORM: WizardFormState = {
  primaryCountry: '',
  primaryCurrency: '',
  secondaryCountry: '',
  secondaryCurrency: '',
  selectedAssetClasses: [],
  providerSelections: [],
  integrationSelections: [],
  members: [],
};

function getCountriesWithout(country: string): string[] {
  return ALLOWED_COUNTRIES.filter((c) => c !== country);
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onLogout?: () => void;
}

export function OnboardingWizard({ onComplete, onLogout }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, dispatch] = useReducer(wizardReducer, INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [memberErrors, setMemberErrors] = useState<Record<number, string>>({});
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    setLoading(true);
    void getOnboardingState()
      .then((state) => {
        if (state) {
          const serverForm: WizardFormState = {
            primaryCountry: state.primaryCountry || '',
            primaryCurrency: state.primaryCurrency || '',
            secondaryCountry: state.secondaryCountry || '',
            secondaryCurrency: state.secondaryCurrency || '',
            selectedAssetClasses: state.selectedAssetClasses || [],
            providerSelections: state.providerSelections || [],
            integrationSelections: state.integrationSelections || [],
            members: state.members || [],
          };
          dispatch({ type: 'LOAD_SERVER_STATE', state: serverForm, currentStep: state.currentStep });
          setCurrentStep(state.currentStep);
        }
      })
      .catch((err) => {
        setServerError(err instanceof Error ? err.message : 'Failed to load onboarding state');
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSteps = STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const allCountries = useMemo(() => {
    const countries = [...ALLOWED_COUNTRIES];
    if (form.primaryCountry) {
      return getCountriesWithout(form.primaryCountry);
    }
    return countries;
  }, [form.primaryCountry]);

  const relevantAssetClasses = useMemo(() => {
    const classes: AssetClassOption[] = [];
    if (form.primaryCountry) {
      classes.push(...getAssetClassesForCountry(form.primaryCountry));
    }
    if (form.secondaryCountry) {
      classes.push(...getAssetClassesForCountry(form.secondaryCountry));
    }
    return classes;
  }, [form.primaryCountry, form.secondaryCountry]);

  const relevantProviders = useMemo(() => {
    const countries = [form.primaryCountry, form.secondaryCountry].filter(Boolean);
    return getProvidersForSelections(countries, form.selectedAssetClasses);
  }, [form.primaryCountry, form.secondaryCountry, form.selectedAssetClasses]);

  const relevantIntegrations = useMemo(() => {
    const countries = [form.primaryCountry, form.secondaryCountry].filter(Boolean);
    return getIntegrationsForSelections(countries, form.selectedAssetClasses);
  }, [form.primaryCountry, form.secondaryCountry, form.selectedAssetClasses]);

  const stepErrors = useMemo(() => {
    const errors: string[] = [];

    if (!form.primaryCountry) errors.push('Please select a primary country.');
    if (!form.primaryCurrency) errors.push('Primary currency is required.');

    return errors;
  }, [form.primaryCountry, form.primaryCurrency]);

  const hasStepError = useMemo(() => {
    switch (currentStep) {
      case 0:
        return !form.primaryCountry;
      case 2:
        return form.selectedAssetClasses.length === 0;
      case 5:
        return form.members.some((m) => !isValidEmail(m.email));
      default:
        return false;
    }
  }, [currentStep, form.primaryCountry, form.selectedAssetClasses, form.members]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setServerError(null);
    try {
      await saveOnboardingStep({
        currentStep,
        primaryCountry: form.primaryCountry || undefined,
        primaryCurrency: form.primaryCurrency || undefined,
        secondaryCountry: form.secondaryCountry || undefined,
        secondaryCurrency: form.secondaryCurrency || undefined,
        selectedAssetClasses: form.selectedAssetClasses,
        providerSelections: form.providerSelections,
        integrationSelections: form.integrationSelections,
        members: form.members,
      });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [currentStep, form]);

  const handleNext = useCallback(async () => {
    if (currentStep === 5) {
      const errors: Record<number, string> = {};
      form.members.forEach((m, i) => {
        if (!isValidEmail(m.email)) errors[i] = 'Invalid email address.';
      });
      setMemberErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }

    await handleSave();
    if (!serverError) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  }, [currentStep, form, handleSave, serverError, totalSteps]);

  const handlePrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleFinish = useCallback(async () => {
    setCompleting(true);
    setServerError(null);
    try {
      await handleSave();
      await completeOnboarding();
      onComplete();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setCompleting(false);
    }
  }, [handleSave, onComplete]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#00875A]" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading your setup...</p>
        </div>
      </div>
    );
  }

  if (serverError && !form.primaryCountry && currentStep === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-slate-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to load setup</CardTitle>
            <CardDescription>{serverError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00875A] rounded-lg flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">Nexus Portfolio Setup</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{currentStep + 1} of {totalSteps}</span>
            {onLogout && (
              <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div className="h-1 bg-[#00875A] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  i < currentStep
                    ? 'bg-[#00875A] text-white'
                    : i === currentStep
                    ? 'bg-[#00875A]/10 text-[#00875A] border-2 border-[#00875A]'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}>
                  {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`h-0.5 flex-1 ${i < currentStep ? 'bg-[#00875A]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">{STEPS[currentStep].title}</CardTitle>
            <CardDescription>{STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && renderPrimaryCountryStep(form, dispatch)}
            {currentStep === 1 && renderSecondaryCountryStep(form, dispatch, allCountries)}
            {currentStep === 2 && renderAssetClassesStep(form, dispatch, relevantAssetClasses)}
            {currentStep === 3 && renderProvidersStep(form, dispatch, relevantProviders)}
            {currentStep === 4 && renderIntegrationsStep(form, dispatch, relevantIntegrations)}
            {currentStep === 5 && renderMembersStep(form, dispatch, memberErrors)}
            {currentStep === 6 && renderReviewStep(form)}

            {serverError && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg p-3">
                {serverError}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {(currentStep === 1 || currentStep === 5) && (
              <Button variant="ghost" size="sm" onClick={handleNext} className="text-slate-500">
                Skip
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-slate-500"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
            {!isLastStep ? (
              <Button onClick={handleNext} disabled={hasStepError || saving}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={completing}
                className="bg-[#00875A] hover:bg-emerald-700 text-white"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                )}
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function renderPrimaryCountryStep(
  form: WizardFormState,
  dispatch: React.Dispatch<WizardAction>,
) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Where do you primarily reside?
        </label>
        <Select
          value={form.primaryCountry}
          onChange={(e) => dispatch({ type: 'SET_PRIMARY_COUNTRY', value: e.target.value })}
          aria-label="Primary country"
        >
          <option value="">Select a country</option>
          {ALLOWED_COUNTRIES.map((c) => (
            <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>
          ))}
        </Select>
      </div>

      {form.primaryCountry && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {COUNTRY_LABELS[form.primaryCountry as OnboardingCountry]}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Currency auto-set: {CURRENCY_LABELS[form.primaryCurrency as keyof typeof CURRENCY_LABELS] || form.primaryCurrency}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your primary country determines the base currency for your portfolio. Asset classes, pricing providers, and integrations will be suggested based on this selection.
        </p>
      </div>
    </div>
  );
}

function renderSecondaryCountryStep(
  form: WizardFormState,
  dispatch: React.Dispatch<WizardAction>,
  availableCountries: string[],
) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Do you track assets in another country? (optional)
        </label>
        <Select
          value={form.secondaryCountry}
          onChange={(e) => dispatch({ type: 'SET_SECONDARY_COUNTRY', value: e.target.value })}
          aria-label="Secondary country"
        >
          <option value="">None (skip)</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>{COUNTRY_LABELS[c as OnboardingCountry]}</option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-slate-400">
          Secondary country cannot be the same as your primary country.
        </p>
      </div>

      {form.secondaryCountry && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950 p-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
                {COUNTRY_LABELS[form.secondaryCountry as OnboardingCountry]}
              </p>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">
                Currency auto-set: {CURRENCY_LABELS[form.secondaryCurrency as keyof typeof CURRENCY_LABELS] || form.secondaryCurrency}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Adding a secondary country lets you track assets denominated in another currency. You can skip this step and configure it later.
        </p>
      </div>
    </div>
  );
}

function renderAssetClassesStep(
  form: WizardFormState,
  dispatch: React.Dispatch<WizardAction>,
  assetClasses: AssetClassOption[],
) {
  const countries = [form.primaryCountry, form.secondaryCountry].filter(Boolean);
  const grouped = countries.reduce<Record<string, AssetClassOption[]>>((acc, country) => {
    acc[country] = getAssetClassesForCountry(country);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([country, classes]) => (
        <div key={country}>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {COUNTRY_LABELS[country as OnboardingCountry]}
          </h4>
          <div className="space-y-2">
            {classes.map((ac) => (
              <label
                key={ac.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  form.selectedAssetClasses.includes(ac.id)
                    ? 'border-[#00875A] bg-[#00875A]/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.selectedAssetClasses.includes(ac.id)}
                  onChange={() => dispatch({ type: 'TOGGLE_ASSET_CLASS', value: ac.id })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{ac.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{ac.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      {assetClasses.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          Select at least one country to see available asset classes.
        </p>
      )}
    </div>
  );
}

function renderProvidersStep(
  form: WizardFormState,
  dispatch: React.Dispatch<WizardAction>,
  providers: ProviderOption[],
) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Based on your selections, we recommend these pricing providers. Enable the ones you want to use.
      </p>

      {providers.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          No specific provider recommendations for your current selections. You can configure providers later in Settings.
        </p>
      )}

      {providers.map((provider) => {
        const selected = form.providerSelections.find((p) => p.providerId === provider.id);
        return (
          <div key={provider.id} className={`rounded-lg border p-4 transition-colors ${
            selected ? 'border-[#00875A] bg-[#00875A]/5' : 'border-slate-200 dark:border-slate-700'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selected}
                onChange={() => dispatch({ type: 'TOGGLE_PROVIDER', value: provider.id })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{provider.name}</p>
                  {provider.isRecommended && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{provider.description}</p>
              </div>
            </label>
          </div>
        );
      })}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You can always configure or change pricing providers later in Settings.
        </p>
      </div>
    </div>
  );
}

function renderIntegrationsStep(
  form: WizardFormState,
  dispatch: React.Dispatch<WizardAction>,
  integrations: IntegrationOption[],
) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Based on your selections, these integrations are available. Enable the ones you want to set up.
      </p>

      {integrations.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          No specific integrations for your current selections. You can configure integrations later.
        </p>
      )}

      {integrations.map((integration) => {
        const selected = form.integrationSelections.find((i) => i.integrationId === integration.id);
        return (
          <div key={integration.id} className={`rounded-lg border p-4 transition-colors ${
            selected ? 'border-[#00875A] bg-[#00875A]/5' : 'border-slate-200 dark:border-slate-700'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selected}
                onChange={() => dispatch({ type: 'TOGGLE_INTEGRATION', value: integration.id })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{integration.name}</p>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {integration.providerType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{integration.description}</p>
              </div>
            </label>
          </div>
        );
      })}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Integrations can be configured later in Settings &gt; Integrations.
        </p>
      </div>
    </div>
  );
}

function renderMembersStep(
  form: WizardFormState,
  dispatch: React.Dispatch<WizardAction>,
  memberErrors: Record<number, string>,
) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Add family members to share this portfolio. They will be able to view and manage assets based on their role.
      </p>

      {form.members.map((member, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <Input
              value={member.email}
              onChange={(e) => dispatch({ type: 'SET_MEMBER_EMAIL', index, email: e.target.value })}
              placeholder="member@example.com"
              aria-label={`Member ${index + 1} email`}
              className={memberErrors[index] ? 'border-red-400' : ''}
            />
            {memberErrors[index] && (
              <p className="text-xs text-red-500">{memberErrors[index]}</p>
            )}
          </div>
          <Select
            value={member.role}
            onChange={(e) => dispatch({ type: 'SET_MEMBER_ROLE', index, role: e.target.value as 'owner' | 'partner' })}
            aria-label={`Member ${index + 1} role`}
            className="w-28"
          >
            <option value="partner">Partner</option>
            <option value="owner">Owner</option>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch({ type: 'REMOVE_MEMBER', index })}
            className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-500"
            aria-label={`Remove member ${index + 1}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'ADD_MEMBER' })}>
        <Users className="h-4 w-4 mr-1" />
        Add Member
      </Button>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50 space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Roles</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            <strong>Owner:</strong> Full access to manage assets, settings, and members.
          </p>
          <p className="text-xs text-slate-500">
            <strong>Partner:</strong> Can view and manage assets but cannot modify settings or members.
          </p>
        </div>
      </div>
    </div>
  );
}

function renderReviewStep(form: WizardFormState) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Review your selections before finishing setup
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Countries & Currencies</h4>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p>Primary: {form.primaryCountry ? `${COUNTRY_LABELS[form.primaryCountry as OnboardingCountry]} (${form.primaryCurrency})` : 'Not set'}</p>
            <p>Secondary: {form.secondaryCountry ? `${COUNTRY_LABELS[form.secondaryCountry as OnboardingCountry]} (${form.secondaryCurrency})` : 'None'}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Asset Classes ({form.selectedAssetClasses.length})</h4>
          <div className="flex flex-wrap gap-2">
            {form.selectedAssetClasses.length === 0 ? (
              <p className="text-sm text-slate-500">None selected</p>
            ) : (
              form.selectedAssetClasses.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#00875A]/10 px-2.5 py-1 text-xs font-medium text-[#00875A]">
                  <PieChart className="h-3 w-3" />
                  {id.split('-').slice(1).join(' ')}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Pricing Providers ({form.providerSelections.length})</h4>
          <div className="flex flex-wrap gap-2">
            {form.providerSelections.length === 0 ? (
              <p className="text-sm text-slate-500">None selected</p>
            ) : (
              form.providerSelections.map((p) => (
                <span key={p.providerId} className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                  <Sliders className="h-3 w-3" />
                  {PRICING_PROVIDERS.find((pp) => pp.id === p.providerId)?.name || p.providerId}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Integrations ({form.integrationSelections.length})</h4>
          <div className="flex flex-wrap gap-2">
            {form.integrationSelections.length === 0 ? (
              <p className="text-sm text-slate-500">None selected</p>
            ) : (
              form.integrationSelections.map((i) => (
                <span key={i.integrationId} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  <Link2 className="h-3 w-3" />
                  {i.integrationId}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Family Members ({form.members.length})</h4>
          {form.members.length === 0 ? (
            <p className="text-sm text-slate-500">No members added</p>
          ) : (
            <div className="space-y-1">
              {form.members.map((m, i) => (
                <p key={i} className="text-sm text-slate-600 dark:text-slate-400">
                  {m.email} — {m.role}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          You can change all of these settings later from the Settings page.
        </p>
      </div>
    </div>
  );
}
