import React, { createContext, useContext, useMemo } from 'react';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { GoogleAuthProvider } from 'firebase/auth';
import type { FirebaseRuntime } from './firebaseRuntime';

export interface WorkspaceValue {
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ runtime, children }: { runtime: FirebaseRuntime; children: React.ReactNode }) {
  const value = useMemo<WorkspaceValue>(() => ({
    auth: runtime.auth,
    db: runtime.db,
    googleProvider: runtime.googleProvider,
  }), [runtime.auth, runtime.db, runtime.googleProvider]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
}

export function useWorkspaceDb(): Firestore {
  return useWorkspace().db;
}

export function useWorkspaceAuth(): Auth {
  return useWorkspace().auth;
}

export function useWorkspaceGoogleProvider(): GoogleAuthProvider {
  return useWorkspace().googleProvider;
}

export { WorkspaceContext };
