export type CasParserInvestor = {
  name?: string;
  pan?: string;
  email?: string;
  mobile?: string;
};

export type CasParserScheme = {
  name?: string;
  isin?: string;
  units?: number;
  nav?: number;
  value?: number;
  invested_value?: number;
  as_of?: string;
};

export type CasParserMutualFundFolio = {
  folio_number?: string;
  amc?: string;
  schemes?: CasParserScheme[];
};

export type CasParserSmartParseResponse = {
  meta?: {
    cas_type?: string;
  };
  investor?: CasParserInvestor;
  summary?: {
    total_value?: number;
  };
  mutual_funds?: CasParserMutualFundFolio[];
};

function safeJson(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function safeNumber(value: unknown) {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(num) ? num : undefined;
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeSmartParseResponse(payload: unknown): CasParserSmartParseResponse {
  const root = safeJson(payload) || {};
  const meta = safeJson(root.meta);
  const investor = safeJson(root.investor);
  const summary = safeJson(root.summary);

  const mutualFundsRaw = Array.isArray(root.mutual_funds) ? root.mutual_funds : [];
  const mutual_funds = mutualFundsRaw.map((folio) => {
    const folioObj = safeJson(folio) || {};
    const schemesRaw = Array.isArray(folioObj.schemes) ? folioObj.schemes : [];
    const schemes = schemesRaw.map((scheme) => {
      const schemeObj = safeJson(scheme) || {};
      return {
        name: safeString(schemeObj.name),
        isin: safeString(schemeObj.isin),
        units: safeNumber(schemeObj.units),
        nav: safeNumber(schemeObj.nav),
        value: safeNumber(schemeObj.value),
        invested_value: safeNumber(schemeObj.invested_value),
        as_of: safeString(schemeObj.as_of),
      } satisfies CasParserScheme;
    });

    return {
      folio_number: safeString(folioObj.folio_number),
      amc: safeString(folioObj.amc),
      schemes,
    } satisfies CasParserMutualFundFolio;
  });

  return {
    meta: meta
      ? {
          cas_type: safeString(meta.cas_type),
        }
      : undefined,
    investor: investor
      ? {
          name: safeString(investor.name),
          pan: safeString(investor.pan),
          email: safeString(investor.email),
          mobile: safeString(investor.mobile),
        }
      : undefined,
    summary: summary
      ? {
          total_value: safeNumber(summary.total_value),
        }
      : undefined,
    mutual_funds,
  };
}

function getCasParserApiKey() {
  const key = process.env.CAS_PARSER_API_KEY?.trim() || process.env.CASPARSER_API_KEY?.trim();
  if (!key) {
    throw new Error('Missing CAS_PARSER_API_KEY (or CASPARSER_API_KEY).');
  }
  return key;
}

function getCasParserServiceUrl() {
  const raw = process.env.CAS_PARSER_SERVICE_URL?.trim();
  if (!raw) {
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:8000';
    }
    return null;
  }
  return raw.replace(/\/+$/, '');
}

export async function smartParseCasPdf(input: { pdfBuffer: Buffer; password?: string }) {
  const serviceUrl = getCasParserServiceUrl();
  const allowExternalFallback = (process.env.CAS_PARSER_ALLOW_EXTERNAL_FALLBACK || '').toLowerCase() === 'true';
  if (!serviceUrl && !allowExternalFallback) {
    throw new Error(
      'CAS parser service is not configured. Set CAS_PARSER_SERVICE_URL to your self-hosted parser endpoint.',
    );
  }

  const form = new FormData();
  form.set(
    'pdf_file',
    new Blob([input.pdfBuffer], { type: 'application/pdf' }),
    'cas.pdf',
  );
  if (input.password) {
    form.set('password', input.password);
  }

  const response = serviceUrl
    ? await fetch(`${serviceUrl}/v1/smart/parse`, {
        method: 'POST',
        body: form,
      })
    : await fetch('https://api.casparser.in/v4/smart/parse', {
        method: 'POST',
        headers: {
          'x-api-key': getCasParserApiKey(),
        },
        body: form,
      });

  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    const message = raw && typeof raw === 'object'
      ? 'error' in raw
        ? String((raw as { error?: string }).error)
        : 'detail' in raw
          ? typeof (raw as { detail?: unknown }).detail === 'string'
            ? String((raw as { detail?: string }).detail)
            : (raw as { detail?: unknown }).detail && typeof (raw as { detail?: unknown }).detail === 'object' && 'error' in ((raw as { detail?: any }).detail as any)
              ? String(((raw as { detail?: any }).detail as any).error)
              : 'CAS parse failed'
          : 'CAS parse failed'
      : 'CAS parse failed';
    throw new Error(message || 'CAS parse failed');
  }

  return normalizeSmartParseResponse(raw);
}
