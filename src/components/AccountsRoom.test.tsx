// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { buildHouseholdFinanceBaseline } from '../lib/householdFinance';
import type { Asset } from '../store/db';

const mockUsePortfolio = vi.hoisted(() => vi.fn());

vi.mock('../store/PortfolioContext', () => ({ usePortfolio: mockUsePortfolio }));

import { AccountsRoom } from './AccountsRoom';

const assets: Asset[] = [
  { id: 'tfsa', name: 'VFV', ticker: 'VFV:TO', quantity: 10, costBasis: 1200, currency: 'CAD', owner: 'Alex', country: 'Canada', assetClass: 'TFSA ETF', autoUpdate: true, currentPrice: 130, holdingPlatform: 'RBC Direct Investing' },
  { id: 'credit', name: 'CIBC Visa', quantity: 1, costBasis: 900, currency: 'CAD', owner: 'Alex', country: 'Canada', assetClass: 'Credit Card', autoUpdate: false, currentPrice: 900, holdingPlatform: 'CIBC' },
  { id: 'ppf', name: 'PPF Account', quantity: 1, costBasis: 200000, currency: 'INR', owner: 'Alex', country: 'India', assetClass: 'Fixed Income', autoUpdate: false, currentPrice: 220000, holdingPlatform: 'India Post' },
];

const members = [{ email: 'alex@example.com', role: 'owner' as const }];
const finance = buildHouseholdFinanceBaseline({ assets, members, now: 1 });

describe('AccountsRoom', () => {
  beforeEach(() => {
    mockUsePortfolio.mockReturnValue({
      assets,
      members,
      currentUserRole: 'owner',
      householdFinance: finance,
      householdFinancePreview: finance,
      initializeHouseholdFinance: vi.fn(async () => {}),
      refreshHouseholdFinance: vi.fn(async () => {}),
      linkFinancePerson: vi.fn(async () => {}),
      upsertContributionRoom: vi.fn(async () => {}),
      recordContributionEvent: vi.fn(async () => {}),
    });
  });

  it('combines accounts, liabilities, and room programs without a table', () => {
    render(<AccountsRoom mode="accounts" embedded />);

    expect(screen.getByText('Accounts, liabilities & contribution room')).toBeInTheDocument();
    expect(screen.getByText('Liabilities')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Credit \/ loan CIBC/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /TFSA 2026/ })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reveals less-common programs only when requested', () => {
    render(<AccountsRoom mode="accounts" embedded />);

    expect(screen.queryByRole('button', { name: /RDSP/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show .* more programs/ }));
    expect(screen.getByRole('button', { name: /RDSP/ })).toBeInTheDocument();
  });

  it('opens a selected contribution program in the detail editor', () => {
    render(<AccountsRoom mode="accounts" embedded />);

    fireEvent.click(screen.getByRole('button', { name: /TFSA 2026/ }));
    expect(screen.getByRole('button', { name: 'Room balance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record activity' })).toBeInTheDocument();
    expect(screen.getByLabelText('Opening available room')).toBeInTheDocument();
  });
});
