import { describe, expect, it } from 'vitest';
import type { Asset } from '../store/db';
import {
  addContributionEvent,
  buildHouseholdFinanceBaseline,
  calculateRoomSummary,
  getDefaultPeriodKey,
  inferLegacyAccountType,
  linkPersonToMember,
  upsertRoomRecord,
} from './householdFinance';

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: 'Holding',
    quantity: 1,
    costBasis: 100,
    currency: 'CAD',
    owner: 'Person One',
    country: 'Canada',
    assetClass: 'Equity',
    autoUpdate: false,
    ...overrides,
  };
}

describe('household finance baseline', () => {
  it('creates one person per legacy owner and never creates joint ownership', () => {
    const state = buildHouseholdFinanceBaseline({
      assets: [
        asset({ id: 'tfsa-1', owner: 'Person One', assetClass: 'TFSA', holdingPlatform: 'Bank A' }),
        asset({ id: 'tfsa-2', owner: 'Person Two', assetClass: 'TFSA', holdingPlatform: 'Bank A' }),
      ],
      members: [
        { email: 'one@example.com', role: 'owner', uid: 'uid-1' },
        { email: 'two@example.com', role: 'partner', uid: 'uid-2' },
      ],
      now: 1000,
    });

    expect(state.people).toHaveLength(2);
    expect(state.accounts).toHaveLength(2);
    expect(state.accounts.every((account) => typeof account.ownerPersonId === 'string')).toBe(true);
    expect(state.holdingLinks).toHaveLength(2);
  });

  it('groups multiple holdings in the same owned account', () => {
    const state = buildHouseholdFinanceBaseline({
      assets: [
        asset({ id: 'a1', assetClass: 'TFSA', holdingPlatform: 'Wealthsimple' }),
        asset({ id: 'a2', name: 'Second', assetClass: 'TFSA', holdingPlatform: 'Wealthsimple' }),
      ],
      members: [],
      now: 1000,
    });

    expect(state.accounts).toHaveLength(1);
    expect(state.accounts[0].accountType).toBe('CA_TFSA');
    expect(state.accounts[0].legacyHoldingIds).toEqual(['a1', 'a2']);
  });

  it('maps common Canadian and Indian legacy labels to account wrappers', () => {
    expect(inferLegacyAccountType(asset({ assetClass: 'RRSP' }))).toBe('CA_RRSP');
    expect(inferLegacyAccountType(asset({ assetClass: 'FHSA' }))).toBe('CA_FHSA');
    expect(inferLegacyAccountType(asset({ country: 'India', currency: 'INR', assetClass: 'PPF' }))).toBe('IN_PPF');
    expect(inferLegacyAccountType(asset({ country: 'India', currency: 'INR', assetClass: 'PF' }))).toBe('IN_EPF');
    expect(inferLegacyAccountType(asset({ country: 'India', currency: 'INR', assetClass: 'NPS' }))).toBe('IN_NPS_T1');
  });

  it('links a financial person to a login member without changing ownership', () => {
    const state = buildHouseholdFinanceBaseline({
      assets: [asset({ id: 'a1' })],
      members: [],
      now: 1000,
    });
    const personId = state.people[0].id;
    const accountOwnerBefore = state.accounts[0].ownerPersonId;
    const linked = linkPersonToMember(state, personId, { email: 'one@example.com', role: 'owner', uid: 'uid-1' }, 2000);

    expect(linked.people[0].linkedMemberEmail).toBe('one@example.com');
    expect(linked.people[0].linkedUserUid).toBe('uid-1');
    expect(linked.accounts[0].ownerPersonId).toBe(accountOwnerBefore);
  });
});

describe('contribution room ledger', () => {
  it('subtracts room-impacting contributions but not transfers or withdrawals', () => {
    let state = buildHouseholdFinanceBaseline({
      assets: [asset({ id: 'a1', assetClass: 'TFSA' })],
      members: [],
      now: 1000,
    });
    const personId = state.people[0].id;
    state = upsertRoomRecord(state, {
      personId,
      programCode: 'CA_TFSA',
      periodKey: '2026',
      currency: 'CAD',
      openingRoom: 10000,
      adjustments: 500,
      asOfDate: '2026-01-01',
      source: 'government_record',
    }, 2000);
    state = addContributionEvent(state, {
      personId,
      programCode: 'CA_TFSA',
      periodKey: '2026',
      occurredOn: '2026-02-01',
      eventType: 'contribution',
      amount: 3000,
      roomImpactAmount: 3000,
      currency: 'CAD',
    }, 3000);
    state = addContributionEvent(state, {
      personId,
      programCode: 'CA_TFSA',
      periodKey: '2026',
      occurredOn: '2026-03-01',
      eventType: 'transfer_in',
      amount: 2000,
      roomImpactAmount: 0,
      currency: 'CAD',
    }, 4000);
    state = addContributionEvent(state, {
      personId,
      programCode: 'CA_TFSA',
      periodKey: '2026',
      occurredOn: '2026-04-01',
      eventType: 'withdrawal',
      amount: 1000,
      roomImpactAmount: 0,
      currency: 'CAD',
    }, 5000);

    const summary = calculateRoomSummary(state.roomRecords[0], state.contributionEvents);
    expect(summary).toEqual({ contributed: 3000, roomUsed: 3000, remaining: 7500, eventCount: 3 });
  });

  it('uses calendar years for Canada and financial years for India', () => {
    const date = new Date('2026-07-09T12:00:00Z');
    expect(getDefaultPeriodKey('CA', date)).toBe('2026');
    expect(getDefaultPeriodKey('IN', date)).toBe('2026-27');
  });
});
