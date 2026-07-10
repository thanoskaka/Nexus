import React from 'react';
import { Asset } from '../store/db';
import { AssetClassLogo } from './assetClassBranding';

type AssetLogoResolution =
  | {
      kind: 'ticker';
      src: string;
      alt: string;
      cacheKey: string;
    }
  | {
      kind: 'domain';
      src: string;
      alt: string;
      cacheKey: string;
    }
  | {
      kind: 'fallback';
    };

const LOGO_DEV_TOKEN = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY?.trim() || '';
const failedLogoKeys = new Set<string>();

const INSTITUTION_DOMAIN_RULES: Array<{ matchers: string[]; domain: string }> = [
  { matchers: ['wealthsimple'], domain: 'wealthsimple.com' },
  { matchers: ['questrade'], domain: 'questrade.com' },
  { matchers: ['royal bank', 'rbc'], domain: 'rbc.com' },
  { matchers: ['toronto dominion', 'td bank', 'td direct'], domain: 'td.com' },
  { matchers: ['scotiabank', 'scotia'], domain: 'scotiabank.com' },
  { matchers: ['bank of montreal', 'bmo'], domain: 'bmo.com' },
  { matchers: ['cibc'], domain: 'cibc.com' },
  { matchers: ['national bank'], domain: 'nbc.ca' },
  { matchers: ['manulife'], domain: 'manulife.ca' },
  { matchers: ['sun life'], domain: 'sunlife.ca' },
  { matchers: ['hdfc bank'], domain: 'hdfcbank.com' },
  { matchers: ['icici bank'], domain: 'icicibank.com' },
  { matchers: ['state bank', 'sbi'], domain: 'sbi.co.in' },
  { matchers: ['axis bank'], domain: 'axisbank.com' },
  { matchers: ['kotak'], domain: 'kotak.com' },
  { matchers: ['zerodha'], domain: 'zerodha.com' },
  { matchers: ['upstox'], domain: 'upstox.com' },
  { matchers: ['groww'], domain: 'groww.in' },
  { matchers: ['epfo'], domain: 'epfindia.gov.in' },
  { matchers: ['pfrda', 'nps'], domain: 'pfrda.org.in' },
  { matchers: ['india post'], domain: 'indiapost.gov.in' },
  { matchers: ['government of canada', 'cra'], domain: 'canada.ca' },
];

const AMC_DOMAIN_RULES: Array<{ matchers: string[]; domain: string }> = [
  { matchers: ['axis'], domain: 'axismf.com' },
  { matchers: ['sbi'], domain: 'sbimf.com' },
  { matchers: ['icici prudential', 'icici pru'], domain: 'icicipruamc.com' },
  { matchers: ['nippon india', 'reliance mutual'], domain: 'nipponindiamf.com' },
  { matchers: ['hdfc'], domain: 'hdfcfund.com' },
  { matchers: ['tata'], domain: 'tatamutualfund.com' },
  { matchers: ['parag parikh', 'ppfas'], domain: 'amc.ppfas.com' },
  { matchers: ['uti'], domain: 'utimf.com' },
  { matchers: ['aditya birla', 'birla sun life'], domain: 'mutualfund.adityabirlacapital.com' },
  { matchers: ['kotak'], domain: 'kotakmf.com' },
  { matchers: ['mirae asset'], domain: 'miraeassetmf.co.in' },
  { matchers: ['franklin templeton'], domain: 'franklintempletonindia.com' },
  { matchers: ['bandhan'], domain: 'bandhanmutual.com' },
  { matchers: ['quant'], domain: 'quantmutual.com' },
  { matchers: ['dsp'], domain: 'dspim.com' },
  { matchers: ['edelweiss'], domain: 'edelweissmf.com' },
];

export function resolveAssetLogo(asset: Asset): AssetLogoResolution {
  if (!LOGO_DEV_TOKEN) {
    return { kind: 'fallback' };
  }

  if (usesFundHouseLogo(asset)) {
    const domain = getFundHouseDomain(asset.name);
    if (domain) {
      const src = buildDomainLogoUrl(domain);
      return {
        kind: 'domain',
        src,
        alt: `${asset.name} fund house logo`,
        cacheKey: `domain:${domain}`,
      };
    }
  }

  const tickerSymbol = normalizeTickerForLogoDev(asset.ticker || '');
  if (tickerSymbol) {
    const src = buildTickerLogoUrl(tickerSymbol);
    return {
      kind: 'ticker',
      src,
      alt: `${asset.name} logo`,
      cacheKey: `ticker:${tickerSymbol}`,
    };
  }

  return { kind: 'fallback' };
}

export function AssetMarketLogo({
  asset,
  className = '',
}: {
  asset: Asset;
  className?: string;
}) {
  const resolution = resolveAssetLogo(asset);
  const [failed, setFailed] = React.useState(
    resolution.kind !== 'fallback' ? failedLogoKeys.has(resolution.cacheKey) : false,
  );

  React.useEffect(() => {
    if (resolution.kind === 'fallback') {
      setFailed(false);
      return;
    }
    setFailed(failedLogoKeys.has(resolution.cacheKey));
  }, [resolution]);

  if (resolution.kind === 'fallback' || failed) {
    return <AssetClassLogo name={asset.assetClass} className={className} />;
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 ${className}`}>
      <img
        src={resolution.src}
        alt={resolution.alt}
        className="h-full w-full object-contain p-1"
        loading="lazy"
        onError={() => {
          failedLogoKeys.add(resolution.cacheKey);
          setFailed(true);
        }}
      />
    </div>
  );
}

export function InstitutionLogo({
  institutionName,
  fallback,
  className = '',
}: {
  institutionName: string;
  fallback: React.ReactNode;
  className?: string;
}) {
  const normalized = institutionName.trim().toLowerCase();
  const domain = INSTITUTION_DOMAIN_RULES.find((rule) => rule.matchers.some((matcher) => normalized.includes(matcher)))?.domain;
  const resolution = LOGO_DEV_TOKEN && normalized && normalized !== 'unspecified'
    ? {
        src: domain ? buildDomainLogoUrl(domain) : buildNameLogoUrl(institutionName),
        cacheKey: domain ? `domain:${domain}` : `name:${normalized}`,
      }
    : null;
  const [failed, setFailed] = React.useState(resolution ? failedLogoKeys.has(resolution.cacheKey) : false);

  React.useEffect(() => {
    setFailed(resolution ? failedLogoKeys.has(resolution.cacheKey) : false);
  }, [resolution?.cacheKey]);

  if (!resolution || failed) {
    return <div className={`flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 ${className}`}>{fallback}</div>;
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 ${className}`}>
      <img
        src={resolution.src}
        alt={`${institutionName} logo`}
        className="h-full w-full object-contain p-1"
        loading="lazy"
        onError={() => {
          failedLogoKeys.add(resolution.cacheKey);
          setFailed(true);
        }}
      />
    </div>
  );
}

function buildTickerLogoUrl(symbol: string) {
  return `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${encodeURIComponent(LOGO_DEV_TOKEN)}&retina=true&format=png&theme=light&fallback=404`;
}

function buildDomainLogoUrl(domain: string) {
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(LOGO_DEV_TOKEN)}&retina=true&format=png&theme=light&fallback=404`;
}

function buildNameLogoUrl(name: string) {
  return `https://img.logo.dev/name/${encodeURIComponent(name.trim())}?token=${encodeURIComponent(LOGO_DEV_TOKEN)}&retina=true&format=png&theme=light&fallback=404`;
}

function usesFundHouseLogo(asset: Asset) {
  const normalizedClass = asset.assetClass.trim().toLowerCase();
  const normalizedCountry = asset.country.trim().toLowerCase();
  return normalizedCountry === 'india' && (normalizedClass.includes('mutual') || normalizedClass === 'mf' || normalizedClass === 'mfs');
}

function getFundHouseDomain(name: string) {
  const normalized = name.trim().toLowerCase();
  for (const rule of AMC_DOMAIN_RULES) {
    if (rule.matchers.some((matcher) => normalized.includes(matcher))) {
      return rule.domain;
    }
  }
  return '';
}

export function normalizeTickerForLogoDev(ticker: string) {
  const trimmed = ticker.trim().toUpperCase();
  if (!trimmed) return '';

  if (trimmed.startsWith('NASDAQ:')) return trimmed.slice(7);
  if (trimmed.startsWith('NYSE:')) return trimmed.slice(5);
  if (trimmed.startsWith('AMEX:')) return trimmed.slice(5);
  if (trimmed.startsWith('TSE:') || trimmed.startsWith('TSX:')) return `${trimmed.split(':')[1]}.TO`;
  if (trimmed.startsWith('CVE:') || trimmed.startsWith('TSXV:')) return `${trimmed.split(':')[1]}.V`;
  if (trimmed.startsWith('NSE:')) return `${trimmed.slice(4)}.IN`;
  if (/^[^:]+:TO$/.test(trimmed)) return `${trimmed.slice(0, -3)}.TO`;
  if (/^[^:]+:V$/.test(trimmed)) return `${trimmed.slice(0, -2)}.V`;
  if (trimmed.endsWith('.NS')) return `${trimmed.slice(0, -3)}.IN`;
  if (trimmed.endsWith('.TO') || trimmed.endsWith('.V') || trimmed.endsWith('.IN')) return trimmed;

  // Prefer company-name lookup for Bombay listings until exchange support is confirmed.
  if (trimmed.startsWith('BOM:') || trimmed.endsWith('.BO')) return '';

  if (!trimmed.includes(':') && !trimmed.includes('.')) return trimmed;

  return '';
}
