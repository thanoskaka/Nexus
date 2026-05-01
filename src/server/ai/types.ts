export type AiChatRequestBody = {
  portfolioId: string;
  question: string;
  threadId?: string;
};

export type PortfolioMember = {
  email?: string;
  role?: 'owner' | 'partner';
  uid?: string;
};

export type PortfolioAsset = {
  id?: string;
  name?: string;
  ticker?: string;
  quantity?: number;
  costBasis?: number;
  currency?: string;
  country?: string;
  assetClass?: string;
  currentPrice?: number;
  owner?: string;
};

export type PortfolioDocument = {
  id: string;
  ownerUid?: string;
  ownerEmail?: string;
  name?: string;
  members?: PortfolioMember[];
  memberEmails?: string[];
  assets?: PortfolioAsset[];
  primaryCurrency?: string;
  secondaryCurrency?: string;
  baseCurrency?: string;
  updatedAt?: unknown;
};

export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
};
