export type ParsedInitialView = {
  view: 'dashboard' | 'assets' | 'settings' | 'setup';
  settingsSection?: 'household' | 'accounts-limits' | 'preferences' | 'integrations' | 'data-management';
};

export function parseInitialViewFromQuery(href?: string): ParsedInitialView {
  if (!href && typeof window === 'undefined') {
    return {
      view: 'dashboard',
      settingsSection: undefined,
    };
  }

  const url = new URL(href || window.location.href, 'http://localhost');
  const rawView = url.searchParams.get('view');
  const rawSection = url.searchParams.get('section');

  const legacyAccounts = rawView === 'accounts';
  const view = legacyAccounts ? 'settings' : rawView === 'settings' || rawView === 'assets' || rawView === 'setup' ? rawView : 'dashboard';
  const allowedSections = ['household', 'accounts-limits', 'preferences', 'integrations', 'data-management'] as const;
  const settingsSection = legacyAccounts
    ? 'accounts-limits'
    : allowedSections.find((section) => section === rawSection);

  return { view, settingsSection };
}
