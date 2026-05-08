import React from 'react';
import {
  BadgeDollarSign,
  Briefcase,
  Building2,
  ChartCandlestick,
  Coins,
  Gem,
  Globe,
  HandCoins,
  Home,
  Landmark,
  Layers3,
  PieChart,
  ReceiptText,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

type Branding = {
  bgClass: string;
  iconClass: string;
  icon: React.ReactNode;
};

type AssetBrandingRule = {
  category: string;
  matchers: string[];
  icon: React.ReactNode;
  bgClass: string;
  iconClass: string;
};

const BRANDING_RULES: AssetBrandingRule[] = [
  {
    category: 'index-fund',
    matchers: ['index fund'],
    icon: <Layers3 className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-teal-400 via-cyan-500 to-sky-600',
    iconClass: 'text-white',
  },
  {
    category: 'mutual-fund',
    matchers: ['mutual fund', 'mf'],
    icon: <Landmark className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500',
    iconClass: 'text-white',
  },
  {
    category: 'etf',
    matchers: ['etf'],
    icon: <PieChart className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600',
    iconClass: 'text-white',
  },
  {
    category: 'stock',
    matchers: ['stock', 'equity', 'share'],
    icon: <ChartCandlestick className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600',
    iconClass: 'text-white',
  },
  {
    category: 'bond',
    matchers: ['bond', 'debt', 'fixed income'],
    icon: <ReceiptText className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500',
    iconClass: 'text-white',
  },
  {
    category: 'fixed-deposit',
    matchers: ['fixed deposit', 'term deposit', 'fd', 'gic'],
    icon: <BadgeDollarSign className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700',
    iconClass: 'text-white',
  },
  {
    category: 'cash',
    matchers: ['cash', 'savings', 'checking', 'wallet'],
    icon: <Wallet className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-lime-400 via-emerald-500 to-green-600',
    iconClass: 'text-white',
  },
  {
    category: 'gold',
    matchers: ['gold'],
    icon: <Gem className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500',
    iconClass: 'text-slate-950',
  },
  {
    category: 'silver',
    matchers: ['silver'],
    icon: <Gem className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-slate-300 via-gray-400 to-zinc-500',
    iconClass: 'text-white',
  },
  {
    category: 'commodity',
    matchers: ['commodity'],
    icon: <Gem className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600',
    iconClass: 'text-white',
  },
  {
    category: 'real-estate',
    matchers: ['real estate', 'property', 'home', 'reit'],
    icon: <Home className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500',
    iconClass: 'text-white',
  },
  {
    category: 'retirement',
    matchers: ['retirement', 'pension', 'nps'],
    icon: <Shield className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-cyan-400 via-teal-500 to-emerald-600',
    iconClass: 'text-white',
  },
  {
    category: 'provident-fund',
    matchers: ['provident fund', 'provident', 'epf', 'ppf'],
    icon: <Building2 className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
    iconClass: 'text-white',
  },
  {
    category: 'insurance',
    matchers: ['insurance'],
    icon: <ShieldCheck className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500',
    iconClass: 'text-white',
  },
  {
    category: 'crypto',
    matchers: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'digital asset', 'digital'],
    icon: <Coins className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600',
    iconClass: 'text-white',
  },
  {
    category: 'loan',
    matchers: ['loan', 'liability', 'debt owed'],
    icon: <HandCoins className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-red-400 via-orange-500 to-amber-500',
    iconClass: 'text-white',
  },
  {
    category: 'splitwise',
    matchers: ['splitwise', 'receivable', 'payable', 'settlement'],
    icon: <Users className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-pink-400 via-rose-500 to-red-600',
    iconClass: 'text-white',
  },
  {
    category: 'broker',
    matchers: ['broker', 'trading account', 'connected account', 'tfsa', 'rrsp', 'fhsa'],
    icon: <Briefcase className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600',
    iconClass: 'text-white',
  },
  {
    category: 'international',
    matchers: ['international', 'global'],
    icon: <Globe className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600',
    iconClass: 'text-white',
  },
  {
    category: 'alternative',
    matchers: ['alternative'],
    icon: <Sparkles className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900',
    iconClass: 'text-white',
  },
  {
    category: 'other',
    matchers: ['other', 'uncategorized'],
    icon: <Layers3 className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700',
    iconClass: 'text-white',
  },
];

function matchAssetClass(name: string, matchers: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  for (const matcher of matchers) {
    const m = matcher.toLowerCase();
    if (m.length <= 2) {
      if (normalized === m) return true;
      const words = normalized.split(/\s+/);
      if (words.includes(m)) return true;
    } else {
      if (normalized.includes(m)) return true;
    }
  }
  return false;
}

export function resolveAssetClassBranding(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return 'other';
  for (const rule of BRANDING_RULES) {
    if (matchAssetClass(normalized, rule.matchers)) {
      return rule.category;
    }
  }
  return 'other';
}

function getBranding(name: string): Branding {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return {
      icon: <Layers3 className="h-5 w-5" />,
      bgClass: 'bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600',
      iconClass: 'text-white',
    };
  }
  for (const rule of BRANDING_RULES) {
    if (matchAssetClass(normalized, rule.matchers)) {
      return {
        icon: rule.icon,
        bgClass: rule.bgClass,
        iconClass: rule.iconClass,
      };
    }
  }
  return {
    icon: <Layers3 className="h-5 w-5" />,
    bgClass: 'bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600',
    iconClass: 'text-white',
  };
}

export function AssetClassLogo({
  name,
  image,
  className = '',
}: {
  name: string;
  image?: string;
  className?: string;
}) {
  const branding = getBranding(name);

  if (image) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ${className}`}>
        <img src={image} alt={`${name} logo`} className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl shadow-sm ${branding.bgClass} ${branding.iconClass} ${className}`}>
      {branding.icon}
    </div>
  );
}
