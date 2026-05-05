const REQUIRED_FIREBASE_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const SETUP_DOCS_URL = '/docs/localhost';

type EnvReader = (key: string) => string | undefined;

function defaultEnvReader(key: string): string | undefined {
  const val = import.meta.env[key];
  return typeof val === 'string' ? val : undefined;
}

let envReader: EnvReader = defaultEnvReader;

export function __setEnvReaderForTest(reader: EnvReader) {
  envReader = reader;
}

export function __resetEnvReader() {
  envReader = defaultEnvReader;
}

export function isMockMode(): boolean {
  return envReader('VITE_MOCK_MODE') === 'mock';
}

export function getMissingFirebaseKeys(): string[] {
  return REQUIRED_FIREBASE_KEYS.filter((key) => {
    const value = envReader(key);
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

export function validateFirebaseConfig(): void {
  if (isMockMode()) return;
  const missing = getMissingFirebaseKeys();
  if (missing.length > 0) {
    throw new Error(
      `Nexus Portfolio is not configured yet.\n\n` +
      `Missing Firebase environment variables:\n` +
      missing.map((k) => `  • ${k}`).join('\n') + '\n\n' +
      `To run locally:\n` +
      `  Option A — with Firebase:  fill in the missing vars in .env.local\n` +
      `  Option B — without Firebase: set VITE_MOCK_MODE=mock and run npm run dev:mock\n\n` +
      `See ${SETUP_DOCS_URL} for detailed setup instructions.`,
    );
  }
}

export function resolveFirebaseDataNamespace(): string {
  const configured = envReader('NEXT_PUBLIC_FIREBASE_DATA_NAMESPACE');
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }
  const mode = envReader('MODE');
  if (mode === 'test') return 'test';
  const isDev = envReader('DEV') === 'true';
  return isDev ? 'local-dev' : 'prod';
}

export function resolveServerDataNamespace(): string {
  const serverNs = typeof process !== 'undefined' ? process.env.FIREBASE_DATA_NAMESPACE : undefined;
  if (typeof serverNs === 'string' && serverNs.trim().length > 0) {
    return serverNs.trim();
  }
  const clientNs = envReader('NEXT_PUBLIC_FIREBASE_DATA_NAMESPACE');
  if (typeof clientNs === 'string' && clientNs.trim().length > 0) {
    return clientNs.trim();
  }
  const mode = envReader('MODE');
  if (mode === 'test') return 'test';
  const isDev = envReader('DEV') === 'true';
  return isDev ? 'local-dev' : 'prod';
}
