import { describe, expect, it } from 'vitest';
import { buildPortfolioSnapshot } from './contextBuilder.js';
import { isPortfolioMember } from './portfolioAccess.js';

describe('buildPortfolioSnapshot', () => {
  it('summarizes totals and returns context summary', () => {
    const { snapshot, contextSummary } = buildPortfolioSnapshot({
      id: 'portfolio-1',
      name: 'Family Portfolio',
      primaryCurrency: 'CAD',
      assets: [
        {
          id: 'a1',
          name: 'Apple',
          ticker: 'aapl',
          quantity: 5,
          currentPrice: 100,
          costBasis: 420,
          currency: 'USD',
          assetClass: 'Stocks',
          country: 'Canada',
        },
        {
          id: 'a2',
          name: 'Cash',
          quantity: 10,
          currentPrice: 1,
          costBasis: 10,
          currency: 'CAD',
          assetClass: 'Cash',
          country: 'Canada',
        },
      ],
    });

    expect(snapshot.assetCount).toBe(2);
    expect(snapshot.totals.estimatedValueByCurrency).toEqual({ USD: 500, CAD: 10 });
    expect(snapshot.topAssets[0]?.name).toBe('Apple');
    expect(contextSummary).toContain('Family Portfolio');
    expect(contextSummary).toContain('2 assets');
  });
});

describe('isPortfolioMember', () => {
  it('accepts owner by uid and member by email', () => {
    const ownerAllowed = isPortfolioMember(
      {
        id: 'p1',
        ownerUid: 'owner-1',
        members: [],
      },
      { uid: 'owner-1', email: 'x@y.com' },
    );
    expect(ownerAllowed).toBe(true);

    const memberAllowed = isPortfolioMember(
      {
        id: 'p2',
        memberEmails: ['member@example.com'],
      },
      { uid: 'u2', email: 'member@example.com' },
    );
    expect(memberAllowed).toBe(true);
  });
});
