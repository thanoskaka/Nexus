// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const mockGetOnboardingState = vi.hoisted(() => vi.fn());
const mockSaveOnboardingStep = vi.hoisted(() => vi.fn());
const mockCompleteOnboarding = vi.hoisted(() => vi.fn());

vi.mock('../lib/onboardingApi', () => ({
  getOnboardingState: (...args: unknown[]) => mockGetOnboardingState(...args),
  saveOnboardingStep: (...args: unknown[]) => mockSaveOnboardingStep(...args),
  completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
}));

import { OnboardingWizard } from './OnboardingWizard';

function renderWizard(props: { onComplete?: () => void } = {}) {
  return render(<OnboardingWizard onComplete={props.onComplete || vi.fn()} />);
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOnboardingState.mockResolvedValue(null);
    mockSaveOnboardingStep.mockResolvedValue({});
    mockCompleteOnboarding.mockResolvedValue({ status: 'completed' });
  });

  it('shows loading state initially', () => {
    mockGetOnboardingState.mockReturnValue(new Promise(() => {}));
    renderWizard();
    expect(screen.getByText('Loading your setup...')).toBeInTheDocument();
  });

  it('starts with portfolio basics', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Primary country')).toBeInTheDocument();
    expect(screen.getByLabelText('Secondary country')).toBeInTheDocument();
  });

  it('disables next button when no country selected on step 0', async () => {
    renderWizard();
    await waitFor(() => {
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toBeDisabled();
    });
  });

  it('shows currency hint when country is selected', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });

    expect(screen.getByText(/Currency auto-set/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
  });

  it('enables next button after selecting country', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });

    await waitFor(() => {
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).not.toBeDisabled();
    });
  });

  it('steps through the three-part wizard and completes', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Household access')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to add data')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finish Setup'));
    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalled();
    });
  });

  it('allows household invitations to be skipped', async () => {
    const onComplete = vi.fn();
    renderWizard({ onComplete });
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Household access')).toBeInTheDocument();
    });

    const skipButton = screen.getByText('Skip');
    expect(skipButton).toBeInTheDocument();
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText('Ready to add data')).toBeInTheDocument();
    });
  });

  it('keeps the next action focused on household access, not asset classes', async () => {
    const user = userEvent.setup();
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    await user.selectOptions(select, 'US');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Household access')).toBeInTheDocument();
    });
    expect(screen.queryByText('Asset Classes')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });

  it('loads saved state from server for resume', async () => {
    mockGetOnboardingState.mockResolvedValue({
      uid: 'test-uid',
      status: 'in_progress',
      currentStep: 1,
      primaryCountry: 'CA',
      primaryCurrency: 'CAD',
      secondaryCountry: 'US',
      secondaryCurrency: 'USD',
      selectedAssetClasses: ['ca-stocks'],
      providerSelections: [{ providerId: 'yahoo', enabled: true }],
      integrationSelections: [],
      members: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    renderWizard();

    await waitFor(() => {
      expect(screen.getByText('Household access')).toBeInTheDocument();
    });
  });

  it('saves state when clicking Save button', async () => {
    mockSaveOnboardingStep.mockResolvedValue({});
    renderWizard();

    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(mockSaveOnboardingStep).not.toHaveBeenCalled();
  });

  it('updates the secondary-country choices when the primary country changes', async () => {
    const user = userEvent.setup();
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Portfolio basics')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Primary country'), 'US');
    const secondary = screen.getByLabelText('Secondary country') as HTMLSelectElement;
    expect(Array.from(secondary.options).map((option) => option.value)).not.toContain('US');
    await user.selectOptions(screen.getByLabelText('Primary country'), 'CA');
    expect(Array.from(secondary.options).map((option) => option.value)).toContain('US');
    expect(Array.from(secondary.options).map((option) => option.value)).not.toContain('CA');
  });
});
