// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GettingStartedChecklist } from './GettingStartedChecklist';
import type { SetupStatusResponse } from '../lib/setupStatusApi';

const mockFetch = vi.fn();

const fullStatus: SetupStatusResponse = {
  mode: 'self-hosted',
  app: { baseUrl: 'https://example.com' },
  firebase: { configured: true, projectId: 'my-project' },
  firebaseAdmin: {
    configured: true,
    hasProjectId: true,
    hasClientEmail: true,
    hasPrivateKey: true,
  },
  pricing: {
    massive: { configured: true, present: true },
    alphaVantage: { configured: false, present: false },
    finnhub: { configured: false, present: false },
    upstoxSystem: { configured: true, present: true },
  },
  integrations: {
    upstox: {
      clientConfigured: true,
      encryptionConfigured: true,
      stateSecretConfigured: true,
      redirectConfigured: true,
    },
    splitwise: {
      clientConfigured: true,
      encryptionConfigured: true,
      stateSecretConfigured: true,
      redirectConfigured: true,
    },
  },
  ai: {
    serverKey: { configured: true, present: true },
    userCredentialsSupported: true,
  },
  casParser: {
    configured: false,
    hasServiceUrl: false,
    allowsExternalFallback: false,
  },
  logoProvider: {
    serverKey: { configured: false, present: false },
    clientKey: { configured: true, present: true },
  },
  googleDrive: {
    clientId: { configured: false, present: false },
  },
  connectedAccounts: {
    encryptionConfigured: true,
    stateSecretConfigured: true,
  },
  integrationTokens: {
    encryptionConfigured: true,
  },
  features: {
    manualAssets: true,
    dashboard: true,
    priceRefresh: true,
    firebaseAuth: true,
    firebaseAdmin: true,
    upstoxConnectedAccounts: true,
    splitwise: true,
    casParser: false,
    screenshotImport: true,
    googleDriveSync: false,
    aiAssistant: true,
    logoProvider: true,
  },
};

const emptyStatus: SetupStatusResponse = {
  mode: 'local',
  app: { baseUrl: '' },
  firebase: { configured: false, projectId: null },
  firebaseAdmin: {
    configured: false,
    hasProjectId: false,
    hasClientEmail: false,
    hasPrivateKey: false,
  },
  pricing: {
    massive: { configured: false, present: false },
    alphaVantage: { configured: false, present: false },
    finnhub: { configured: false, present: false },
    upstoxSystem: { configured: false, present: false },
  },
  integrations: {
    upstox: {
      clientConfigured: false,
      encryptionConfigured: false,
      stateSecretConfigured: false,
      redirectConfigured: false,
    },
    splitwise: {
      clientConfigured: false,
      encryptionConfigured: false,
      stateSecretConfigured: false,
      redirectConfigured: false,
    },
  },
  ai: {
    serverKey: { configured: false, present: false },
    userCredentialsSupported: false,
  },
  casParser: {
    configured: false,
    hasServiceUrl: false,
    allowsExternalFallback: false,
  },
  logoProvider: {
    serverKey: { configured: false, present: false },
    clientKey: { configured: false, present: false },
  },
  googleDrive: {
    clientId: { configured: false, present: false },
  },
  connectedAccounts: {
    encryptionConfigured: false,
    stateSecretConfigured: false,
  },
  integrationTokens: {
    encryptionConfigured: false,
  },
  features: {
    manualAssets: true,
    dashboard: true,
    priceRefresh: true,
    firebaseAuth: false,
    firebaseAdmin: false,
    upstoxConnectedAccounts: false,
    splitwise: false,
    casParser: false,
    screenshotImport: false,
    googleDriveSync: false,
    aiAssistant: false,
    logoProvider: false,
  },
};

describe('GettingStartedChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
  });

  const baseProps = {
    assetsLength: 0,
    onNavigate: vi.fn(),
    onAddAsset: vi.fn(),
  };

  it('renders the checklist with title and progress', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
    });

    expect(screen.getByText(/1\/7 steps complete/)).toBeTruthy();
  });

  it('renders required, recommended, and optional section headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('required')).toBeTruthy();
    });

    expect(screen.getByText('recommended')).toBeTruthy();
    expect(screen.getByText('optional')).toBeTruthy();
  });

  it('renders all checklist item labels when setup is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Sign in & portfolio loaded')).toBeTruthy();
    });

    expect(screen.getByText('Add your first manual asset')).toBeTruthy();
    expect(screen.getByText('Configure base setup')).toBeTruthy();
    expect(screen.getByText('Connect an optional provider')).toBeTruthy();
    expect(screen.getByText('Import holdings')).toBeTruthy();
    expect(screen.getByText('Add AI key (optional)')).toBeTruthy();
    expect(screen.getByText('Review setup guide')).toBeTruthy();
  });

  it('shows items as done when assets exist and setup is configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<GettingStartedChecklist {...baseProps} assetsLength={3} />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
    });

    const doneIndicators = screen.getAllByText('Done');
    expect(doneIndicators.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/5\/7 steps complete/)).toBeTruthy();
  });

  it('hides the checklist when dismissed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    const user = userEvent.setup();
    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
    });

    const dismissButton = screen.getByLabelText('Dismiss checklist');
    await user.click(dismissButton);

    expect(screen.queryByText('Getting Started')).toBeNull();
    expect(localStorage.getItem('nexus-checklist-dismissed')).toBe('true');
  });

  it('collapses and expands the checklist', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    const user = userEvent.setup();
    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('required')).toBeTruthy();
    });

    const collapseButton = screen.getByLabelText('Collapse checklist');
    await user.click(collapseButton);

    expect(screen.queryByText('required')).toBeNull();
    expect(localStorage.getItem('nexus-checklist-collapsed')).toBe('true');

    await user.click(screen.getByLabelText('Expand checklist'));
    expect(screen.getByText('required')).toBeTruthy();
  });

  it('restores collapsed state from localStorage on mount', async () => {
    localStorage.setItem('nexus-checklist-collapsed', 'true');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
    });

    expect(screen.queryByText('required')).toBeNull();
  });

  it('restores dismissed state from localStorage on mount', async () => {
    localStorage.setItem('nexus-checklist-dismissed', 'true');

    render(<GettingStartedChecklist {...baseProps} />);

    expect(screen.queryByText('Getting Started')).toBeNull();
  });

  it('shows action buttons for pending items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add Asset')).toBeTruthy();
    });

    expect(screen.getByText('View Setup Guide')).toBeTruthy();
    expect(screen.getByText('Go to Integrations')).toBeTruthy();
    expect(screen.getByText('Import')).toBeTruthy();
    expect(screen.getByText('AI Settings')).toBeTruthy();
    expect(screen.getByText('Open Docs')).toBeTruthy();
  });

  it('calls onAddAsset when Add Asset button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    const onAddAsset = vi.fn();
    const user = userEvent.setup();

    render(<GettingStartedChecklist {...baseProps} onAddAsset={onAddAsset} />);

    await waitFor(() => {
      expect(screen.getByText('Add Asset')).toBeTruthy();
    });

    await user.click(screen.getByText('Add Asset'));
    expect(onAddAsset).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigate when Go to Integrations is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    const onNavigate = vi.fn();
    const user = userEvent.setup();

    render(<GettingStartedChecklist {...baseProps} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Go to Integrations')).toBeTruthy();
    });

    await user.click(screen.getByText('Go to Integrations'));
    expect(onNavigate).toHaveBeenCalledWith('settings', 'integrations');
  });

  it('shows "Add first manual asset" as done when assets exist', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStatus,
    });

    render(<GettingStartedChecklist {...baseProps} assetsLength={2} />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
    });

    const doneBadges = screen.getAllByText('Done');
    expect(doneBadges.length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText('Add Asset')).toBeNull();
  });

  it('shows "Configure base setup" as done when firebaseAdmin is configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<GettingStartedChecklist {...baseProps} />);

    await waitFor(() => {
      const doneBadges = screen.getAllByText('Done');
      expect(doneBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('does not render action buttons for done items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => fullStatus,
    });

    render(<GettingStartedChecklist {...baseProps} assetsLength={3} />);

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
    });

    expect(screen.queryByText('Add Asset')).toBeNull();
    expect(screen.queryByText('View Setup Guide')).toBeNull();
    expect(screen.queryByText('Go to Integrations')).toBeNull();
  });

  it('does not fetch setup status when dismissed', () => {
    localStorage.setItem('nexus-checklist-dismissed', 'true');

    render(<GettingStartedChecklist {...baseProps} />);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
