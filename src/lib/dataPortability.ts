import type { Asset, AssetClassDef } from '../store/db';
import type { PortfolioBaseCurrency, PortfolioCurrency } from '../store/portfolioHelpers';
import { CHECKLIST_STORAGE_KEY } from './checklistTypes';

export const NEXUS_EXPORT_VERSION = 1;
export const NEXUS_APP_ID = 'nexus-portfolio';

export interface ExportedConnectedAccount {
  provider: string;
  status: string;
  connectedAt?: number;
  lastSyncAt?: number;
  accountCount: number;
  holdingsCount: number;
  positionsCount: number;
}

export interface ExportedPortfolio {
  id?: string;
  name?: string;
  assets: Asset[];
  assetClasses: AssetClassDef[];
  baseCurrency: PortfolioBaseCurrency;
  primaryCurrency?: PortfolioCurrency;
  secondaryCurrency?: PortfolioCurrency;
}

export interface NexusExportData {
  nexusExportVersion: typeof NEXUS_EXPORT_VERSION;
  app: typeof NEXUS_APP_ID;
  exportedAt: string;
  portfolios: ExportedPortfolio[];
  connectedAccounts?: ExportedConnectedAccount[];
  preferences?: {
    checklist?: Record<string, string> | null;
  };
}

export interface ImportPreview {
  portfolioCount: number;
  assets: number;
  assetClasses: number;
  connectedAccounts: number;
  hasChecklist: boolean;
  warnings: string[];
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  assets: Asset[];
  assetClasses: AssetClassDef[];
  baseCurrency?: PortfolioBaseCurrency;
  primaryCurrency?: PortfolioCurrency;
  secondaryCurrency?: PortfolioCurrency;
}

export interface ValidationResult {
  valid: boolean;
  data?: NexusExportData;
  errors: string[];
}

export function validateImportPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (raw === null || raw === undefined) {
    return { valid: false, errors: ['Empty or null payload.'] };
  }

  if (typeof raw !== 'object') {
    return { valid: false, errors: ['Payload is not a JSON object.'] };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.nexusExportVersion !== NEXUS_EXPORT_VERSION) {
    const version = typeof obj.nexusExportVersion === 'number'
      ? obj.nexusExportVersion
      : String(obj.nexusExportVersion);
    return {
      valid: false,
      errors: [`Unsupported schema version: ${version}. Expected version ${NEXUS_EXPORT_VERSION}.`],
    };
  }

  if (obj.app !== NEXUS_APP_ID) {
    return {
      valid: false,
      errors: [`Unknown app identifier: "${String(obj.app)}". Expected "${NEXUS_APP_ID}".`],
    };
  }

  if (!Array.isArray(obj.portfolios)) {
    return {
      valid: false,
      errors: ['Missing or invalid "portfolios" array.'],
    };
  }

  for (let i = 0; i < obj.portfolios.length; i++) {
    const portfolio = obj.portfolios[i];
    if (!portfolio || typeof portfolio !== 'object') {
      errors.push(`Portfolio at index ${i} is not a valid object.`);
      continue;
    }

    const pf = portfolio as Record<string, unknown>;

    if (!Array.isArray(pf.assets)) {
      errors.push(`Portfolio ${i}: missing or invalid "assets" array.`);
    }

    if (!Array.isArray(pf.assetClasses)) {
      errors.push(`Portfolio ${i}: missing or invalid "assetClasses" array.`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: raw as NexusExportData, errors: [] };
}

export function getImportPreview(data: NexusExportData): ImportPreview {
  const warnings: string[] = [];
  let assets = 0;
  let assetClasses = 0;

  for (const portfolio of data.portfolios) {
    assets += Array.isArray(portfolio.assets) ? portfolio.assets.length : 0;
    assetClasses += Array.isArray(portfolio.assetClasses) ? portfolio.assetClasses.length : 0;
  }

  if (assets === 0) {
    warnings.push('No assets found in export.');
  }

  if (assetClasses === 0) {
    warnings.push('No asset classes found in export.');
  }

  const hasChecklist = Boolean(
    data.preferences?.checklist && Object.keys(data.preferences.checklist).length > 0,
  );

  return {
    portfolioCount: data.portfolios.length,
    assets,
    assetClasses,
    connectedAccounts: Array.isArray(data.connectedAccounts) ? data.connectedAccounts.length : 0,
    hasChecklist,
    warnings,
  };
}

export function computeImportResult(
  data: NexusExportData,
  mode: ImportMode,
  currentAssets: Asset[],
  currentClasses: AssetClassDef[],
): ImportResult {
  const firstPortfolio = data.portfolios[0];
  if (!firstPortfolio) {
    return { assets: currentAssets, assetClasses: currentClasses };
  }

  const importedAssets: Asset[] = firstPortfolio.assets || [];
  const importedClasses: AssetClassDef[] = firstPortfolio.assetClasses || [];

  if (mode === 'replace') {
    return {
      assets: importedAssets,
      assetClasses: importedClasses,
      baseCurrency: firstPortfolio.baseCurrency,
      primaryCurrency: firstPortfolio.primaryCurrency,
      secondaryCurrency: firstPortfolio.secondaryCurrency,
    };
  }

  const existingAssetIds = new Set(currentAssets.map((a) => a.id));
  const existingClassIds = new Set(currentClasses.map((c) => c.id));
  const existingClassNames = new Set(currentClasses.map((c) => c.name.toLowerCase()));

  const mergedAssets = [
    ...currentAssets,
    ...importedAssets.filter((a) => !existingAssetIds.has(a.id)),
  ];

  const mergedClasses = [
    ...currentClasses,
    ...importedClasses.filter(
      (c) => !existingClassIds.has(c.id) && !existingClassNames.has(c.name.toLowerCase()),
    ),
  ];

  return {
    assets: mergedAssets,
    assetClasses: mergedClasses,
    baseCurrency: firstPortfolio.baseCurrency,
    primaryCurrency: firstPortfolio.primaryCurrency,
    secondaryCurrency: firstPortfolio.secondaryCurrency,
  };
}

export interface ExportDataParams {
  assets: Asset[];
  assetClasses: AssetClassDef[];
  baseCurrency: PortfolioBaseCurrency;
  primaryCurrency?: PortfolioCurrency;
  secondaryCurrency?: PortfolioCurrency;
  portfolioId?: string;
  portfolioName?: string;
  connectedAccounts?: {
    upstox?: {
      status: string;
      connectedAt?: number;
      lastSyncAt?: number;
      accountCount: number;
      holdingsCount: number;
      positionsCount: number;
    } | null;
  };
}

export function buildExportPayload(params: ExportDataParams): NexusExportData {
  const connectedAccounts: ExportedConnectedAccount[] = [];

  if (params.connectedAccounts?.upstox && params.connectedAccounts.upstox.status !== 'disconnected') {
    const u = params.connectedAccounts.upstox;
    connectedAccounts.push({
      provider: 'upstox',
      status: u.status,
      connectedAt: u.connectedAt,
      lastSyncAt: u.lastSyncAt,
      accountCount: u.accountCount,
      holdingsCount: u.holdingsCount,
      positionsCount: u.positionsCount,
    });
  }

  const exportData: NexusExportData = {
    nexusExportVersion: NEXUS_EXPORT_VERSION,
    app: NEXUS_APP_ID,
    exportedAt: new Date().toISOString(),
    portfolios: [
      {
        id: params.portfolioId,
        name: params.portfolioName,
        assets: params.assets,
        assetClasses: params.assetClasses,
        baseCurrency: params.baseCurrency,
        primaryCurrency: params.primaryCurrency,
        secondaryCurrency: params.secondaryCurrency,
      },
    ],
    connectedAccounts: connectedAccounts.length > 0 ? connectedAccounts : undefined,
  };

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (raw) {
        const checklist = JSON.parse(raw);
        if (checklist && typeof checklist === 'object' && Object.keys(checklist).length > 0) {
          exportData.preferences = { checklist };
        }
      }
    } catch {
    }
  }

  return exportData;
}

export function downloadExportFile(data: NexusExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nexus-portfolio-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
