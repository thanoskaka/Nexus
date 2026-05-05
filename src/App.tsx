import React, { useEffect, useRef, useState } from 'react';
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
import { WorkspaceOwnershipSetup } from './components/WorkspaceOwnershipSetup';
import { getWorkspaceOwnership, saveWorkspaceOwnership } from './store/workspaceOwnership';
import type { FirebaseClientConfig, WorkspaceMode } from './store/workspaceOwnership';
import { SampleModeProvider, useSampleMode } from './lib/samplePortfolio';

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

  const navigateToSettings = React.useCallback((section: string) => {
    setSettingsSection(section as SettingsSection);
    setCurrentView('settings');
  }, []);

  const navigateToDocs = React.useCallback(() => {
    window.history.pushState({}, '', '/docs');
    setCurrentView('docs');
  }, []);

  const handleEditAsset = React.useCallback((asset: Asset) => {
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
        {currentView === 'settings' && <Settings initialSection={settingsSection} />}
        {currentView === 'docs' && <Docs onBack={() => setCurrentView('dashboard')} />}
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
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading, authError, signInWithGoogle, logout } = useAuth();
  const { hasAccess, accessError, isPortfolioLoading } = usePortfolio();

  const prevUserRef = useRef(user);
  const [signedOut, setSignedOut] = useState(false);

  const [ownershipChoice, setOwnershipChoice] = useState<WorkspaceMode | null>(null);
  const [ownershipChecked, setOwnershipChecked] = useState(false);

  useEffect(() => {
    if (prevUserRef.current && !user) {
      setSignedOut(true);
    }
    prevUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const existing = getWorkspaceOwnership(user.uid);
    if (existing) {
      setOwnershipChoice(existing.mode);
    }
    setOwnershipChecked(true);
  }, [user]);

  const handleOwnershipChoice = (mode: WorkspaceMode, firebaseConfig?: FirebaseClientConfig) => {
    saveWorkspaceOwnership(mode, firebaseConfig, user?.uid);
    setOwnershipChoice(mode);
  };

  if (loading || (user && isPortfolioLoading)) {
    return <CenteredState title="Loading portfolio" description="Connecting to Firebase and syncing your shared portfolio..." />;
  }

  if (!user) {
    return <PublicHome authError={authError} onLaunch={() => void signInWithGoogle()} signedOut={signedOut} />;
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

  if (ownershipChecked && !ownershipChoice) {
    return <WorkspaceOwnershipSetup onChooseMode={handleOwnershipChoice} />;
  }

  if (!ownershipChecked) {
    return null;
  }

  return <MainApp />;
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

  if (docRoute.active) {
    return <Docs initialSection={docRoute.section as any} onBack={closeDocs} />;
  }

  return (
    <AuthProvider>
      <ConnectedAccountsProvider>
        <SplitwiseProvider>
          <PortfolioProvider>
            <SampleModeProvider>
              <SampleModeProvider>
              <AuthenticatedApp />
            </SampleModeProvider>
            </SampleModeProvider>
          </PortfolioProvider>
        </SplitwiseProvider>
      </ConnectedAccountsProvider>
    </AuthProvider>
  );
}
