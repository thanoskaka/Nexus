import { describe, expect, it } from 'vitest';
import {
  buildPortfolioName,
  createDefaultPortfolio,
  getActivePortfolioStorageKey,
  getPersonalPortfolioId,
  normalizePortfolio,
  selectActivePortfolioId,
} from './portfolioHelpers';

describe('portfolioHelpers', () => {
  it('creates a personal portfolio for the signed-in user', () => {
    const uid = 'user-123';
    const portfolio = createDefaultPortfolio('shubhamg266@gmail.com', uid, getPersonalPortfolioId(uid));

    expect(portfolio.name).toBe('My Portfolio');
    expect(portfolio.ownerEmail).toBe('shubhamg266@gmail.com');
    expect(portfolio.ownerUid).toBe(uid);
    expect(portfolio.isPersonal).toBe(true);
    expect(portfolio.members).toEqual([{ email: 'shubhamg266@gmail.com', role: 'owner' }]);
    expect(portfolio.memberEmails).toEqual(['shubhamg266@gmail.com']);
  });

  it('creates a shared-style portfolio name when not using the personal portfolio id', () => {
    const portfolio = createDefaultPortfolio('friend@example.com', 'user-999', 'shared-portfolio');

    expect(portfolio.name).toBe("friend@example.com's Portfolio");
    expect(portfolio.isPersonal).toBe(false);
  });

  it('normalizes missing portfolio metadata safely', () => {
    const normalized = normalizePortfolio({
      assets: [],
      assetClasses: [],
      members: [{ email: 'Partner@Example.com', role: 'partner' }],
    });

    expect(normalized.baseCurrency).toBe('ORIGINAL');
    expect(normalized.memberEmails).toEqual(['Partner@Example.com']);
    expect(normalized.name).toBe('');
    expect(normalized.ownerEmail).toBe('');
    expect(normalized.ownerUid).toBe('');
    expect(normalized.isPersonal).toBe(false);
  });

  it('builds a readable fallback portfolio name', () => {
    expect(
      buildPortfolioName(
        normalizePortfolio({
          members: [{ email: 'mayuri@example.com', role: 'owner' }],
        }),
        'portfolio-abc12345',
      ),
    ).toBe("mayuri@example.com's Portfolio");
  });

  it('prefers the current active portfolio when it is still accessible', () => {
    const activeId = selectActivePortfolioId({
      currentActivePortfolioId: 'shared-1',
      persistedPortfolioId: 'user-123',
      personalPortfolioId: 'user-123',
      availablePortfolios: [
        { id: 'user-123', isPersonal: true },
        { id: 'shared-1', isPersonal: false },
      ],
    });

    expect(activeId).toBe('shared-1');
  });

  it('falls back to the persisted portfolio when the current selection disappears', () => {
    const activeId = selectActivePortfolioId({
      currentActivePortfolioId: 'missing',
      persistedPortfolioId: 'shared-2',
      personalPortfolioId: 'user-123',
      availablePortfolios: [
        { id: 'user-123', isPersonal: true },
        { id: 'shared-2', isPersonal: false },
      ],
    });

    expect(activeId).toBe('shared-2');
  });

  it('falls back to the personal portfolio by default', () => {
    const activeId = selectActivePortfolioId({
      currentActivePortfolioId: null,
      persistedPortfolioId: null,
      personalPortfolioId: 'user-123',
      availablePortfolios: [
        { id: 'shared-2', isPersonal: false },
        { id: 'user-123', isPersonal: true },
      ],
    });

    expect(activeId).toBe('user-123');
  });

  it('generates a stable local-storage key per user', () => {
    expect(getActivePortfolioStorageKey('abc')).toBe('nexus-active-portfolio:abc');
  });
});
