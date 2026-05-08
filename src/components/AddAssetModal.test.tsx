// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddAssetModal } from './AddAssetModal';

const mockAddAsset = vi.fn();
const mockUpdateAsset = vi.fn();
const mockUsePortfolio = vi.fn();

vi.mock('../store/PortfolioContext', () => ({
  usePortfolio: () => mockUsePortfolio(),
}));

vi.mock('../lib/useInstrumentSearch', () => ({
  useInstrumentSearch: () => ({
    suggestions: [],
    loading: false,
    highlightedIndex: -1,
    setHighlightedIndex: vi.fn(),
    isOpen: false,
    setIsOpen: vi.fn(),
  }),
}));

vi.mock('../lib/assetClassBranding', () => ({
  AssetClassLogo: () => null,
}));

const onOpenChange = vi.fn();

function renderModal(props: { open?: boolean; assetToEdit?: any } = {}) {
  return render(
    <AddAssetModal
      open={props.open ?? true}
      onOpenChange={onOpenChange}
      assetToEdit={props.assetToEdit}
    />
  );
}

function mockDefaultPortfolio() {
  mockUsePortfolio.mockReturnValue({
    addAsset: mockAddAsset,
    updateAsset: mockUpdateAsset,
    assetClasses: [],
    assets: [],
    members: [
      { email: 'alice@test.com', role: 'owner' },
      { email: 'bob@test.com', role: 'partner' },
    ],
    priceProviderSettings: {
      alphaVantageApiKey: '',
      finnhubApiKey: '',
      primaryProvider: 'yahoo',
      secondaryProvider: 'alphavantage',
    },
  });
}

describe('AddAssetModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDefaultPortfolio();
  });

  describe('step progression', () => {
    it('renders step 1 by default', () => {
      renderModal();
      expect(screen.getByText('Choose Asset')).toBeTruthy();
    });

    it('shows step indicator for all 3 steps', () => {
      renderModal();
      expect(screen.getByText('Type & Name')).toBeTruthy();
      expect(screen.getByText('Details')).toBeTruthy();
      expect(screen.getByText('Review')).toBeTruthy();
    });

    it('disables Next button until step 1 fields are filled', () => {
      renderModal();
      const nextBtn = screen.getByText('Next');
      expect(nextBtn.closest('button')).toBeDisabled();
    });
  });

  describe('owner dropdown', () => {
    it('shows owner options from portfolio members', () => {
      renderModal();
      const ownerSelect = screen.getByDisplayValue('Select owner...');
      expect(ownerSelect).toBeTruthy();
      expect(screen.getByText('alice@test.com')).toBeTruthy();
      expect(screen.getByText('bob@test.com')).toBeTruthy();
    });

    it('does not include Joint as default option', () => {
      renderModal();
      expect(screen.queryByText('Joint')).toBeNull();
    });

    it('shows owner warning when editing asset with non-member owner', () => {
      renderModal({
        assetToEdit: {
          id: 'test-1',
          name: 'Legacy Asset',
          quantity: 10,
          costBasis: 100,
          currency: 'USD',
          owner: 'old-owner@test.com',
          country: 'Canada',
          assetClass: 'Stocks',
          autoUpdate: false,
        },
      });
      const items = screen.getAllByText(/old-owner@test\.com/);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/not a current portfolio member/)).toBeTruthy();
    });
  });

  describe('holding platform field', () => {
    it('shows Holding Platform label on step 2', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.selectOptions(screen.getByDisplayValue('Select owner...'), 'alice@test.com');
      await user.type(screen.getByPlaceholderText('Search by name or symbol...'), 'AAPL');

      const nextBtn = screen.getByText('Next');
      await user.click(nextBtn);

      expect(screen.getByText('Holding Platform')).toBeTruthy();
    });
  });

  describe('dynamic field rendering by type', () => {
    it('shows purchase details for Stocks on step 2', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.selectOptions(screen.getByDisplayValue('Select owner...'), 'alice@test.com');
      await user.type(screen.getByPlaceholderText('Search by name or symbol...'), 'AAPL');
      await user.click(screen.getByText('Next'));

      expect(screen.getByText('Purchase Details')).toBeTruthy();
    });

    it('shows amount field for Fixed Deposits on step 2', async () => {
      const user = userEvent.setup();

      mockUsePortfolio.mockReturnValue({
        addAsset: mockAddAsset,
        updateAsset: mockUpdateAsset,
        assetClasses: [{ id: 'test-fd', country: 'India', name: 'Fixed Deposits' }],
        assets: [],
        members: [
          { email: 'alice@test.com', role: 'owner' },
          { email: 'bob@test.com', role: 'partner' },
        ],
        priceProviderSettings: {
          alphaVantageApiKey: '',
          finnhubApiKey: '',
          primaryProvider: 'yahoo',
          secondaryProvider: 'alphavantage',
        },
      });
      renderModal();

      // Country must be set first (default is India with Mutual Funds -> resets to Credit Card)
      // Then set asset type after country change
      await user.selectOptions(screen.getAllByRole('combobox')[0], 'India');
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'Fixed Deposits');
      await user.selectOptions(screen.getAllByRole('combobox')[2], 'alice@test.com');
      await user.type(screen.getByPlaceholderText('Search by name or symbol...'), 'SBI FD');
      await user.click(screen.getByText('Next'));

      expect(screen.getByText(/amount \/ value/i)).toBeTruthy();
    });
  });
});
