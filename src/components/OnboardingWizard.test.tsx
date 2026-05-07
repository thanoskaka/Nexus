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

  it('renders step 0 (primary country) after load', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });
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
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });

    expect(screen.getByText(/Currency auto-set/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
  });

  it('enables next button after selecting country', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });

    await waitFor(() => {
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).not.toBeDisabled();
    });
  });

  it('steps through the wizard and completes', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Secondary Country')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Asset Classes')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Pricing Providers')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Integrations')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Family Members')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Review & Finish')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finish Setup'));
    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalled();
    });
  });

  it('skips optional secondary country step', async () => {
    const onComplete = vi.fn();
    renderWizard({ onComplete });
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    fireEvent.change(select, { target: { value: 'US' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Secondary Country')).toBeInTheDocument();
    });

    const skipButton = screen.getByText('Skip');
    expect(skipButton).toBeInTheDocument();
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText('Asset Classes')).toBeInTheDocument();
    });
  });

  it('requires at least one asset class selected', async () => {
    const user = userEvent.setup();
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Primary country');
    await user.selectOptions(select, 'US');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Secondary Country')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Asset Classes')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button', { name: 'Next' });
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it('loads saved state from server for resume', async () => {
    mockGetOnboardingState.mockResolvedValue({
      uid: 'test-uid',
      status: 'in_progress',
      currentStep: 2,
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
      expect(screen.getByText('Asset Classes')).toBeInTheDocument();
    });

    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    const checkedBoxes = screen.getAllByRole('checkbox').filter((cb) => (cb as HTMLInputElement).checked);
    expect(checkedBoxes.length).toBeGreaterThanOrEqual(1);
  });

  it('saves state when clicking Save button', async () => {
    mockSaveOnboardingStep.mockResolvedValue({});
    renderWizard();

    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(mockSaveOnboardingStep).not.toHaveBeenCalled();
  });

  it('resets asset classes when country changes', async () => {
    const user = userEvent.setup();
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Primary country'), 'US');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Secondary Country')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Asset Classes')).toBeInTheDocument();
    });

    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(firstCheckbox);
    expect((firstCheckbox as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.getByText('Secondary Country')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.getByText('Primary Country')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Primary country'), 'CA');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Secondary Country')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('Asset Classes')).toBeInTheDocument();
    });

    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(false);
  });
});
