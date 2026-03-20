import React from 'react';
import { Briefcase, Building2, Coins, Gem, Globe, Home, Landmark, Layers3, PieChart, Shield, Sparkles, TrendingUp, Wallet } from 'lucide-react';

type Branding = {
  bgClass: string;
  iconClass: string;
  icon: React.ReactNode;
};

function getBranding(name: string): Branding {
  const value = name.toLowerCase();

  if (value.includes('mutual fund') || value.includes('index fund') || value.includes('etf')) {
    return {
      bgClass: 'bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500',
      iconClass: 'text-white',
      icon: <PieChart className="h-5 w-5" />,
    };
  }

  if (value.includes('stock') || value.includes('equity') || value.includes('share')) {
    return {
      bgClass: 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600',
      iconClass: 'text-white',
      icon: <TrendingUp className="h-5 w-5" />,
    };
  }

  if (value.includes('gold') || value.includes('silver') || value.includes('commodity')) {
    return {
      bgClass: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500',
      iconClass: 'text-slate-950',
      icon: <Gem className="h-5 w-5" />,
    };
  }

  if (value.includes('real estate') || value.includes('property') || value.includes('home')) {
    return {
      bgClass: 'bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500',
      iconClass: 'text-white',
      icon: <Home className="h-5 w-5" />,
    };
  }

  if (value.includes('deposit') || value.includes('fd') || value.includes('bond') || value.includes('gic')) {
    return {
      bgClass: 'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500',
      iconClass: 'text-white',
      icon: <Building2 className="h-5 w-5" />,
    };
  }

  if (value.includes('provident') || value.includes('epf') || value.includes('ppf') || value.includes('retirement') || value.includes('pension')) {
    return {
      bgClass: 'bg-gradient-to-br from-cyan-400 via-teal-500 to-emerald-600',
      iconClass: 'text-white',
      icon: <Landmark className="h-5 w-5" />,
    };
  }

  if (value.includes('nps') || value.includes('insurance') || value.includes('shield')) {
    return {
      bgClass: 'bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500',
      iconClass: 'text-white',
      icon: <Shield className="h-5 w-5" />,
    };
  }

  if (value.includes('cash') || value.includes('savings') || value.includes('wallet')) {
    return {
      bgClass: 'bg-gradient-to-br from-lime-400 via-emerald-500 to-green-600',
      iconClass: 'text-white',
      icon: <Wallet className="h-5 w-5" />,
    };
  }

  if (value.includes('tfsa') || value.includes('rrsp') || value.includes('fhsa') || value.includes('account')) {
    return {
      bgClass: 'bg-gradient-to-br from-red-400 via-orange-500 to-amber-500',
      iconClass: 'text-white',
      icon: <Briefcase className="h-5 w-5" />,
    };
  }

  if (value.includes('crypto') || value.includes('bitcoin') || value.includes('digital')) {
    return {
      bgClass: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600',
      iconClass: 'text-white',
      icon: <Coins className="h-5 w-5" />,
    };
  }

  if (value.includes('international') || value.includes('global')) {
    return {
      bgClass: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600',
      iconClass: 'text-white',
      icon: <Globe className="h-5 w-5" />,
    };
  }

  if (value.includes('alternative') || value.includes('other')) {
    return {
      bgClass: 'bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900',
      iconClass: 'text-white',
      icon: <Sparkles className="h-5 w-5" />,
    };
  }

  return {
    bgClass: 'bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600',
    iconClass: 'text-white',
    icon: <Layers3 className="h-5 w-5" />,
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
        <img src={image} alt={`${name} logo`} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl shadow-sm ${branding.bgClass} ${branding.iconClass} ${className}`}>
      {branding.icon}
    </div>
  );
}
