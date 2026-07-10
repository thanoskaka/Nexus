import type { Asset } from '../store/db';

export type JurisdictionCode = 'CA' | 'IN' | 'US';
export type TaxPeriodBasis = 'calendar_year' | 'india_financial_year';
export type RoomTrackingMode = 'none' | 'authority_reported' | 'statutory_cap' | 'tax_deduction' | 'informational';

export type FinancialAccountTypeCode =
  | 'CA_TFSA'
  | 'CA_RRSP'
  | 'CA_FHSA'
  | 'CA_RESP'
  | 'CA_RDSP'
  | 'CA_RRIF'
  | 'CA_RPP_DCPP'
  | 'CA_LIRA_LRSP'
  | 'CA_NON_REGISTERED'
  | 'CA_CASH'
  | 'CA_GIC'
  | 'CA_REAL_ESTATE'
  | 'CA_CREDIT'
  | 'CA_OTHER'
  | 'IN_PPF'
  | 'IN_EPF'
  | 'IN_VPF'
  | 'IN_NPS_T1'
  | 'IN_NPS_T2'
  | 'IN_DEMAT'
  | 'IN_MUTUAL_FUNDS'
  | 'IN_BANK_SAVINGS'
  | 'IN_NRE'
  | 'IN_NRO'
  | 'IN_FD_RD'
  | 'IN_SSA'
  | 'IN_SCSS'
  | 'IN_GOLD'
  | 'IN_REAL_ESTATE'
  | 'IN_CREDIT'
  | 'IN_OTHER';

export interface FinancialAccountTypeDefinition {
  code: FinancialAccountTypeCode;
  jurisdiction: Exclude<JurisdictionCode, 'US'>;
  label: string;
  category: 'registered' | 'retirement' | 'investment' | 'banking' | 'deposit' | 'property' | 'liability' | 'other';
  roomTracking: RoomTrackingMode;
  periodBasis: TaxPeriodBasis;
  sourceUrl?: string;
}

const CRA_REGISTERED_PLANS_URL = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-savings-plans.html';
const CRA_TFSA_URL = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html';
const CRA_RRSP_URL = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/where-you-find-your-rrsp-prpp-deduction-limit.html';
const CRA_FHSA_URL = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html';
const NSI_PPF_URL = 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=169';
const EPFO_URL = 'https://www.epfindia.gov.in/';
const PFRDA_NPS_URL = 'https://www.pfrda.org.in/';
const INDIA_TAX_URL = 'https://www.incometax.gov.in/iec/foportal/help/individual-business-profession';

export const FINANCIAL_ACCOUNT_TYPES: FinancialAccountTypeDefinition[] = [
  { code: 'CA_TFSA', jurisdiction: 'CA', label: 'TFSA', category: 'registered', roomTracking: 'authority_reported', periodBasis: 'calendar_year', sourceUrl: CRA_TFSA_URL },
  { code: 'CA_RRSP', jurisdiction: 'CA', label: 'RRSP', category: 'retirement', roomTracking: 'authority_reported', periodBasis: 'calendar_year', sourceUrl: CRA_RRSP_URL },
  { code: 'CA_FHSA', jurisdiction: 'CA', label: 'FHSA', category: 'registered', roomTracking: 'authority_reported', periodBasis: 'calendar_year', sourceUrl: CRA_FHSA_URL },
  { code: 'CA_RESP', jurisdiction: 'CA', label: 'RESP', category: 'registered', roomTracking: 'informational', periodBasis: 'calendar_year', sourceUrl: CRA_REGISTERED_PLANS_URL },
  { code: 'CA_RDSP', jurisdiction: 'CA', label: 'RDSP', category: 'registered', roomTracking: 'informational', periodBasis: 'calendar_year', sourceUrl: CRA_REGISTERED_PLANS_URL },
  { code: 'CA_RRIF', jurisdiction: 'CA', label: 'RRIF', category: 'retirement', roomTracking: 'informational', periodBasis: 'calendar_year', sourceUrl: CRA_REGISTERED_PLANS_URL },
  { code: 'CA_RPP_DCPP', jurisdiction: 'CA', label: 'RPP / DCPP', category: 'retirement', roomTracking: 'informational', periodBasis: 'calendar_year', sourceUrl: CRA_REGISTERED_PLANS_URL },
  { code: 'CA_LIRA_LRSP', jurisdiction: 'CA', label: 'LIRA / LRSP', category: 'retirement', roomTracking: 'informational', periodBasis: 'calendar_year', sourceUrl: CRA_REGISTERED_PLANS_URL },
  { code: 'CA_NON_REGISTERED', jurisdiction: 'CA', label: 'Non-registered investment', category: 'investment', roomTracking: 'none', periodBasis: 'calendar_year' },
  { code: 'CA_CASH', jurisdiction: 'CA', label: 'Bank / cash account', category: 'banking', roomTracking: 'none', periodBasis: 'calendar_year' },
  { code: 'CA_GIC', jurisdiction: 'CA', label: 'GIC / term deposit', category: 'deposit', roomTracking: 'none', periodBasis: 'calendar_year' },
  { code: 'CA_REAL_ESTATE', jurisdiction: 'CA', label: 'Real estate', category: 'property', roomTracking: 'none', periodBasis: 'calendar_year' },
  { code: 'CA_CREDIT', jurisdiction: 'CA', label: 'Credit / loan', category: 'liability', roomTracking: 'none', periodBasis: 'calendar_year' },
  { code: 'CA_OTHER', jurisdiction: 'CA', label: 'Other Canadian account', category: 'other', roomTracking: 'none', periodBasis: 'calendar_year' },
  { code: 'IN_PPF', jurisdiction: 'IN', label: 'PPF', category: 'retirement', roomTracking: 'statutory_cap', periodBasis: 'india_financial_year', sourceUrl: NSI_PPF_URL },
  { code: 'IN_EPF', jurisdiction: 'IN', label: 'EPF', category: 'retirement', roomTracking: 'informational', periodBasis: 'india_financial_year', sourceUrl: EPFO_URL },
  { code: 'IN_VPF', jurisdiction: 'IN', label: 'VPF', category: 'retirement', roomTracking: 'tax_deduction', periodBasis: 'india_financial_year', sourceUrl: INDIA_TAX_URL },
  { code: 'IN_NPS_T1', jurisdiction: 'IN', label: 'NPS Tier I', category: 'retirement', roomTracking: 'tax_deduction', periodBasis: 'india_financial_year', sourceUrl: PFRDA_NPS_URL },
  { code: 'IN_NPS_T2', jurisdiction: 'IN', label: 'NPS Tier II', category: 'investment', roomTracking: 'none', periodBasis: 'india_financial_year', sourceUrl: PFRDA_NPS_URL },
  { code: 'IN_DEMAT', jurisdiction: 'IN', label: 'Demat / brokerage', category: 'investment', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_MUTUAL_FUNDS', jurisdiction: 'IN', label: 'Mutual fund folio', category: 'investment', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_BANK_SAVINGS', jurisdiction: 'IN', label: 'Savings / current account', category: 'banking', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_NRE', jurisdiction: 'IN', label: 'NRE account', category: 'banking', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_NRO', jurisdiction: 'IN', label: 'NRO account', category: 'banking', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_FD_RD', jurisdiction: 'IN', label: 'Fixed / recurring deposit', category: 'deposit', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_SSA', jurisdiction: 'IN', label: 'Sukanya Samriddhi Account', category: 'registered', roomTracking: 'statutory_cap', periodBasis: 'india_financial_year', sourceUrl: NSI_PPF_URL },
  { code: 'IN_SCSS', jurisdiction: 'IN', label: 'Senior Citizens Savings Scheme', category: 'registered', roomTracking: 'statutory_cap', periodBasis: 'india_financial_year', sourceUrl: NSI_PPF_URL },
  { code: 'IN_GOLD', jurisdiction: 'IN', label: 'Gold account / holding', category: 'investment', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_REAL_ESTATE', jurisdiction: 'IN', label: 'Real estate', category: 'property', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_CREDIT', jurisdiction: 'IN', label: 'Credit / loan', category: 'liability', roomTracking: 'none', periodBasis: 'india_financial_year' },
  { code: 'IN_OTHER', jurisdiction: 'IN', label: 'Other Indian account', category: 'other', roomTracking: 'none', periodBasis: 'india_financial_year' },
];

export const FINANCIAL_ACCOUNT_TYPE_BY_CODE = new Map(
  FINANCIAL_ACCOUNT_TYPES.map((definition) => [definition.code, definition]),
);

export interface PersonProfile {
  id: string;
  displayName: string;
  sourceOwnerLabel: string;
  linkedMemberEmail?: string;
  linkedUserUid?: string;
  jurisdictions: JurisdictionCode[];
  createdAt: number;
  updatedAt: number;
}

export interface FinancialAccount {
  id: string;
  ownerPersonId: string;
  jurisdiction: JurisdictionCode;
  accountType: FinancialAccountTypeCode;
  institutionName: string;
  displayName: string;
  currency: 'CAD' | 'INR' | 'USD';
  source: 'legacy_derived' | 'manual' | 'connected';
  legacyHoldingIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface HoldingAccountLink {
  holdingId: string;
  accountId: string;
  source: 'legacy_asset' | 'connected_holding';
}

export type ContributionEventType =
  | 'contribution'
  | 'employer_contribution'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
  | 'correction';

export interface ContributionEvent {
  id: string;
  personId: string;
  programCode: FinancialAccountTypeCode;
  accountId?: string;
  periodKey: string;
  occurredOn: string;
  eventType: ContributionEventType;
  amount: number;
  roomImpactAmount: number;
  currency: 'CAD' | 'INR' | 'USD';
  notes?: string;
  createdAt: number;
}

export interface ContributionRoomRecord {
  id: string;
  personId: string;
  programCode: FinancialAccountTypeCode;
  periodKey: string;
  currency: 'CAD' | 'INR' | 'USD';
  openingRoom: number;
  adjustments: number;
  asOfDate: string;
  source: 'government_record' | 'institution_statement' | 'user_entered';
  notes?: string;
  updatedAt: number;
}

export interface HouseholdFinanceState {
  schemaVersion: 2;
  people: PersonProfile[];
  accounts: FinancialAccount[];
  holdingLinks: HoldingAccountLink[];
  contributionEvents: ContributionEvent[];
  roomRecords: ContributionRoomRecord[];
  createdAt: number;
  updatedAt: number;
  legacyDerivedAt: number;
}

type LegacyMember = { email: string; role: 'owner' | 'partner'; uid?: string };

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function stableId(prefix: string, value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function jurisdictionForCountry(country: string): Exclude<JurisdictionCode, 'US'> {
  return normalize(country) === 'india' ? 'IN' : 'CA';
}

export function inferLegacyAccountType(asset: Pick<Asset, 'country' | 'assetClass' | 'name' | 'holdingPlatform'>): FinancialAccountTypeCode {
  const jurisdiction = jurisdictionForCountry(asset.country);
  const text = normalize([asset.assetClass, asset.name, asset.holdingPlatform].filter(Boolean).join(' '));

  if (jurisdiction === 'CA') {
    if (text.includes('tfsa')) return 'CA_TFSA';
    if (text.includes('rrsp')) return 'CA_RRSP';
    if (text.includes('fhsa')) return 'CA_FHSA';
    if (text.includes('resp')) return 'CA_RESP';
    if (text.includes('rdsp')) return 'CA_RDSP';
    if (text.includes('rrif')) return 'CA_RRIF';
    if (text.includes('lira') || text.includes('lrsp')) return 'CA_LIRA_LRSP';
    if (text.includes('pension') || text.includes('dcpp') || text.includes('rpp')) return 'CA_RPP_DCPP';
    if (text.includes('real estate') || text.includes('property')) return 'CA_REAL_ESTATE';
    if (text.includes('credit') || text.includes('loan') || text.includes('mortgage')) return 'CA_CREDIT';
    if (text.includes('gic') || text.includes('term deposit')) return 'CA_GIC';
    if (text.includes('cash') || text.includes('liquid') || text.includes('bank')) return 'CA_CASH';
    if (text.includes('equity') || text.includes('stock') || text.includes('etf') || text.includes('mutual') || asset.holdingPlatform) return 'CA_NON_REGISTERED';
    return 'CA_OTHER';
  }

  if (text.includes('ppf')) return 'IN_PPF';
  if (text.includes('vpf')) return 'IN_VPF';
  if (text.includes('epf') || /(^|\s)pf(\s|$)/.test(text)) return 'IN_EPF';
  if (text.includes('nps') && text.includes('tier 2')) return 'IN_NPS_T2';
  if (text.includes('nps')) return 'IN_NPS_T1';
  if (text.includes('sukanya')) return 'IN_SSA';
  if (text.includes('scss') || text.includes('senior citizen')) return 'IN_SCSS';
  if (text.includes('nre')) return 'IN_NRE';
  if (text.includes('nro')) return 'IN_NRO';
  if (text.includes('real estate') || text.includes('property')) return 'IN_REAL_ESTATE';
  if (text.includes('credit') || text.includes('loan')) return 'IN_CREDIT';
  if (text.includes('fixed deposit') || /(^|\s)fd(\s|$)/.test(text) || text.includes('recurring deposit')) return 'IN_FD_RD';
  if (text.includes('mutual fund') || text.includes('folio')) return 'IN_MUTUAL_FUNDS';
  if (text.includes('gold')) return 'IN_GOLD';
  if (text.includes('bank') || text.includes('cash') || text.includes('liquid') || text.includes('savings')) return 'IN_BANK_SAVINGS';
  if (text.includes('equity') || text.includes('stock') || text.includes('demat') || asset.holdingPlatform) return 'IN_DEMAT';
  return 'IN_OTHER';
}

function accountInstitution(asset: Pick<Asset, 'holdingPlatform'>) {
  return asset.holdingPlatform?.trim() || 'Unspecified';
}

function accountDisplayName(typeCode: FinancialAccountTypeCode, institutionName: string) {
  const label = FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(typeCode)?.label || typeCode;
  return institutionName === 'Unspecified' ? label : `${institutionName} · ${label}`;
}

export function buildHouseholdFinanceBaseline({
  assets,
  members,
  existing,
  now = Date.now(),
}: {
  assets: Asset[];
  members: LegacyMember[];
  existing?: HouseholdFinanceState;
  now?: number;
}): HouseholdFinanceState {
  const ownerLabels = [...new Set(assets.map((asset) => asset.owner.trim()).filter(Boolean))];
  if (ownerLabels.length === 0) {
    ownerLabels.push(...members.map((member) => member.email.trim()).filter(Boolean));
  }

  const existingByOwner = new Map((existing?.people || []).map((person) => [normalize(person.sourceOwnerLabel), person]));
  const people = ownerLabels.map((ownerLabel) => {
    const previous = existingByOwner.get(normalize(ownerLabel));
    const ownerAssets = assets.filter((asset) => normalize(asset.owner) === normalize(ownerLabel));
    const jurisdictions = [...new Set(ownerAssets.map((asset) => jurisdictionForCountry(asset.country)))] as JurisdictionCode[];
    const directMember = members.find((member) => normalize(member.email) === normalize(ownerLabel));
    const singleMember = ownerLabels.length === 1 && members.length === 1 ? members[0] : undefined;
    const matchedMember = directMember || singleMember;
    return {
      id: previous?.id || stableId('person', normalize(ownerLabel)),
      displayName: previous?.displayName || ownerLabel,
      sourceOwnerLabel: ownerLabel,
      linkedMemberEmail: previous?.linkedMemberEmail || matchedMember?.email,
      linkedUserUid: previous?.linkedUserUid || matchedMember?.uid,
      jurisdictions,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    } satisfies PersonProfile;
  });

  const personByOwner = new Map(people.map((person) => [normalize(person.sourceOwnerLabel), person]));
  const accountMap = new Map<string, FinancialAccount>();
  const holdingLinks: HoldingAccountLink[] = [];

  for (const asset of assets) {
    const person = personByOwner.get(normalize(asset.owner));
    if (!person) continue;
    const accountType = inferLegacyAccountType(asset);
    const jurisdiction = jurisdictionForCountry(asset.country);
    const institutionName = accountInstitution(asset);
    const key = [person.id, jurisdiction, accountType, normalize(institutionName), asset.currency].join('|');
    const accountId = stableId('account', key);
    const existingAccount = existing?.accounts.find((account) => account.id === accountId);
    const current = accountMap.get(accountId) || {
      id: accountId,
      ownerPersonId: person.id,
      jurisdiction,
      accountType,
      institutionName,
      displayName: existingAccount?.displayName || accountDisplayName(accountType, institutionName),
      currency: asset.currency,
      source: existingAccount?.source || 'legacy_derived',
      legacyHoldingIds: [],
      createdAt: existingAccount?.createdAt || now,
      updatedAt: now,
    } satisfies FinancialAccount;
    if (!current.legacyHoldingIds.includes(asset.id)) current.legacyHoldingIds.push(asset.id);
    accountMap.set(accountId, current);
    holdingLinks.push({ holdingId: asset.id, accountId, source: 'legacy_asset' });
  }

  return {
    schemaVersion: 2,
    people,
    accounts: [...accountMap.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    holdingLinks,
    contributionEvents: existing?.contributionEvents || [],
    roomRecords: existing?.roomRecords || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    legacyDerivedAt: now,
  };
}

export function normalizeHouseholdFinance(value: unknown): HouseholdFinanceState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<HouseholdFinanceState>;
  if (candidate.schemaVersion !== 2) return undefined;
  return {
    schemaVersion: 2,
    people: Array.isArray(candidate.people) ? candidate.people : [],
    accounts: Array.isArray(candidate.accounts) ? candidate.accounts : [],
    holdingLinks: Array.isArray(candidate.holdingLinks) ? candidate.holdingLinks : [],
    contributionEvents: Array.isArray(candidate.contributionEvents) ? candidate.contributionEvents : [],
    roomRecords: Array.isArray(candidate.roomRecords) ? candidate.roomRecords : [],
    createdAt: Number(candidate.createdAt) || Date.now(),
    updatedAt: Number(candidate.updatedAt) || Date.now(),
    legacyDerivedAt: Number(candidate.legacyDerivedAt) || Date.now(),
  };
}

export function linkPersonToMember(
  state: HouseholdFinanceState,
  personId: string,
  member: LegacyMember | null,
  now = Date.now(),
): HouseholdFinanceState {
  return {
    ...state,
    people: state.people.map((person) => person.id === personId ? {
      ...person,
      linkedMemberEmail: member?.email || undefined,
      linkedUserUid: member?.uid || undefined,
      updatedAt: now,
    } : person),
    updatedAt: now,
  };
}

export function upsertRoomRecord(
  state: HouseholdFinanceState,
  input: Omit<ContributionRoomRecord, 'id' | 'updatedAt'>,
  now = Date.now(),
): HouseholdFinanceState {
  const id = `${input.personId}:${input.programCode}:${input.periodKey}`;
  const record: ContributionRoomRecord = { ...input, id, updatedAt: now };
  const exists = state.roomRecords.some((current) => current.id === id);
  return {
    ...state,
    roomRecords: exists
      ? state.roomRecords.map((current) => current.id === id ? record : current)
      : [...state.roomRecords, record],
    updatedAt: now,
  };
}

export function addContributionEvent(
  state: HouseholdFinanceState,
  input: Omit<ContributionEvent, 'id' | 'createdAt'>,
  now = Date.now(),
): HouseholdFinanceState {
  const id = stableId('contribution', [input.personId, input.programCode, input.accountId, input.occurredOn, input.eventType, input.amount, now].join('|'));
  return {
    ...state,
    contributionEvents: [...state.contributionEvents, { ...input, id, createdAt: now }],
    updatedAt: now,
  };
}

export function getDefaultPeriodKey(jurisdiction: JurisdictionCode, date = new Date()) {
  const year = date.getFullYear();
  if (jurisdiction !== 'IN') return String(year);
  const startYear = date.getMonth() >= 3 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function getRoomPrograms(jurisdiction: JurisdictionCode) {
  return FINANCIAL_ACCOUNT_TYPES.filter(
    (definition) => definition.jurisdiction === jurisdiction && definition.roomTracking !== 'none',
  );
}

export function calculateRoomSummary(
  record: ContributionRoomRecord | undefined,
  events: ContributionEvent[],
) {
  if (!record) return null;
  const matchingEvents = events.filter((event) =>
    event.personId === record.personId
    && event.programCode === record.programCode
    && event.periodKey === record.periodKey
  );
  const contributed = matchingEvents
    .filter((event) => event.eventType === 'contribution' || event.eventType === 'employer_contribution')
    .reduce((sum, event) => sum + event.amount, 0);
  const roomUsed = matchingEvents.reduce((sum, event) => sum + event.roomImpactAmount, 0);
  return {
    contributed,
    roomUsed,
    remaining: record.openingRoom + record.adjustments - roomUsed,
    eventCount: matchingEvents.length,
  };
}
