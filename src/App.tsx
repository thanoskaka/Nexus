import React, { useEffect, useState } from 'react';
import { PortfolioProvider, usePortfolio } from './store/PortfolioContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { Asset } from './store/db';
import { Dashboard } from './components/Dashboard';
import { Ledger } from './components/Ledger';
import { AddAssetModal } from './components/AddAssetModal';
import { Settings } from './components/Settings';
import { ImportProgressOverlay } from './components/ImportProgressOverlay';
import { Button } from './components/ui/button';
import { Select } from './components/ui/select';
import { RefreshCw, Moon, Sun, Settings as SettingsIcon, LayoutDashboard, Wallet, FileText, LogOut } from 'lucide-react';

function MainApp() {
  const { user, logout } = useAuth();
  const { refreshPrices, isRefreshing, portfolios, activePortfolioId, setActivePortfolioId } = usePortfolio();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [currentView, setCurrentView] = useState<'dashboard' | 'assets' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('nexus-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle('dark', next);
      window.localStorage.setItem('nexus-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleEditAsset = React.useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  }, []);

  return (
    <div className={`min-h-screen bg-[#F8F9FA] text-slate-900 dark:bg-slate-900 dark:text-slate-50 transition-colors duration-200 font-sans`}>
      <header className="bg-white dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 grid grid-cols-1 gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center gap-3 cursor-pointer min-w-0 lg:justify-self-start" onClick={() => setCurrentView('dashboard')}>
            <div className="w-10 h-10 bg-[#00875A] rounded-xl flex items-center justify-center shadow-sm">
              <Wallet className="text-white h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight text-slate-900 dark:text-white">Family Portfolio</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Track your wealth</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-1 rounded-full border border-slate-100 dark:border-slate-800 xl:justify-self-center xl:min-w-0">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[#00875A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button 
              onClick={() => setCurrentView('assets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentView === 'assets' ? 'bg-[#00875A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </button>
            <button 
              onClick={() => setCurrentView('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-[#00875A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
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
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'assets' && <Ledger onEditAsset={handleEditAsset} onAddAsset={() => setIsAddModalOpen(true)} />}
        {currentView === 'settings' && <Settings />}
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

  if (loading || (user && isPortfolioLoading)) {
    return <CenteredState title="Loading portfolio" description="Connecting to Firebase and syncing your shared portfolio..." />;
  }

  if (!user) {
    return (
      <CenteredState
        title="Sign in to start your portfolio"
        description={authError || 'Sign in with Google and we will create your personal portfolio automatically. You can also switch into any portfolio you have been invited to.'}
        action={(
          <Button onClick={() => void signInWithGoogle()} className="bg-[#00875A] hover:bg-[#007A51] text-white">
            Sign in with Google
          </Button>
        )}
      />
    );
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

function CenteredState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00875A]">
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-base text-slate-600">{description}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <AuthenticatedApp />
      </PortfolioProvider>
    </AuthProvider>
  );
}
