import { AssetClassDef } from '../store/db';

export const SYSTEM_ASSET_CLASSES: AssetClassDef[] = [
  { id: 'system-india-credit-card', country: 'India', name: 'Credit Card' },
  { id: 'system-canada-credit-card', country: 'Canada', name: 'Credit Card' },
];

export function getSystemAssetClassesForCountry(country: string) {
  return SYSTEM_ASSET_CLASSES.filter((assetClass) => assetClass.country === country);
}
