import React from 'react';
import { ExternalLink, Link2, Plus, RefreshCw, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { usePortfolio } from '../store/PortfolioContext';
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

export function AccountsRoom() {
  const {
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

  const trackedJurisdictions = selectedPerson?.jurisdictions.filter((code): code is 'CA' | 'IN' => code === 'CA' || code === 'IN') || [];
  const roomPrograms = trackedJurisdictions.flatMap((jurisdiction) => getRoomPrograms(jurisdiction));
  const selectedProgram = FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(programCode);
  const programAccounts = finance.accounts.filter((account) =>
    account.ownerPersonId === selectedPerson?.id && account.accountType === programCode
  );

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
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts & contribution room</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Balances remain with one person and one country. Room is tracked across accounts for the same program.</p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {!householdFinance && (
        <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          This is a migration preview derived from existing owner, country, asset class, and platform fields. Saving it does not change holding values.
        </div>
      )}

      {error && (
        <div className="border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
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
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-end md:justify-between dark:border-slate-800">
          <div>
            <h2 className="font-semibold">Financial accounts</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Derived accounts group holdings by person, country, program, institution, and currency.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:w-[420px]">
            <Select value={selectedPerson.id} onChange={(event) => setSelectedPersonId(event.target.value)} className="rounded-lg" aria-label="Person">
              {finance.people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </Select>
            <Select value={jurisdictionFilter} onChange={(event) => setJurisdictionFilter(event.target.value as 'all' | JurisdictionCode)} className="rounded-lg" aria-label="Country">
              <option value="all">All countries</option>
              <option value="CA">Canada</option>
              <option value="IN">India</option>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 font-medium">Country</th>
                <th className="px-5 py-3 font-medium">Institution</th>
                <th className="px-5 py-3 font-medium">Currency</th>
                <th className="px-5 py-3 text-right font-medium">Holdings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-5 py-3 font-medium">{FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(account.accountType)?.label || account.displayName}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{jurisdictionLabel(account.jurisdiction)}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{account.institutionName}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{account.currency}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{account.legacyHoldingIds.length}</td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No accounts match this person and country.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Contribution room</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Use the room shown by the relevant authority or statement, then record activity after that baseline.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3 font-medium">Program</th>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 text-right font-medium">Opening room</th>
                <th className="px-5 py-3 text-right font-medium">Contributed</th>
                <th className="px-5 py-3 text-right font-medium">Remaining</th>
                <th className="px-5 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {roomPrograms.map((program) => {
                const defaultPeriod = getDefaultPeriodKey(program.jurisdiction);
                const record = finance.roomRecords.find((candidate) =>
                  candidate.personId === selectedPerson.id
                  && candidate.programCode === program.code
                  && candidate.periodKey === defaultPeriod
                );
                const summary = calculateRoomSummary(record, finance.contributionEvents);
                return (
                  <tr key={program.code}>
                    <td className="px-5 py-3">
                      <button type="button" className="font-medium text-[#185c43] hover:underline dark:text-emerald-300" onClick={() => setProgram(program.code)}>{program.label}</button>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{record?.periodKey || defaultPeriod}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{record ? formatMoney(record.openingRoom, record.currency) : 'Not set'}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{record && summary ? formatMoney(summary.contributed, record.currency) : '—'}</td>
                    <td className={`px-5 py-3 text-right font-medium tabular-nums ${summary && summary.remaining < 0 ? 'text-rose-700 dark:text-rose-300' : ''}`}>{record && summary ? formatMoney(summary.remaining, record.currency) : '—'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {record ? record.source.replaceAll('_', ' ') : program.roomTracking.replaceAll('_', ' ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid border-t border-slate-200 dark:border-slate-800 lg:grid-cols-2">
          <div className="space-y-4 p-5 lg:border-r lg:border-slate-200 dark:lg:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Set opening room</h3>
              {selectedProgram?.sourceUrl && (
                <a href={selectedProgram.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#185c43] hover:underline dark:text-emerald-300">Official guidance <ExternalLink className="h-3.5 w-3.5" /></a>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="font-medium">Program</span><Select value={programCode} onChange={(event) => setProgram(event.target.value as FinancialAccountTypeCode)} className="rounded-lg">{roomPrograms.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}</Select></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Tax period</span><Input value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} className="rounded-lg" /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Opening available room</span><Input type="number" min="0" step="0.01" value={openingRoom} onChange={(event) => setOpeningRoom(event.target.value)} className="rounded-lg" /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Adjustments</span><Input type="number" step="0.01" value={adjustments} onChange={(event) => setAdjustments(event.target.value)} className="rounded-lg" /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">As of</span><Input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} className="rounded-lg" /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Source</span><Select value={roomSource} onChange={(event) => setRoomSource(event.target.value as typeof roomSource)} className="rounded-lg"><option value="government_record">Government record</option><option value="institution_statement">Institution statement</option><option value="user_entered">User entered</option></Select></label>
            </div>
            <Button onClick={() => void saveRoom()} disabled={busy !== null || !openingRoom} className="rounded-lg bg-[#1f6f50] text-white hover:bg-[#185c43]"><Save className="mr-2 h-4 w-4" />Save room</Button>
          </div>

          <div className="space-y-4 p-5">
            <h3 className="font-semibold">Record account activity</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="font-medium">Activity</span><Select value={eventType} onChange={(event) => setEventType(event.target.value as ContributionEventType)} className="rounded-lg"><option value="contribution">Contribution</option><option value="employer_contribution">Employer contribution</option><option value="withdrawal">Withdrawal</option><option value="transfer_in">Transfer in</option><option value="transfer_out">Transfer out</option></Select></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Amount</span><Input type="number" min="0" step="0.01" value={eventAmount} onChange={(event) => setEventAmount(event.target.value)} className="rounded-lg" /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Date</span><Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="rounded-lg" /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Financial account</span><Select value={eventAccountId} onChange={(event) => setEventAccountId(event.target.value)} className="rounded-lg"><option value="">Program total / unknown account</option>{programAccounts.map((account) => <option key={account.id} value={account.id}>{account.displayName}</option>)}</Select></label>
              <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Notes</span><Input value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} placeholder="Optional reconciliation note" className="rounded-lg" /></label>
            </div>
            <Button onClick={() => void saveContribution()} disabled={busy !== null || !eventAmount} className="rounded-lg"><Plus className="mr-2 h-4 w-4" />Add activity</Button>
            <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"><Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />Transfers and withdrawals are recorded but do not reduce current-period room automatically. Use the next period’s authoritative opening room or an explicit adjustment.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
