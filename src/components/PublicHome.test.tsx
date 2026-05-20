// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PublicHome } from './PublicHome';

describe('PublicHome', () => {
  it('renders brand name and hero tagline', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Nexus Portfolio')).toBeInTheDocument();
    expect(screen.getByText(/your family's wealth/i)).toBeInTheDocument();
    expect(screen.getByText(/your server\. your rules/i)).toBeInTheDocument();
  });

  it('renders the secondary tagline', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText(/don't trust black boxes/i)).toBeInTheDocument();
  });

  it('renders primary CTAs', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    const hostedCtas = screen.getAllByText('Get Started');
    expect(hostedCtas.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('View GitHub')).toBeInTheDocument();
    expect(screen.getByText('Read self-host guide')).toBeInTheDocument();
  });

  it('renders how it works steps', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Add your assets')).toBeInTheDocument();
    expect(screen.getByText('Family workspace')).toBeInTheDocument();
    expect(screen.getByText('Dashboard & AI insights')).toBeInTheDocument();
  });

  it('renders privacy proof section', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Privacy by design')).toBeInTheDocument();
    expect(screen.getByText(/self-owned mode keeps portfolio data in your Firebase project/i)).toBeInTheDocument();
  });

  it('renders multi-country section with Canada, India, and United States', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Built for global families')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('India')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
  });

  it('renders self-host vs hosted comparison', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Self-host vs Hosted')).toBeInTheDocument();
    expect(screen.getByText('Data location')).toBeInTheDocument();
    expect(screen.getByText('Setup time')).toBeInTheDocument();
    expect(screen.getByText('Monthly cost')).toBeInTheDocument();
  });

  it('renders pricing section with Free and $1.99', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getAllByText('Pricing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$1.99').length).toBeGreaterThanOrEqual(1);
  });

  it('shows auth error when provided', () => {
    render(<PublicHome authError="Google sign-in is not enabled." onLaunch={vi.fn()} />);

    expect(screen.getByText('Google sign-in is not enabled.')).toBeInTheDocument();
  });

  it('does not show auth error when null', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.queryByText('Google sign-in is not enabled.')).not.toBeInTheDocument();
  });

  it('shows signed-out notice when signedOut is true', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} signedOut />);

    expect(screen.getByText(/Signed out/)).toBeInTheDocument();
  });

  it('does not show signed-out notice by default', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.queryByText(/Signed out/)).not.toBeInTheDocument();
  });

  it('calls onLaunch when a hosted CTA is clicked', async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();

    render(<PublicHome authError={null} onLaunch={onLaunch} />);

    const ctaButtons = screen.getAllByText('Get Started');
    await user.click(ctaButtons[0]);

    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it('renders links to GitHub repo', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    const githubLinks = screen.getAllByRole('link', { name: /github/i });
    expect(githubLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders navigation links in header', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    const docsLinks = screen.getAllByRole('link', { name: /docs/i });
    expect(docsLinks.length).toBeGreaterThanOrEqual(1);
    const pricingLinks = screen.getAllByRole('link', { name: /pricing/i });
    expect(pricingLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders footer with MIT license', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });
});
