// @vitest-environment happy-dom
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const mockHostedSignOut = vi.fn();
const mockSelfOwnedSignOut = vi.fn();
const mockHostedOnAuthStateChanged = vi.fn();
const mockSelfOwnedOnAuthStateChanged = vi.fn();
const mockHostedGetRedirectResult = vi.fn();
const mockSelfOwnedGetRedirectResult = vi.fn();

vi.mock('../lib/firebase', () => ({
  auth: {
    app: { name: 'hosted' },
    currentUser: null,
  },
  db: { _type: 'hosted-db' },
  googleProvider: { providerId: 'google.com' },
  firebaseDataNamespace: 'test',
  defaultPortfolioId: 'test-portfolio',
}));

vi.mock('firebase/auth', () => ({
  getRedirectResult: (auth: any) => {
    if (auth._name === 'self-owned') return mockSelfOwnedGetRedirectResult();
    return mockHostedGetRedirectResult();
  },
  onAuthStateChanged: (auth: any, cb: any) => {
    if (auth._name === 'self-owned') {
      mockSelfOwnedOnAuthStateChanged(cb);
      return () => {};
    }
    mockHostedOnAuthStateChanged(cb);
    return () => {};
  },
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: (auth: any) => {
    if (auth._name === 'self-owned') return mockSelfOwnedSignOut();
    return mockHostedSignOut();
  },
  GoogleAuthProvider: vi.fn(() => ({ providerId: 'google.com', setCustomParameters: vi.fn() })),
}));

vi.mock('../lib/WorkspaceContext', () => ({
  WorkspaceContext: React.createContext<any>(null),
  WorkspaceProvider: ({ children, runtime: _r }: any) => <>{children}</>,
  useWorkspace: () => ({ auth: { _name: 'self-owned' }, db: { _type: 'self-owned-db' }, googleProvider: {} }),
}));

vi.mock('../lib/firebaseRuntime', () => ({}));
vi.mock('../lib/workspaceGuard', () => ({
  setWorkspaceMode: vi.fn(),
  isSelfOwnedMode: () => false,
  assertHostedMode: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';
import { WorkspaceContext } from '../lib/WorkspaceContext';

function TestConsumer() {
  const { user, loading, logout, runtime } = useAuth();
  if (loading) return <div>loading...</div>;
  return (
    <div>
      <span data-testid="runtime">{runtime}</span>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <button data-testid="logout" onClick={() => void logout()}>logout</button>
    </div>
  );
}

describe('AuthContext self-owned isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHostedOnAuthStateChanged.mockImplementation((cb: any) => { setTimeout(() => cb(null), 0); });
    mockSelfOwnedOnAuthStateChanged.mockImplementation((cb: any) => { setTimeout(() => cb(null), 0); });
    mockHostedGetRedirectResult.mockResolvedValue(null);
    mockSelfOwnedGetRedirectResult.mockResolvedValue(null);
  });

  it('uses hosted auth when no workspace context', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId('runtime')).toHaveTextContent('hosted');
    expect(mockHostedOnAuthStateChanged).toHaveBeenCalled();
  });

  it('uses self-owned auth when inside workspace context with self-owned runtime', async () => {
    const selfOwnedWorkspace = {
      auth: { _name: 'self-owned', currentUser: null } as unknown as Auth,
      db: { _type: 'self-owned-db' } as unknown as Firestore,
      googleProvider: { providerId: 'google.com' },
    };

    render(
      <WorkspaceContext.Provider value={selfOwnedWorkspace}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </WorkspaceContext.Provider>
    );

    expect(await screen.findByTestId('runtime')).toHaveTextContent('selfOwned');
    expect(mockSelfOwnedOnAuthStateChanged).toHaveBeenCalled();
  });

  it('calls both self-owned and hosted signOut on logout when using self-owned auth', async () => {
    const mockUser = { uid: 'self-uid', email: 'self@example.com' };
    mockSelfOwnedOnAuthStateChanged.mockImplementation((cb: any) => { setTimeout(() => cb(mockUser), 0); });

    const selfOwnedWorkspace = {
      auth: { _name: 'self-owned', currentUser: mockUser } as unknown as Auth,
      db: { _type: 'self-owned-db' } as unknown as Firestore,
      googleProvider: { providerId: 'google.com' },
    };

    render(
      <WorkspaceContext.Provider value={selfOwnedWorkspace}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </WorkspaceContext.Provider>
    );

    expect(await screen.findByTestId('user')).toHaveTextContent('self@example.com');

    await act(async () => {
      screen.getByTestId('logout').click();
    });

    expect(mockSelfOwnedSignOut).toHaveBeenCalled();
    expect(mockHostedSignOut).toHaveBeenCalled();
  });

  it('only calls hosted signOut on logout when using hosted auth', async () => {
    const mockUser = { uid: 'hosted-uid', email: 'hosted@example.com' };
    mockHostedOnAuthStateChanged.mockImplementation((cb: any) => { setTimeout(() => cb(mockUser), 0); });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId('runtime')).toHaveTextContent('hosted');

    await act(async () => {
      screen.getByTestId('logout').click();
    });

    expect(mockHostedSignOut).toHaveBeenCalled();
    expect(mockSelfOwnedSignOut).not.toHaveBeenCalled();
  });
});
