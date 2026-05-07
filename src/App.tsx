import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PortfolioProvider, usePortfolio } from './store/PortfolioContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { Asset } from './store/db';
import { Dashboard } from './components/Dashboard';
import { Ledger } from './components/Ledger';
import { AddAssetModal } from './components/AddAssetModal';
import { Settings, type SettingsSection } from './components/Settings';
import { ImportProgressOverlay } from './components/ImportProgressOverlay';
import { Button } from './components/ui/button';
import { Select } from './components/ui/select';
import { RefreshCw, Moon, Sun, Settings as SettingsIcon, LayoutDashboard, Wallet, FileText, LogOut, BookOpen } from 'lucide-react';
import { SplitwiseProvider, useSplitwise } from './store/SplitwiseContext';
import { ConnectedAccountsProvider, useConnectedAccounts } from './store/ConnectedAccountsContext';
import { parseInitialViewFromQuery } from './lib/appNavigation';
import { PublicHome } from './components/PublicHome';
import { CenteredState } from './components/CenteredState';
import { GettingStartedChecklist } from './components/GettingStartedChecklist';
import { NextActionPanel } from './components/NextActionPanel';
import { getAiCredentials } from './lib/aiCredentialsApi';
import { Docs } from './components/Docs';
import { SetupWizard } from './components/SetupWizard';
import { WorkspaceOwnershipSetup } from './components/WorkspaceOwnershipSetup';
import { getWorkspaceOwnership, saveWorkspaceOwnership, resetWorkspaceOwnership } from './store/workspaceOwnership';
import type { FirebaseClientConfig, WorkspaceMode } from './store/workspaceOwnership';
import { getServerWorkspaceOwnership, saveServerWorkspaceOwnership } from './lib/workspaceOwnershipApi';
import { SampleModeProvider, useSampleMode } from './lib/samplePortfolio';
import { WorkspaceProvider } from './lib/WorkspaceContext';
import { createSelfOwnedRuntime, destroySelfOwnedRuntime, getHostedRuntime } from './lib/firebaseRuntime';
import type { FirebaseRuntime } from './lib/firebaseRuntime';
import { setWorkspaceMode } from './lib/workspaceGuard';

type AppView = 'dashboard' | 'assets' | 'settings' | 'docs';

function MainApp() {
  const { user, logout } = useAuth();
  const { assets, refreshPrices, isRefreshing, portfolios, activePortfolioId, setActivePortfolioId } = usePortfolio();
  const { upstox } = useConnectedAccounts();
  const { status: splitwiseStatus } = useSplitwise();
  const { isSampleMode, disableSampleMode } = useSampleMode();
  const initialView = parseInitialViewFromQuery();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [currentView, setCurrentView] = useState<AppView>(initialView.view);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(initialView.settingsSection);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [aiKeyConfigured, setAiKeyConfigured] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  const handleStartSetupWizard = useCallback(() => {
    setIsSetupWizardOpen(true);
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('nexus-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  useEffect(() => {
    getAiCredentials()
      .then((creds) => setAiKeyConfigured(Boolean(creds.provider)))
      .catch(() => setAiKeyConfigured(false));
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle('dark', next);
      window.localStorage.setItem('nexus-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const navigateToSettings = useCallback((section: string) => {
    setSettingsSection(section as SettingsSection);
    setCurrentView('settings');
  }, []);

  const navigateToDocs = useCallback(() => {
    window.history.pushState({}, '', '/docs');
    setCurrentView('docs');
  }, []);

  const handleEditAsset = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  }, []);

  const upstoxConnected = upstox?.status === 'connected';
  const splitwiseConnected = splitwiseStatus === 'connected';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 dark:bg-slate-900 dark:text-slate-50 transition-colors duration-200 font-sans">
      <header className="bg-white dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 py-2 sm:py-4 grid grid-cols-1 gap-2 lg:gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center gap-3 cursor-pointer min-w-0 lg:justify-self-start" onClick={() => setCurrentView('dashboard')}>
            <div className="w-10 h-10 bg-[#00875A] rounded-xl flex items-center justify-center shadow-sm">
              <Wallet className="text-white h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight text-slate-900 dark:text-white">Nexus Portfolio</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Track your wealth</p>
            </div>
          </div>

          <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-1 rounded-full border border-slate-100 dark:border-slate-800 xl:justify-self-center xl:min-w-0">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[#00875A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView('assets')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${currentView === 'assets' ? 'bg-[#00875A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </button>
            <button
              data-nav-settings
              onClick={() => setCurrentView('settings')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-[#00875A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap xl:flex-nowrap xl:justify-self-end">
            {portfolios.length > 0 && (
              <div className="hidden xl:block xl:w-[210px] 2xl:w-[240px] shrink-0">
                <Select
                  value={activePortfolioId || ''}
                  onChange={(event) => setActivePortfolioId(event.target.value)}
                  className="h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                  aria-label="Active portfolio"
                >
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}{portfolio.isPersonal ? '' : ` • ${portfolio.ownerEmail}`}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <Button variant="outline" size="icon" onClick={refreshPrices} disabled={isRefreshing} className="h-11 w-11 rounded-lg border-slate-200 dark:border-slate-800 shrink-0">
              <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={navigateToDocs}
              className="h-11 w-11 rounded-lg border-slate-200 dark:border-slate-800 shrink-0"
              title="Documentation"
              aria-label="Open documentation"
            >
              <BookOpen className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="h-11 w-11 rounded-lg border-slate-200 dark:border-slate-800 shrink-0"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
            </Button>

            {user && (
              <div className="hidden xl:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 min-w-0 max-w-[250px]">
                <span className="truncate">{user.email}</span>
                <button type="button" onClick={() => void logout()} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' && (
          <>
            <GettingStartedChecklist
              assetsCount={assets.length}
              upstoxConnected={upstoxConnected}
              splitwiseConnected={splitwiseConnected}
              aiKeyConfigured={aiKeyConfigured}
              onNavigateToSettings={navigateToSettings}
              onNavigateToDocs={navigateToDocs}
              onStartSetupWizard={handleStartSetupWizard}
            />
            <NextActionPanel
              assetsCount={assets.length}
              upstoxConnected={upstoxConnected}
              splitwiseConnected={splitwiseConnected}
              aiKeyConfigured={aiKeyConfigured}
              userUid={user?.uid}
              onNavigateToSettings={navigateToSettings}
              onNavigateToDocs={navigateToDocs}
              onAddAsset={() => setIsAddModalOpen(true)}
            />
            <Dashboard onAddAsset={() => {
              if (isSampleMode) disableSampleMode();
              setIsAddModalOpen(true);
            }} />
          </>
        )}
        {currentView === 'assets' && <Ledger onEditAsset={handleEditAsset} onAddAsset={() => {
          if (isSampleMode) disableSampleMode();
          setIsAddModalOpen(true);
        }} />}
        {currentView === 'settings' && <Settings initialSection={settingsSection} onStartSetupWizard={handleStartSetupWizard} />}
        {currentView === 'docs' && <Docs onBack={() => setCurrentView('dashboard')} onStartSetupWizard={handleStartSetupWizard} />}
      </main>

      <AddAssetModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setEditingAsset(undefined);
        }}
        assetToEdit={editingAsset}
      />
      <ImportProgressOverlay />
      <SetupWizard
        open={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onNavigateToSettings={navigateToSettings}
        onNavigateToDocs={navigateToDocs}
      />
    </div>
  );
}

function PortfolioApp() {
  const { logout } = useAuth();
  const { hasAccess, accessError, isPortfolioLoading } = usePortfolio();

  if (isPortfolioLoading) {
    return <CenteredState title="Loading portfolio" description="Connecting to Firebase and syncing your shared portfolio..." />;
  }

  if (!hasAccess) {
    return (
      <CenteredState
        title="Preparing your portfolio"
        description={accessError || 'We are creating or syncing the portfolios available to your Google account. Please refresh in a moment if this screen persists.'}
        action={(
          <Button variant="outline" onClick={() => void logout()}>
            Sign out
          </Button>
        )}
      />
    );
  }

  return <MainApp />;
}

function AppContent() {
  return (
    <ConnectedAccountsProvider>
      <SplitwiseProvider>
        <PortfolioProvider>
          <SampleModeProvider>
            <PortfolioApp />
          </SampleModeProvider>
        </PortfolioProvider>
      </SplitwiseProvider>
    </ConnectedAccountsProvider>
  );
}

function WorkspaceGate({ children, selfOwnedConfig }: {
  children: React.ReactNode;
  selfOwnedConfig?: FirebaseClientConfig;
}) {
  const runtime = useMemo<FirebaseRuntime>(() => {
    if (selfOwnedConfig) {
      return createSelfOwnedRuntime(selfOwnedConfig);
    }
    return getHostedRuntime();
  }, [selfOwnedConfig]);

  useEffect(() => {
    setWorkspaceMode(selfOwnedConfig ? 'selfOwned' : 'hosted');
    return () => {
      setWorkspaceMode('hosted');
      if (selfOwnedConfig) {
        destroySelfOwnedRuntime();
      }
    };
  }, [selfOwnedConfig]);

  return (
    <WorkspaceProvider runtime={runtime}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </WorkspaceProvider>
  );
}

function SelfOwnedSignInGate({ onSignedIn }: { onSignedIn: () => void }) {
  const { user, loading, authError, signInWithGoogle } = useAuth();

  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (user && !initialCheckDone.current) {
      initialCheckDone.current = true;
      onSignedIn();
    }
  }, [user, loading, onSignedIn]);

  if (loading) {
    return <CenteredState title="Connecting to your Firebase" description="Initializing connection to your Firebase project..." />;
  }

  if (!user) {
    return (
      <CenteredState
        title="Sign in to your Firebase"
        description={authError || 'Sign in with Google to authenticate against your own Firebase project. Your portfolio data will be stored there.'}
        action={(
          <Button onClick={() => void signInWithGoogle()} className="bg-[#00875A] hover:bg-emerald-700 text-white">
            Sign in with Google
          </Button>
        )}
      />
    );
  }

  return null;
}

function AuthenticatedApp() {
  const { user, loading, authError, signInWithGoogle } = useAuth();

  const prevUserRef = useRef(user);
  const [signedOut, setSignedOut] = useState(false);

  const [ownershipChoice, setOwnershipChoice] = useState<WorkspaceMode | null>(null);
  const [ownershipChecked, setOwnershipChecked] = useState(false);
  const [ownershipCheckedUid, setOwnershipCheckedUid] = useState<string | null>(null);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [selfOwnedConfig, setSelfOwnedConfig] = useState<FirebaseClientConfig | undefined>(undefined);
  const [selfOwnedSignInDone, setSelfOwnedSignInDone] = useState(false);

  useEffect(() => {
    if (prevUserRef.current && !user) {
      setSignedOut(true);
    }
    prevUserRef.current = user;
  }, [user]);

  useEffect(() => {
    setOwnershipChoice(null);
    setSelfOwnedConfig(undefined);
    setSelfOwnedSignInDone(false);
    setOwnershipChecked(false);
    setOwnershipCheckedUid(null);
    setOwnershipError(null);
    if (!user) return;

    let cancelled = false;
    const localOwnership = getWorkspaceOwnership(user.uid);
    if (localOwnership) {
      setOwnershipChoice(localOwnership.mode);
      setSelfOwnedConfig(localOwnership.mode === 'selfOwned' ? localOwnership.firebaseConfig : undefined);
      setOwnershipChecked(true);
      setOwnershipCheckedUid(user.uid);
    }

    void (async () => {
      try {
        const serverOwnership = await getServerWorkspaceOwnership();
        if (cancelled) return;
        const ownership = serverOwnership || localOwnership;
        if (ownership) {
          setOwnershipChoice(ownership.mode);
          setSelfOwnedConfig(ownership.mode === 'selfOwned' ? ownership.firebaseConfig : undefined);
          saveWorkspaceOwnership(ownership.mode, ownership.firebaseConfig, user.uid);
          if (!serverOwnership) {
            void saveServerWorkspaceOwnership(ownership.mode, ownership.firebaseConfig).catch(() => undefined);
          }
        }
      } catch (error) {
        if (cancelled) return;
        if (localOwnership) {
          setOwnershipError('Using cached workspace choice. Nexus could not refresh hosted setup state.');
        } else {
          setOwnershipError(error instanceof Error ? error.message : 'Could not load your workspace setup.');
        }
      } finally {
        if (!cancelled) {
          setOwnershipChecked(true);
          setOwnershipCheckedUid(user.uid);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleOwnershipChoice = useCallback(async (mode: WorkspaceMode, firebaseConfig?: FirebaseClientConfig) => {
    if (!user?.uid) return;
    setOwnershipError(null);
    try {
      const saved = await saveServerWorkspaceOwnership(mode, firebaseConfig);
      saveWorkspaceOwnership(saved.mode, saved.firebaseConfig, user.uid);
      setOwnershipChoice(saved.mode);
      setOwnershipCheckedUid(user.uid);
      setSelfOwnedConfig(saved.mode === 'selfOwned' ? saved.firebaseConfig : undefined);
    } catch (error) {
      setOwnershipError(error instanceof Error ? error.message : 'Could not save your workspace setup.');
    }
  }, [user?.uid]);

  const handleSwitchToHosted = useCallback(() => {
    resetWorkspaceOwnership(user?.uid);
    setOwnershipChoice(null);
    setSelfOwnedConfig(undefined);
    setSelfOwnedSignInDone(false);
  }, [user?.uid]);

  const handleSelfOwnedSignInDone = useCallback(() => {
    setSelfOwnedSignInDone(true);
  }, []);

  if (loading) {
    return <CenteredState title="Loading portfolio" description="Checking your sign-in session..." />;
  }

  if (!user) {
    return <PublicHome authError={authError} onLaunch={() => void signInWithGoogle()} signedOut={signedOut} />;
  }

  const ownershipReady = ownershipChecked && ownershipCheckedUid === user.uid;

  if (ownershipReady && ownershipError && !ownershipChoice) {
    return (
      <CenteredState
        title="Workspace setup unavailable"
        description={ownershipError}
        action={(
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        )}
      />
    );
  }

  if (ownershipReady && !ownershipChoice) {
    return <WorkspaceOwnershipSetup onChooseMode={(mode, config) => void handleOwnershipChoice(mode, config)} />;
  }

  if (ownershipReady && ownershipChoice === 'selfOwned' && selfOwnedConfig && !selfOwnedSignInDone) {
    return (
      <WorkspaceGate selfOwnedConfig={selfOwnedConfig}>
        <SelfOwnedSignInGate onSignedIn={handleSelfOwnedSignInDone} />
      </WorkspaceGate>
    );
  }

  if (!ownershipReady) {
    return null;
  }

  const shouldUseSelfOwned = ownershipChoice === 'selfOwned' && selfOwnedConfig && selfOwnedSignInDone;

  if (shouldUseSelfOwned) {
    return (
      <WorkspaceGate selfOwnedConfig={selfOwnedConfig}>
        <AppContent />
      </WorkspaceGate>
    );
  }

  return (
    <WorkspaceGate>
      <AppContent />
    </WorkspaceGate>
  );
}

export { AuthenticatedApp };

function getDocSectionFromPath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const match = window.location.pathname.match(/^\/docs\/(.+)/);
  return match?.[1] || undefined;
}

export default function App() {
  const [docRoute, setDocRoute] = useState<{ active: boolean; section?: string }>(() => ({
    active: typeof window !== 'undefined' && window.location.pathname.startsWith('/docs'),
    section: getDocSectionFromPath(),
  }));
  const [standaloneWizardOpen, setStandaloneWizardOpen] = useState(false);

  useEffect(() => {
    const handlePop = () => {
      setDocRoute({
        active: window.location.pathname.startsWith('/docs'),
        section: getDocSectionFromPath(),
      });
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const closeDocs = () => {
    window.history.pushState({}, '', '/');
    setDocRoute({ active: false, section: undefined });
  };

  const handleDocWizard = () => {
    closeDocs();
    setStandaloneWizardOpen(true);
  };

  const handleCloseStandaloneWizard = () => {
    setStandaloneWizardOpen(false);
  };

  if (docRoute.active) {
    return (
      <>
        <Docs initialSection={docRoute.section as any} onBack={closeDocs} onStartSetupWizard={handleDocWizard} />
        <SetupWizard open={standaloneWizardOpen} onClose={handleCloseStandaloneWizard} />
      </>
    );
  }

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
