import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PortfolioProvider, usePortfolio } from './store/PortfolioContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { Asset, saveSetting } from './store/db';
import { Dashboard } from './components/Dashboard';
import { Ledger } from './components/Ledger';
import { AddAssetModal } from './components/AddAssetModal';
import { Settings, type SettingsSection } from './components/Settings';
import { ImportProgressOverlay } from './components/ImportProgressOverlay';
import { Button } from './components/ui/button';
import { Select } from './components/ui/select';
import { RefreshCw, Moon, Sun, Settings as SettingsIcon, LayoutDashboard, Wallet, FileText, LogOut, BookOpen, Rocket, Plus, ChevronDown } from 'lucide-react';
import { SplitwiseProvider, useSplitwise } from './store/SplitwiseContext';
import { ConnectedAccountsProvider, useConnectedAccounts } from './store/ConnectedAccountsContext';
import { parseInitialViewFromQuery } from './lib/appNavigation';
import { PublicHome } from './components/PublicHome';
import { PricingPage } from './components/PricingPage';
import { CenteredState } from './components/CenteredState';
import { GettingStartedChecklist } from './components/GettingStartedChecklist';
import { NextActionPanel } from './components/NextActionPanel';
import { getAiCredentials } from './lib/aiCredentialsApi';
import { Docs } from './components/Docs';
import { SetupWizard } from './components/SetupWizard';
import { WorkspaceOwnershipSetup } from './components/WorkspaceOwnershipSetup';
import { OnboardingWizard } from './components/OnboardingWizard';
import { getWorkspaceOwnership, saveWorkspaceOwnership, resetWorkspaceOwnership } from './store/workspaceOwnership';
import type { FirebaseClientConfig, WorkspaceMode } from './store/workspaceOwnership';
import { getServerWorkspaceOwnership, saveServerWorkspaceOwnership } from './lib/workspaceOwnershipApi';
import { getOnboardingState } from './lib/onboardingApi';
import { SampleModeProvider, useSampleMode } from './lib/samplePortfolio';
import { WorkspaceProvider } from './lib/WorkspaceContext';
import { createSelfOwnedRuntime, destroySelfOwnedRuntime, getHostedRuntime } from './lib/firebaseRuntime';
import type { FirebaseRuntime } from './lib/firebaseRuntime';
import { setWorkspaceMode } from './lib/workspaceGuard';
import { getWorkspacePreferencesKey, type WorkspacePreferences } from './store/userPreferences';
import { useSetupTabVisibility } from './lib/useSetupTabVisibility';

type AppView = 'dashboard' | 'accounts' | 'assets' | 'settings' | 'docs' | 'setup';

export function MainApp() {
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  const navigateToView = useCallback((view: AppView) => {
    if (typeof window !== 'undefined' && view !== 'docs') {
      const url = new URL(window.location.href);
      if (url.pathname.startsWith('/docs')) url.pathname = '/';
      if (view === 'dashboard') {
        url.searchParams.delete('view');
        url.searchParams.delete('section');
      } else {
        url.searchParams.set('view', view);
        if (view !== 'settings') url.searchParams.delete('section');
      }
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setCurrentView(view);
  }, []);

  const navigateToSettings = useCallback((section: string) => {
    setSettingsSection(section as SettingsSection);
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    navigateToView('settings');
  }, [navigateToView]);

  const navigateToDocs = useCallback(() => {
    window.history.pushState({}, '', '/docs');
    setCurrentView('docs');
  }, []);

  const upstoxConnected = upstox?.status === 'connected';
  const splitwiseConnected = splitwiseStatus === 'connected';

  const { visible: setupTabVisible } = useSetupTabVisibility({
    assetsCount: assets.length,
    upstoxConnected,
    splitwiseConnected,
    aiKeyConfigured,
    userUid: user?.uid,
  });

  const prevSetupVisible = useRef(setupTabVisible);
  useEffect(() => {
    if (!setupTabVisible && currentView === 'setup') {
      navigateToView('dashboard');
    }
    prevSetupVisible.current = setupTabVisible;
  }, [setupTabVisible, currentView, navigateToView]);

  const handleEditAsset = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900 dark:bg-[#111412] dark:text-slate-50 transition-colors duration-150 font-sans">
      <header className="bg-white dark:bg-[#151816] sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 cursor-pointer min-w-0 lg:justify-self-start" onClick={() => navigateToView('dashboard')}>
            <div className="w-9 h-9 bg-[#1f6f50] rounded-lg flex items-center justify-center">
              <Wallet className="text-white h-5 w-5" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="text-lg font-bold tracking-tight leading-tight text-slate-900 dark:text-white">Nexus Portfolio</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Family wealth</p>
            </div>
          </div>

          <nav aria-label="Primary" className="ml-2 flex items-center gap-1">
            <button
              onClick={() => navigateToView('dashboard')}
              aria-label="Overview"
              title="Overview"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[#e8f2ed] text-[#185c43] dark:bg-[#20372d] dark:text-emerald-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => navigateToView('assets')}
              aria-label="Holdings"
              title="Holdings"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'assets' ? 'bg-[#e8f2ed] text-[#185c43] dark:bg-[#20372d] dark:text-emerald-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Holdings</span>
            </button>
          </nav>

          <div className="ml-auto flex items-center justify-end gap-2">
            {portfolios.length > 1 && (
              <div className="hidden w-[220px] shrink-0 lg:block">
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

            <Button
              onClick={() => {
                if (isSampleMode) disableSampleMode();
                setIsAddModalOpen(true);
              }}
              className="h-10 rounded-lg bg-[#1f6f50] px-3 text-white hover:bg-[#185c43]"
              aria-label="Add data"
              title="Add data"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add data</span>
            </Button>

            <Button variant="outline" size="icon" onClick={refreshPrices} disabled={isRefreshing} className="h-10 w-10 rounded-lg border-slate-200 dark:border-slate-800 shrink-0" title="Refresh portfolio values" aria-label="Refresh portfolio values">
              <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                className="flex h-10 max-w-[210px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151816] dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Open account menu"
                aria-expanded={isUserMenuOpen}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">{(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}</span>
                <span className="hidden truncate lg:block">{user?.displayName || user?.email}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                  <button type="button" data-nav-settings onClick={() => { navigateToSettings('household'); setIsUserMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900"><SettingsIcon className="h-4 w-4" />Settings</button>
                  {setupTabVisible && <button type="button" onClick={() => { navigateToView('setup'); setIsUserMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900"><Rocket className="h-4 w-4" />Setup checklist</button>}
                  <button type="button" onClick={() => { navigateToDocs(); setIsUserMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900"><BookOpen className="h-4 w-4" />Help & documentation</button>
                  <button type="button" onClick={() => { toggleDarkMode(); setIsUserMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900">{isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{isDarkMode ? 'Light appearance' : 'Dark appearance'}</button>
                  <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                  <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"><LogOut className="h-4 w-4" />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        {currentView === 'dashboard' && (
          <Dashboard onAddAsset={() => {
            if (isSampleMode) disableSampleMode();
            setIsAddModalOpen(true);
          }} onManageLimits={() => navigateToSettings('accounts-limits')} />
        )}
        {currentView === 'setup' && (
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
          </>
        )}
        {currentView === 'assets' && <Ledger onEditAsset={handleEditAsset} onAddAsset={() => {
          if (isSampleMode) disableSampleMode();
          setIsAddModalOpen(true);
        }} />}
        {currentView === 'accounts' && <Settings initialSection="accounts-limits" onStartSetupWizard={handleStartSetupWizard} />}
        {currentView === 'settings' && <Settings initialSection={settingsSection} onStartSetupWizard={handleStartSetupWizard} />}
        {currentView === 'docs' && <Docs onBack={() => navigateToView('dashboard')} onStartSetupWizard={handleStartSetupWizard} />}
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

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

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

  const ownershipReady = ownershipChecked && ownershipCheckedUid === user?.uid;

  useEffect(() => {
    if (!ownershipReady || !ownershipChoice || onboardingChecked) return;
    let cancelled = false;
    const uid = user?.uid;
    if (!uid) return;

    void getOnboardingState()
      .then((state) => {
        if (cancelled) return;
        setOnboardingComplete(state?.status === 'completed');
        setOnboardingChecked(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setOnboardingError(err instanceof Error ? err.message : 'Onboarding check failed');
        setOnboardingChecked(true);
      });

    return () => { cancelled = true; };
  }, [ownershipReady, ownershipChoice, onboardingChecked, user?.uid]);

  const handleOnboardingComplete = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const state = await getOnboardingState();
      if (state && state.status === 'completed') {
        const prefs: WorkspacePreferences = {
          workspaceName: '',
          baseCurrency: (state.primaryCurrency as WorkspacePreferences['baseCurrency']) || 'CAD',
          primaryRegion: state.primaryCountry || '',
          householdLabel: '',
          defaultMarketPreference: (state.primaryCountry === 'IN' ? 'India' : state.primaryCountry === 'CA' ? 'Canada' : 'US') as WorkspacePreferences['defaultMarketPreference'],
        };
        await saveSetting(getWorkspacePreferencesKey(user.uid), prefs);
      }
    } catch {
    }
    setOnboardingComplete(true);
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
    if (typeof window !== 'undefined' && window.location.pathname === '/pricing') {
      return <PricingPage onLaunch={() => void signInWithGoogle()} />;
    }
    return <PublicHome authError={authError} onLaunch={() => void signInWithGoogle()} signedOut={signedOut} />;
  }

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

  if (ownershipReady && !onboardingChecked) {
    if (onboardingError) {
      return (
        <CenteredState
          title="Setup check"
          description={onboardingError}
          action={(
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          )}
        />
      );
    }
    return (
      <CenteredState title="Loading portfolio" description="Checking your setup progress..." />
    );
  }

  if (ownershipReady && onboardingChecked && !onboardingComplete) {
    return (
      <OnboardingWizard
        onComplete={() => void handleOnboardingComplete()}
      />
    );
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
