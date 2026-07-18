// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Ledger } from './Ledger';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUsePortfolio = vi.hoisted(() => vi.fn());
const mockUseSampleMode = vi.hoisted(() => vi.fn());

vi.mock('../store/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../store/PortfolioContext', () => ({ usePortfolio: mockUsePortfolio, getBulkRefreshRowStatus: vi.fn(() => 'idle') }));
vi.mock('../lib/samplePortfolio', () => ({ useSampleMode: mockUseSampleMode }));

const mockAssets = [
  { id: 'a1', name: 'VTI', ticker: 'VTI', quantity: 10, costBasis: 2600, currency: 'USD', owner: 'Alice', country: 'Canada', assetClass: 'Stocks', autoUpdate: true, currentPrice: 275.5, priceFetchStatus: 'success', priceProvider: 'yahoo' },
  { id: 'a2', name: 'HDFC Bank', ticker: 'NSE:HDFCBANK', quantity: 4, costBasis: 600, currency: 'INR', owner: 'Bob', country: 'India', assetClass: 'Stocks', autoUpdate: true, currentPrice: 160, priceFetchStatus: 'success', priceProvider: 'yahoo' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { uid: 'test', email: 'test@test.com', displayName: 'Test' }, loading: false, authError: null });
  mockUsePortfolio.mockReturnValue({
    assets: mockAssets, assetClasses: [], baseCurrency: 'ORIGINAL', rates: {},
    priceProviderSettings: { alphaVantageApiKey: '', finnhubApiKey: '', primaryProvider: 'yahoo', secondaryProvider: 'alphavantage' },
    removeAsset: vi.fn(), duplicateAsset: vi.fn(), refreshAsset: vi.fn(),
    refreshPrices: vi.fn(), refreshFailedPrices: vi.fn(), isRefreshing: false,
    refreshQueue: { pendingCount: 0, isProcessing: false }, bulkRefreshState: null,
  });
  mockUseSampleMode.mockReturnValue({ isSampleMode: false, sampleData: { assets: [], assetClasses: [], members: [], rates: {} }, toggleSampleMode: vi.fn() });
});
describe('Ledger filters', () => {
  it('renders member chips', () => {
    render(<Ledger />);
    expect(screen.getByRole('button', { name: 'Both' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });

  it('shows no pricing filter section', () => {
    render(<Ledger />);
    const buttons = screen.getAllByRole('button');
    const livePriceChips = buttons.filter((b) => b.textContent === 'Live Price');
    expect(livePriceChips.length).toBe(0);
  });

  it('shows clear-filters when search entered and clears on click', async () => {
    const user = userEvent.setup();
    render(<Ledger />);
    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
    const input = screen.getByPlaceholderText('Search asset, ticker, platform, comments...');
    await user.type(input, 'VTI');
    await waitFor(() => {
      expect(screen.getByText('Clear all filters')).toBeInTheDocument();
    }, { timeout: 3000 });
    await user.click(screen.getByText('Clear all filters'));
    await waitFor(() => {
      expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders sticky thead', () => {
    render(<Ledger />);
    const theads = document.querySelectorAll('thead');
    expect(theads.length).toBeGreaterThanOrEqual(1);
    theads.forEach((t) => expect(t.className).toContain('sticky'));
  });

  it('collapses an asset-class group without hiding its subtotal context', async () => {
    const user = userEvent.setup();
    render(<Ledger />);

    expect(screen.getAllByText('VTI').length).toBeGreaterThan(0);
    const canadaStocksToggle = screen.getAllByRole('button', { name: /Stocks.*Collapse/i })[0];
    await user.click(canadaStocksToggle);

    const canadaSection = screen.getByText('Canada Assets').closest('section');
    expect(canadaSection).not.toBeNull();
    expect(within(canadaSection as HTMLElement).queryByText('VTI')).not.toBeInTheDocument();
    expect(within(canadaSection as HTMLElement).getByText('Stocks total')).toBeInTheDocument();
  });

  it('shows India holdings in their source currency', () => {
    render(<Ledger />);
    expect(screen.getAllByText('₹640.00').length).toBeGreaterThan(0);
  });
});
