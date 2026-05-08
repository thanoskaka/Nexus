import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore, type Firestore } from 'firebase/firestore';
import type { FirebaseClientConfig } from '../store/workspaceOwnership';
import { auth as hostedAuth, db as hostedDb, googleProvider as hostedGoogleProvider } from './firebase';

const SELF_OWNED_APP_NAME = 'nexus-self-owned';

export interface FirebaseRuntime {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

function createApp(name: string, config: Record<string, string>): FirebaseApp {
  try {
    return getApp(name);
  } catch {
    return initializeApp(config, name);
  }
}

function enablePersistence(db: Firestore): void {
  if (typeof window === 'undefined') return;
  const handleError = (err: unknown) => {
    const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
    if (code === 'failed-precondition') {
      console.warn('Persistence failed: multiple tabs open');
      return;
    }
    if (code === 'unimplemented') {
      console.warn('Persistence not supported in this browser');
      return;
    }
    console.warn('Persistence setup failed', err);
  };
  try {
    void enableIndexedDbPersistence(db).catch(handleError);
  } catch (err) {
    handleError(err);
  }
}

export function getHostedRuntime(): FirebaseRuntime {
  return {
    app: hostedAuth.app,
    auth: hostedAuth,
    db: hostedDb,
    googleProvider: hostedGoogleProvider,
  };
}

export function createSelfOwnedRuntime(config: FirebaseClientConfig): FirebaseRuntime {
  const app = createApp(SELF_OWNED_APP_NAME, {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  enablePersistence(db);
  return { app, auth, db, googleProvider };
}

export function destroySelfOwnedRuntime(): void {
  try {
    const app = getApp(SELF_OWNED_APP_NAME);
    const auth = getAuth(app);
    auth.signOut().catch(() => {});
  } catch {
  }
}
