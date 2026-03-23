import { DEFAULT_PRICE_PROVIDER_SETTINGS } from '../lib/api';
import type { Asset, AssetClassDef } from './db';

export interface PortfolioMember {
  email: string;
  role: 'owner' | 'partner';
}

export interface PortfolioSummary {
  id: string;
  name: string;
  ownerEmail: string;
  isPersonal: boolean;
}

export function isLegacySelfPortfolioCandidate<
  T extends PortfolioSummary & { document?: Partial<PortfolioDocument> }
>(
  portfolio: T,
  signedInEmail?: string | null,
  personalPortfolioId?: string,
) {
  const normalizedEmail = signedInEmail?.trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (portfolio.id === personalPortfolioId) return false;
  if (portfolio.isPersonal) return false;

  const ownerMatches = portfolio.ownerEmail.trim().toLowerCase() === normalizedEmail;
  const legacyPersonalName = portfolio.name.trim().toLowerCase() === `${normalizedEmail}'s portfolio`;
  const memberCount = Array.isArray(portfolio.document?.memberEmails)
    ? portfolio.document?.memberEmails?.length
    : Array.isArray(portfolio.document?.members)
      ? portfolio.document?.members?.length
      : 0;
  const looksLikeSelfOnlyPortfolio = memberCount <= 1;

  return ownerMatches && (legacyPersonalName || looksLikeSelfOnlyPortfolio);
}

export function removeLegacySelfPortfolioDuplicates<
  T extends PortfolioSummary & { document?: Partial<PortfolioDocument> }
>(
  portfolios: T[],
  signedInEmail?: string | null,
): T[] {
  const normalizedEmail = signedInEmail?.trim().toLowerCase();
  const personalPortfolio = portfolios.find((portfolio) => portfolio.isPersonal);

  if (!normalizedEmail || !personalPortfolio) return portfolios;

  return portfolios.filter((portfolio) => {
    if (portfolio.id === personalPortfolio.id) return true;
    if (portfolio.isPersonal) return true;
    return !isLegacySelfPortfolioCandidate(portfolio, normalizedEmail, personalPortfolio.id);
  });
}

export function shouldHydratePersonalPortfolioFromLegacy(
  personalPortfolio?: Partial<PortfolioDocument> | null,
  legacyPortfolio?: Partial<PortfolioDocument> | null,
) {
  if (!personalPortfolio || !legacyPortfolio) return false;

  const personalHasAssets = Array.isArray(personalPortfolio.assets) && personalPortfolio.assets.length > 0;
  const personalHasClasses = Array.isArray(personalPortfolio.assetClasses) && personalPortfolio.assetClasses.length > 0;
  const legacyHasAssets = Array.isArray(legacyPortfolio.assets) && legacyPortfolio.assets.length > 0;
  const legacyHasClasses = Array.isArray(legacyPortfolio.assetClasses) && legacyPortfolio.assetClasses.length > 0;

  return !personalHasAssets && !personalHasClasses && (legacyHasAssets || legacyHasClasses);
}

export interface PortfolioDocument {
  assets: Asset[];
  assetClasses: AssetClassDef[];
  baseCurrency: 'CAD' | 'INR' | 'USD' | 'ORIGINAL';
  members: PortfolioMember[];
  memberEmails: string[];
  name?: string;
  ownerEmail?: string;
  ownerUid?: string;
  isPersonal?: boolean;
  priceProviderSettings: typeof DEFAULT_PRICE_PROVIDER_SETTINGS;
  updatedAt?: unknown;
}

export function getPersonalPortfolioId(uid: string) {
  return `user-${uid}`;
}

export function getActivePortfolioStorageKey(uid: string) {
  return `nexus-active-portfolio:${uid}`;
}

export function createDefaultPortfolio(email?: string | null, uid?: string | null, portfolioId?: string): PortfolioDocument {
  const normalizedEmail = email?.trim().toLowerCase();
  const isPersonal = Boolean(uid && portfolioId === getPersonalPortfolioId(uid));
  return {
    assets: [],
    assetClasses: [],
    baseCurrency: 'ORIGINAL',
    members: normalizedEmail ? [{ email: normalizedEmail, role: 'owner' }] : [],
    memberEmails: normalizedEmail ? [normalizedEmail] : [],
    name: isPersonal ? 'My Portfolio' : normalizedEmail ? `${normalizedEmail}'s Portfolio` : 'My Portfolio',
    ownerEmail: normalizedEmail || '',
    ownerUid: uid || '',
    isPersonal,
    priceProviderSettings: DEFAULT_PRICE_PROVIDER_SETTINGS,
  };
}

export function normalizePortfolio(data: Partial<PortfolioDocument>): PortfolioDocument {
  return {
    assets: Array.isArray(data.assets) ? data.assets : [],
    assetClasses: Array.isArray(data.assetClasses) ? data.assetClasses : [],
    baseCurrency: data.baseCurrency === 'CAD' || data.baseCurrency === 'INR' || data.baseCurrency === 'USD' || data.baseCurrency === 'ORIGINAL'
      ? data.baseCurrency
      : 'ORIGINAL',
    members: Array.isArray(data.members) ? data.members : [],
    memberEmails: Array.isArray(data.memberEmails) ? data.memberEmails : Array.isArray(data.members) ? data.members.map((member) => member.email).filter(Boolean) : [],
    name: typeof data.name === 'string' ? data.name : '',
    ownerEmail: typeof data.ownerEmail === 'string' ? data.ownerEmail : '',
    ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
    isPersonal: Boolean(data.isPersonal),
    priceProviderSettings: {
      ...DEFAULT_PRICE_PROVIDER_SETTINGS,
      ...(data.priceProviderSettings || {}),
    },
  };
}

export function buildPortfolioName(portfolio: PortfolioDocument, portfolioId: string) {
  if (portfolio.name) return portfolio.name;
  if (portfolio.isPersonal) return 'My Portfolio';
  if (portfolio.ownerEmail) return `${portfolio.ownerEmail}'s Portfolio`;
  if (portfolio.members[0]?.email) return `${portfolio.members[0].email}'s Portfolio`;
  return `Portfolio ${portfolioId.slice(0, 8)}`;
}

export function selectActivePortfolioId({
  currentActivePortfolioId,
  persistedPortfolioId,
  availablePortfolios,
  personalPortfolioId,
}: {
  currentActivePortfolioId: string | null;
  persistedPortfolioId: string | null;
  availablePortfolios: Array<{ id: string; isPersonal: boolean }>;
  personalPortfolioId: string;
}) {
  if (currentActivePortfolioId && availablePortfolios.some((portfolio) => portfolio.id === currentActivePortfolioId)) {
    return currentActivePortfolioId;
  }

  if (persistedPortfolioId && availablePortfolios.some((portfolio) => portfolio.id === persistedPortfolioId)) {
    return persistedPortfolioId;
  }

  if (availablePortfolios.some((portfolio) => portfolio.id === personalPortfolioId)) {
    return personalPortfolioId;
  }

  return availablePortfolios[0]?.id || null;
}
