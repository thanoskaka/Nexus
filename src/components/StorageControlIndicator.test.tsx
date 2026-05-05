// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { StorageControlModal } from './StorageControlModal';
import { computeStorageControlSnapshot } from '../lib/storageControlStatus';

const hostedAllDefaults = computeStorageControlSnapshot('hosted', [
  { providerId: 'gemini', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'deepseek', hasHostedDefault: false, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'massive', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'alpha_vantage', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'logo_dev', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
]);

const hostedMixed = computeStorageControlSnapshot('hosted', [
  { providerId: 'gemini', hasHostedDefault: true, userKeyConfigured: true, preference: 'user' },
  { providerId: 'deepseek', hasHostedDefault: false, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'massive', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'alpha_vantage', hasHostedDefault: false, userKeyConfigured: true, preference: 'user' },
  { providerId: 'logo_dev', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
]);

const selfOwnedNoKeys = computeStorageControlSnapshot('selfOwned', [
  { providerId: 'gemini', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'deepseek', hasHostedDefault: false, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'massive', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'alpha_vantage', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
  { providerId: 'logo_dev', hasHostedDefault: true, userKeyConfigured: false, preference: 'hosted' },
]);

describe('StorageControlModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<StorageControlModal open={false} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nexus-hosted badge for hosted defaults', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getByText('Nexus Hosted')).toBeInTheDocument();
  });

  it('renders Self-Owned badge for self-owned mode', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={selfOwnedNoKeys} />);
    expect(screen.getByText('Self-Owned')).toBeInTheDocument();
  });

  it('renders Mixed badge for mixed mode', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedMixed} />);
    expect(screen.getByText('Mixed')).toBeInTheDocument();
  });

  it('shows where data lives section', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getByText('Where your data lives')).toBeInTheDocument();
  });

  it('shows where API keys live section', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getByText('Where your API keys live')).toBeInTheDocument();
  });

  it('shows what you control section', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getByText('What you control')).toBeInTheDocument();
  });

  it('shows "Using hosted default" for providers with defaults', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getAllByText('Using hosted default').length).toBeGreaterThanOrEqual(4);
  });

  it('shows "Using your key" for providers with user keys in mixed mode', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedMixed} />);
    expect(screen.getAllByText('Using your key').length).toBe(2);
  });

  it('shows "Not configured" for providers with no default and no user key', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('shows all 5 provider names', () => {
    render(<StorageControlModal open={true} onClose={vi.fn()} snapshot={hostedAllDefaults} />);
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    expect(screen.getByText('Massive')).toBeInTheDocument();
    expect(screen.getByText('Alpha Vantage')).toBeInTheDocument();
    expect(screen.getByText('Logo.dev')).toBeInTheDocument();
  });
});
