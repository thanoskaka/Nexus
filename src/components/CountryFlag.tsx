import React from 'react';

function flagForCountry(country: string) {
  const normalized = country.trim().toLowerCase();
  if (normalized === 'canada') return '🇨🇦';
  if (normalized === 'india') return '🇮🇳';
  return '🏳️';
}

export function CountryFlag({ country }: { country: string }) {
  return (
    <span role="img" aria-label={`${country} flag`} title={country}>
      {flagForCountry(country)}
    </span>
  );
}
