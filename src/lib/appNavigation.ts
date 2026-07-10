export type ParsedInitialView = {
  view: 'dashboard' | 'accounts' | 'assets' | 'settings' | 'setup';
  settingsSection?: 'integrations';
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

  const view = rawView === 'settings' || rawView === 'accounts' || rawView === 'assets' || rawView === 'setup' ? rawView : 'dashboard';
  const settingsSection = rawSection === 'integrations' ? 'integrations' : undefined;

  return { view, settingsSection };
}
