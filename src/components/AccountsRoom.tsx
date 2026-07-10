import React from 'react';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, CreditCard, ExternalLink, Landmark, Link2, Plus, RefreshCw, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { usePortfolio } from '../store/PortfolioContext';
import { AssetMarketLogo, InstitutionLogo } from '../lib/assetLogos';
import type { Asset } from '../store/db';
import {
  FINANCIAL_ACCOUNT_TYPE_BY_CODE,
  calculateRoomSummary,
  getDefaultPeriodKey,
  getRoomPrograms,
  type ContributionEventType,
  type FinancialAccountTypeCode,
  type JurisdictionCode,
} from '../lib/householdFinance';

type BusyAction = 'initialize' | 'refresh' | 'link' | 'room' | 'contribution' | null;
type AccountEditorMode = 'room' | 'activity';
type AccountSelection = 'account' | 'program';

const COMMON_ROOM_PROGRAMS = new Set<FinancialAccountTypeCode>([
  'CA_TFSA',
  'CA_RRSP',
  'CA_FHSA',
  'CA_RESP',
  'IN_PPF',
  'IN_EPF',
  'IN_NPS_T1',
]);

function jurisdictionLabel(code: JurisdictionCode) {
  if (code === 'CA') return 'Canada';
  if (code === 'IN') return 'India';
  return 'United States';
}

function currencyForProgram(programCode: FinancialAccountTypeCode): 'CAD' | 'INR' {
  return programCode.startsWith('IN_') ? 'INR' : 'CAD';
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function programInstitution(programCode: FinancialAccountTypeCode) {
  if (programCode.startsWith('CA_')) return 'Government of Canada';
  if (programCode === 'IN_EPF' || programCode === 'IN_VPF') return 'EPFO India';
  if (programCode === 'IN_NPS_T1') return 'PFRDA NPS';
  return 'India Post';
}

export function AccountsRoom({ mode = 'all', embedded = false }: { mode?: 'all' | 'household' | 'accounts'; embedded?: boolean } = {}) {
  const {
    assets,
    members,
    currentUserRole,
    householdFinance,
    householdFinancePreview,
    initializeHouseholdFinance,
    refreshHouseholdFinance,
    linkFinancePerson,
    upsertContributionRoom,
    recordContributionEvent,
  } = usePortfolio();

  const finance = householdFinance || householdFinancePreview;
  const [selectedPersonId, setSelectedPersonId] = React.useState(finance.people[0]?.id || '');
  const [jurisdictionFilter, setJurisdictionFilter] = React.useState<'all' | JurisdictionCode>('all');
  const [selection, setSelection] = React.useState<AccountSelection>('account');
  const [selectedAccountId, setSelectedAccountId] = React.useState(finance.accounts[0]?.id || '');
  const [showAllPrograms, setShowAllPrograms] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<AccountEditorMode>('room');
  const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<BusyAction>(null);
  const [error, setError] = React.useState<string | null>(null);

  const initialProgram = finance.people[0]?.jurisdictions.includes('CA') ? 'CA_TFSA' : 'IN_PPF';
  const [programCode, setProgramCode] = React.useState<FinancialAccountTypeCode>(initialProgram);
  const [periodKey, setPeriodKey] = React.useState(getDefaultPeriodKey(initialProgram.startsWith('IN_') ? 'IN' : 'CA'));
  const [openingRoom, setOpeningRoom] = React.useState('');
  const [adjustments, setAdjustments] = React.useState('0');
  const [asOfDate, setAsOfDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [roomSource, setRoomSource] = React.useState<'government_record' | 'institution_statement' | 'user_entered'>('user_entered');

  const [eventType, setEventType] = React.useState<ContributionEventType>('contribution');
  const [eventAmount, setEventAmount] = React.useState('');
  const [eventDate, setEventDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [eventAccountId, setEventAccountId] = React.useState('');
  const [eventNotes, setEventNotes] = React.useState('');

  React.useEffect(() => {
    if (!finance.people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(finance.people[0]?.id || '');
    }
  }, [finance.people, selectedPersonId]);

  const selectedPerson = finance.people.find((person) => person.id === selectedPersonId) || finance.people[0];
  const filteredAccounts = finance.accounts.filter((account) =>
    (!selectedPerson || account.ownerPersonId === selectedPerson.id)
    && (jurisdictionFilter === 'all' || account.jurisdiction === jurisdictionFilter)
  );
  const assetAccounts = filteredAccounts.filter((account) => FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(account.accountType)?.category !== 'liability');
  const liabilityAccounts = filteredAccounts.filter((account) => FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(account.accountType)?.category === 'liability');
  const selectedAccount = finance.accounts.find((account) => account.id === selectedAccountId) || filteredAccounts[0];
  const selectedAccountHoldings = selectedAccount
    ? selectedAccount.legacyHoldingIds.map((holdingId) => assets.find((asset) => asset.id === holdingId)).filter((asset): asset is Asset => Boolean(asset))
    : [];
  const selectedAccountDefinition = selectedAccount ? FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(selectedAccount.accountType) : undefined;

  const trackedJurisdictions = selectedPerson?.jurisdictions.filter((code): code is 'CA' | 'IN' => code === 'CA' || code === 'IN') || [];
  const roomPrograms = trackedJurisdictions.flatMap((jurisdiction) => getRoomPrograms(jurisdiction));
  const featuredRoomPrograms = roomPrograms.filter((program) =>
    COMMON_ROOM_PROGRAMS.has(program.code)
    || finance.roomRecords.some((record) => record.personId === selectedPerson?.id && record.programCode === program.code)
    || finance.accounts.some((account) => account.ownerPersonId === selectedPerson?.id && account.accountType === program.code)
  );
  const visibleRoomPrograms = showAllPrograms ? roomPrograms : featuredRoomPrograms;
  const selectedProgram = FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(programCode);
  const selectedRoomRecord = finance.roomRecords.find((record) =>
    record.personId === selectedPerson?.id
    && record.programCode === programCode
    && record.periodKey === periodKey
  );
  const selectedRoomSummary = calculateRoomSummary(selectedRoomRecord, finance.contributionEvents);
  const programAccounts = finance.accounts.filter((account) =>
    account.ownerPersonId === selectedPerson?.id && account.accountType === programCode
  );

  React.useEffect(() => {
    if (selection === 'account' && !filteredAccounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(filteredAccounts[0]?.id || '');
    }
  }, [filteredAccounts, selectedAccountId, selection]);

  const setProgram = (next: FinancialAccountTypeCode) => {
    setProgramCode(next);
    const definition = FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(next);
    if (definition) setPeriodKey(getDefaultPeriodKey(definition.jurisdiction));
    setEventAccountId('');
    const existing = finance.roomRecords.find((record) =>
      record.personId === selectedPerson?.id
      && record.programCode === next
      && record.periodKey === getDefaultPeriodKey(definition?.jurisdiction || 'CA')
    );
    setOpeningRoom(existing ? String(existing.openingRoom) : '');
    setAdjustments(existing ? String(existing.adjustments) : '0');
    setAsOfDate(existing?.asOfDate || new Date().toISOString().slice(0, 10));
    setRoomSource(existing?.source || 'user_entered');
  };

  const selectProgram = (next: FinancialAccountTypeCode) => {
    setProgram(next);
    setSelection('program');
    setEditorMode('room');
    setMobileDetailOpen(true);
  };

  const selectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelection('account');
    setMobileDetailOpen(true);
  };

  const run = async (action: BusyAction, task: () => Promise<void>) => {
    setBusy(action);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The update could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const saveRoom = async () => {
    if (!selectedPerson || !selectedProgram || !periodKey.trim()) return;
    const opening = Number(openingRoom);
    const adjustmentValue = Number(adjustments || 0);
    if (!Number.isFinite(opening) || opening < 0 || !Number.isFinite(adjustmentValue)) {
      setError('Enter a valid opening room and adjustment.');
      return;
    }
    await run('room', async () => {
      await upsertContributionRoom({
        personId: selectedPerson.id,
        programCode,
        periodKey: periodKey.trim(),
        currency: currencyForProgram(programCode),
        openingRoom: opening,
        adjustments: adjustmentValue,
        asOfDate,
        source: roomSource,
      });
    });
  };

  const saveContribution = async () => {
    if (!selectedPerson || !periodKey.trim()) return;
    const amount = Number(eventAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a contribution amount greater than zero.');
      return;
    }
    const roomImpactAmount = eventType === 'contribution' || eventType === 'employer_contribution'
      ? amount
      : 0;
    await run('contribution', async () => {
      await recordContributionEvent({
        personId: selectedPerson.id,
        programCode,
        accountId: eventAccountId || undefined,
        periodKey: periodKey.trim(),
        occurredOn: eventDate,
        eventType,
        amount,
        roomImpactAmount,
        currency: currencyForProgram(programCode),
        notes: eventNotes.trim() || undefined,
      });
      setEventAmount('');
      setEventNotes('');
    });
  };

  const renderAccountList = (accountsToRender: typeof filteredAccounts, emptyText: string) => (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {accountsToRender.map((account) => {
        const definition = FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(account.accountType);
        const isLiability = definition?.category === 'liability';
        const isSelected = selection === 'account' && selectedAccount?.id === account.id;
        return (
          <button
            key={account.id}
            type="button"
            onClick={() => selectAccount(account.id)}
            className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-[#e8f2ed] dark:bg-[#20372d]' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
          >
            <InstitutionLogo
              institutionName={account.institutionName}
              fallback={isLiability ? <CreditCard className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              className="h-10 w-10"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{definition?.label || account.displayName}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                {account.institutionName === 'Unspecified' ? jurisdictionLabel(account.jurisdiction) : account.institutionName} · {account.currency}
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {account.legacyHoldingIds.length} holding{account.legacyHoldingIds.length === 1 ? '' : 's'}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        );
      })}
      {accountsToRender.length === 0 && <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>}
    </div>
  );

  if (!selectedPerson) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-xl font-semibold">Accounts & contribution room</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Add an owned asset before creating person profiles and financial accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${embedded ? '' : 'border-b border-slate-200 pb-5 dark:border-slate-800'}`}>
        <div>
          <h1 className={`${embedded ? 'text-xl' : 'text-2xl'} font-semibold tracking-tight`}>{mode === 'household' ? 'Profiles and access' : 'Accounts & limits'}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{mode === 'household' ? 'Profiles represent financial ownership; logins control app access.' : 'Manage accounts, liabilities, contribution room, and activity in one place.'}</p>
        </div>
        {mode !== 'household' && <div className="flex gap-2">
          {householdFinance ? (
            <Button variant="outline" onClick={() => void run('refresh', refreshHouseholdFinance)} disabled={busy !== null || currentUserRole !== 'owner'} className="rounded-lg">
              <RefreshCw className={`mr-2 h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} />
              Refresh from holdings
            </Button>
          ) : (
            <Button onClick={() => void run('initialize', initializeHouseholdFinance)} disabled={busy !== null || currentUserRole !== 'owner'} className="rounded-lg bg-[#1f6f50] text-white hover:bg-[#185c43]">
              <Save className="mr-2 h-4 w-4" />
              Save account structure
            </Button>
          )}
        </div>}
      </div>

      {!householdFinance && mode !== 'household' && (
        <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          This is a migration preview derived from existing owner, country, legacy category, and platform fields. Saving it does not change holding values.
        </div>
      )}

      {error && (
        <div className="border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>
      )}

      {(mode === 'all' || mode === 'household') && <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">People and access</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">A login grants access; the person profile owns the financial accounts.</p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {finance.people.map((person) => (
            <div key={person.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
              <div>
                <div className="font-medium">{person.displayName}</div>
                <div className="mt-1 text-sm text-slate-500">{person.jurisdictions.map(jurisdictionLabel).join(' · ') || 'No country assigned'}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Linked login</label>
                <Select
                  value={person.linkedMemberEmail || ''}
                  onChange={(event) => void run('link', () => linkFinancePerson(person.id, event.target.value || null))}
                  disabled={busy !== null || currentUserRole !== 'owner'}
                  className="rounded-lg"
                >
                  <option value="">Not linked</option>
                  {members.map((member) => <option key={member.email} value={member.email}>{member.email}</option>)}
                </Select>
              </div>
            </div>
          ))}
        </div>
      </section>}

      {(mode === 'all' || mode === 'accounts') && <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-end md:justify-between dark:border-slate-800">
          <div>
            <h2 className="font-semibold">Accounts, liabilities & contribution room</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Choose an account or program to review and update it without leaving this workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:w-[420px]">
            <Select value={selectedPerson.id} onChange={(event) => { setSelectedPersonId(event.target.value); setMobileDetailOpen(false); }} className="rounded-lg" aria-label="Person">
              {finance.people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </Select>
            <Select value={jurisdictionFilter} onChange={(event) => { setJurisdictionFilter(event.target.value as 'all' | JurisdictionCode); setMobileDetailOpen(false); }} className="rounded-lg" aria-label="Country">
              <option value="all">All countries</option>
              <option value="CA">Canada</option>
              <option value="IN">India</option>
            </Select>
          </div>
        </div>

        <div className="grid min-h-[560px] lg:h-[680px] lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
          <div className={`${mobileDetailOpen ? 'hidden lg:block' : ''} border-b border-slate-200 lg:overflow-y-auto lg:border-b-0 lg:border-r dark:border-slate-800`}>
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold">Owned accounts</h3>
            </div>
            {renderAccountList(assetAccounts, 'No owned accounts match this person and country.')}

            <div className="border-y border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold">Liabilities</h3>
            </div>
            {renderAccountList(liabilityAccounts, 'No credit, loan, or mortgage accounts identified.')}

            <div className="border-y border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold">Contribution room</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Common programs are shown first.</p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleRoomPrograms.map((program) => {
                const defaultPeriod = getDefaultPeriodKey(program.jurisdiction);
                const record = finance.roomRecords.find((candidate) => candidate.personId === selectedPerson.id && candidate.programCode === program.code && candidate.periodKey === defaultPeriod);
                const summary = calculateRoomSummary(record, finance.contributionEvents);
                const isSelected = selection === 'program' && programCode === program.code;
                return (
                  <button key={program.code} type="button" onClick={() => selectProgram(program.code)} className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-[#e8f2ed] dark:bg-[#20372d]' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                    <InstitutionLogo institutionName={programInstitution(program.code)} fallback={<Landmark className="h-4 w-4" />} className="h-10 w-10" />
                    <span>
                      <span className="block text-sm font-medium text-slate-900 dark:text-white">{program.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{record?.periodKey || defaultPeriod} · {jurisdictionLabel(program.jurisdiction)}</span>
                    </span>
                    <span className="flex items-center gap-2 text-right text-xs">
                      <span className={summary && summary.remaining < 0 ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}>{record && summary ? `${formatMoney(summary.remaining, record.currency)} left` : 'Set room'}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                );
              })}
            </div>
            {roomPrograms.length > featuredRoomPrograms.length && (
              <button type="button" onClick={() => setShowAllPrograms((current) => !current)} className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white">
                {showAllPrograms ? 'Show common programs' : `Show ${roomPrograms.length - featuredRoomPrograms.length} more programs`}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllPrograms ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          <div className={`${mobileDetailOpen ? 'block' : 'hidden lg:block'} min-w-0 lg:overflow-y-auto`}>
            <button type="button" onClick={() => setMobileDetailOpen(false)} className="flex w-full items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300 lg:hidden"><ChevronLeft className="h-4 w-4" />Back to accounts</button>
            {selection === 'account' && selectedAccount ? (
              <div>
                <div className="flex items-start gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
                  <InstitutionLogo institutionName={selectedAccount.institutionName} fallback={selectedAccountDefinition?.category === 'liability' ? <CreditCard className="h-5 w-5" /> : <Building2 className="h-5 w-5" />} className="h-12 w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{selectedAccountDefinition?.label || selectedAccount.displayName}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{selectedAccount.institutionName === 'Unspecified' ? 'Institution not set' : selectedAccount.institutionName} · {jurisdictionLabel(selectedAccount.jurisdiction)} · {selectedAccount.currency}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <div className="px-4 py-3"><dt className="text-xs text-slate-500">Owner</dt><dd className="mt-1 text-sm font-medium">{selectedPerson.displayName}</dd></div>
                  <div className="px-4 py-3"><dt className="text-xs text-slate-500">Holdings</dt><dd className="mt-1 text-sm font-medium tabular-nums">{selectedAccount.legacyHoldingIds.length}</dd></div>
                  <div className="px-4 py-3"><dt className="text-xs text-slate-500">Source</dt><dd className="mt-1 text-sm font-medium capitalize">{selectedAccount.source.replaceAll('_', ' ')}</dd></div>
                </dl>
                <div className="p-5">
                  <h4 className="text-sm font-semibold">Linked holdings</h4>
                  <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {selectedAccountHoldings.map((asset) => (
                      <div key={asset.id} className="flex items-center gap-3 px-3 py-3">
                        <AssetMarketLogo asset={asset} className="h-9 w-9 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{asset.name}</div>
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{asset.ticker || asset.assetClass} · {asset.country}</div>
                        </div>
                        <div className="text-right text-sm font-medium tabular-nums">{formatMoney(asset.quantity * (asset.currentPrice ?? (asset.quantity ? asset.costBasis / asset.quantity : 0)), asset.currency)}</div>
                      </div>
                    ))}
                    {selectedAccountHoldings.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">No holdings are linked to this account.</p>}
                  </div>
                </div>
              </div>
            ) : selectedProgram ? (
              <div>
                <div className="flex items-start gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
                  <InstitutionLogo institutionName={programInstitution(programCode)} fallback={<Landmark className="h-5 w-5" />} className="h-12 w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{selectedProgram.label}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{periodKey} · {jurisdictionLabel(selectedProgram.jurisdiction)} · {selectedProgram.roomTracking.replaceAll('_', ' ')}</p>
                  </div>
                  {selectedProgram.sourceUrl && <a href={selectedProgram.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm text-[#185c43] hover:underline dark:text-emerald-300">Guidance <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
                <dl className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <div className="px-4 py-3"><dt className="text-xs text-slate-500">Opening room</dt><dd className="mt-1 text-sm font-medium tabular-nums">{selectedRoomRecord ? formatMoney(selectedRoomRecord.openingRoom, selectedRoomRecord.currency) : 'Not set'}</dd></div>
                  <div className="px-4 py-3"><dt className="text-xs text-slate-500">Contributed</dt><dd className="mt-1 text-sm font-medium tabular-nums">{selectedRoomRecord && selectedRoomSummary ? formatMoney(selectedRoomSummary.contributed, selectedRoomRecord.currency) : '—'}</dd></div>
                  <div className="px-4 py-3"><dt className="text-xs text-slate-500">Remaining</dt><dd className={`mt-1 text-sm font-medium tabular-nums ${selectedRoomSummary && selectedRoomSummary.remaining < 0 ? 'text-rose-700 dark:text-rose-300' : ''}`}>{selectedRoomRecord && selectedRoomSummary ? formatMoney(selectedRoomSummary.remaining, selectedRoomRecord.currency) : '—'}</dd></div>
                </dl>
                <div className="flex border-b border-slate-200 px-5 dark:border-slate-800">
                  <button type="button" onClick={() => setEditorMode('room')} className={`border-b-2 px-3 py-3 text-sm font-medium ${editorMode === 'room' ? 'border-[#1f6f50] text-[#185c43] dark:text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Room balance</button>
                  <button type="button" onClick={() => setEditorMode('activity')} className={`border-b-2 px-3 py-3 text-sm font-medium ${editorMode === 'activity' ? 'border-[#1f6f50] text-[#185c43] dark:text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Record activity</button>
                </div>
                {editorMode === 'room' ? (
                  <div className="space-y-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-sm"><span className="font-medium">Program</span><Select value={programCode} onChange={(event) => selectProgram(event.target.value as FinancialAccountTypeCode)} className="rounded-lg">{roomPrograms.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}</Select></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Tax period</span><Input value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} className="rounded-lg" /></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Opening available room</span><Input type="number" min="0" step="0.01" value={openingRoom} onChange={(event) => setOpeningRoom(event.target.value)} className="rounded-lg" /></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Adjustments</span><Input type="number" step="0.01" value={adjustments} onChange={(event) => setAdjustments(event.target.value)} className="rounded-lg" /></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">As of</span><Input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} className="rounded-lg" /></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Source</span><Select value={roomSource} onChange={(event) => setRoomSource(event.target.value as typeof roomSource)} className="rounded-lg"><option value="government_record">Government record</option><option value="institution_statement">Institution statement</option><option value="user_entered">User entered</option></Select></label>
                    </div>
                    <Button onClick={() => void saveRoom()} disabled={busy !== null || !openingRoom} className="rounded-lg bg-[#1f6f50] text-white hover:bg-[#185c43]"><Save className="mr-2 h-4 w-4" />Save room</Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-sm"><span className="font-medium">Activity</span><Select value={eventType} onChange={(event) => setEventType(event.target.value as ContributionEventType)} className="rounded-lg"><option value="contribution">Contribution</option><option value="employer_contribution">Employer contribution</option><option value="withdrawal">Withdrawal</option><option value="transfer_in">Transfer in</option><option value="transfer_out">Transfer out</option></Select></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Amount</span><Input type="number" min="0" step="0.01" value={eventAmount} onChange={(event) => setEventAmount(event.target.value)} className="rounded-lg" /></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Date</span><Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="rounded-lg" /></label>
                      <label className="space-y-1 text-sm"><span className="font-medium">Financial account</span><Select value={eventAccountId} onChange={(event) => setEventAccountId(event.target.value)} className="rounded-lg"><option value="">Program total / unknown account</option>{programAccounts.map((account) => <option key={account.id} value={account.id}>{account.displayName}</option>)}</Select></label>
                      <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Notes</span><Input value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} placeholder="Optional reconciliation note" className="rounded-lg" /></label>
                    </div>
                    <Button onClick={() => void saveContribution()} disabled={busy !== null || !eventAmount} className="rounded-lg"><Plus className="mr-2 h-4 w-4" />Add activity</Button>
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"><Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />Transfers and withdrawals are recorded but do not reduce current-period room automatically.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center p-8 text-center text-sm text-slate-500">Choose an account or contribution program to view its details.</div>
            )}
          </div>
        </div>
      </section>}
    </div>
  );
}
