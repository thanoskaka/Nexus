import { AlertCircle, ArrowRight } from 'lucide-react';
import { usePortfolio } from '../store/PortfolioContext';
import { calculateRoomSummary, FINANCIAL_ACCOUNT_TYPE_BY_CODE } from '../lib/householdFinance';
import { Button } from './ui/button';

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ContributionRoomSummary({ onManage }: { onManage: () => void }) {
  const { householdFinance, householdFinancePreview } = usePortfolio();
  const finance = householdFinance || householdFinancePreview;

  const rows = finance.roomRecords
    .map((record) => {
      const person = finance.people.find((candidate) => candidate.id === record.personId);
      const summary = calculateRoomSummary(record, finance.contributionEvents);
      return {
        id: record.id,
        person: person?.displayName || 'Household member',
        program: FINANCIAL_ACCOUNT_TYPE_BY_CODE.get(record.programCode)?.label || record.programCode,
        remaining: summary?.remaining ?? record.openingRoom,
        contributed: summary?.contributed ?? 0,
        currency: record.currency,
        period: record.periodKey,
      };
    })
    .sort((left, right) => left.remaining - right.remaining)
    .slice(0, 4);

  return (
    <section className="border-y border-slate-200 py-4 dark:border-slate-800" aria-labelledby="limits-summary-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-[190px]">
          <h2 id="limits-summary-title" className="text-sm font-semibold text-slate-900 dark:text-white">Limits & contributions</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current-period room across household programs.</p>
        </div>

        {rows.length > 0 ? (
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
              <div key={row.id} className="border-l border-slate-200 pl-4 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">{row.person} · {row.program} · {row.period}</div>
                <div className={`mt-1 text-base font-semibold tabular-nums ${row.remaining < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>{formatMoney(row.remaining, row.currency)} remaining</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatMoney(row.contributed, row.currency)} contributed</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            Add the official opening balance for TFSA, RRSP, FHSA, PPF, NPS, or another tracked program.
          </div>
        )}

        <Button type="button" variant="outline" onClick={onManage} className="shrink-0 rounded-lg">Manage <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </section>
  );
}
