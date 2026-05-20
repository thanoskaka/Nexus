import React from 'react';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'NA';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

export function MemberAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
      {getInitials(name)}
    </span>
  );
}
