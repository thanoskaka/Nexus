import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void getRedirectResult(auth).catch((error: unknown) => {
      setAuthError(getAuthErrorMessage(error));
    });

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    authError,
    signInWithGoogle: async () => {
      setAuthError(null);
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        const code = getErrorCode(error);
        if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        setAuthError(getAuthErrorMessage(error));
        throw error;
      }
    },
    logout: async () => {
      setAuthError(null);
      await signOut(auth);
    },
  }), [user, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code);
  }
  return '';
}

function getAuthErrorMessage(error: unknown) {
  const code = getErrorCode(error);
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Auth. Add localhost to Authorized domains in Firebase Console.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled in Firebase Authentication.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'The sign-in popup was closed before completing Google login.';
  }
  if (code === 'auth/popup-blocked') {
    return 'The browser blocked the Google sign-in popup.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Google sign-in failed.';
}
