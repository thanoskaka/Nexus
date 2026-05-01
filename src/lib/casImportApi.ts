import { auth } from './firebase';

export type CasMutualFundHolding = {
  folioNumber: string;
  amc?: string;
  schemeName: string;
  isin?: string;
  units: number;
  nav?: number;
  value?: number;
  investedValue?: number;
  asOf?: string;
};

export type CasImportResponse = {
  meta?: { cas_type?: string };
  investor?: { name?: string; pan?: string; email?: string; mobile?: string };
  summary?: { total_value?: number };
  mutualFunds: CasMutualFundHolding[];
};

async function requireAuthToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to import a CAS PDF.');
  }
  return currentUser.getIdToken();
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text().catch(() => '');
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: string }).error || `Request failed (${response.status})`)
      : text.trim() || `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (payload == null) {
    throw new Error('Server returned an empty response. Please retry.');
  }
  return payload as T;
}

export async function importCasPdf(file: File, password?: string) {
  const token = await requireAuthToken();
  const form = new FormData();
  form.set('pdf_file', file, file.name || 'cas.pdf');
  if (password) form.set('password', password);

  const response = await fetch('/api/connections/cas/import', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  return parseJsonResponse<CasImportResponse>(response);
}
