// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PricingPage } from './PricingPage';

describe('PricingPage', () => {
  it('renders the headline and tagline', () => {
    render(<PricingPage onLaunch={vi.fn()} />);

    expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
    expect(screen.getByText(/Self-host free forever/)).toBeInTheDocument();
    expect(screen.getByText(/Hosted for the cost of a coffee/)).toBeInTheDocument();
  });

  it('renders all three pricing tiers', () => {
    render(<PricingPage onLaunch={vi.fn()} />);

    expect(screen.getByText('Self-Hosted')).toBeInTheDocument();
    expect(screen.getByText('Nexus Cloud')).toBeInTheDocument();
    expect(screen.getByText('Enterprise / Custom')).toBeInTheDocument();
  });

  it('renders pricing values', () => {
    render(<PricingPage onLaunch={vi.fn()} />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('$1.99')).toBeInTheDocument();
    expect(screen.getByText('Contact us')).toBeInTheDocument();
  });

  it('renders all FAQ questions', () => {
    render(<PricingPage onLaunch={vi.fn()} />);

    expect(screen.getByText('Can I migrate from cloud to self-hosted?')).toBeInTheDocument();
    expect(screen.getByText('Who can see my data?')).toBeInTheDocument();
    expect(screen.getByText('Do I need to bring API keys?')).toBeInTheDocument();
    expect(screen.getByText('Is Plaid supported?')).toBeInTheDocument();
    expect(screen.getByText('What integrations exist today?')).toBeInTheDocument();
    expect(screen.getByText('Is this freemium?')).toBeInTheDocument();
  });

  it('toggles FAQ answer on click', async () => {
    const user = userEvent.setup();
    render(<PricingPage onLaunch={vi.fn()} />);

    expect(screen.queryByText(/You control access entirely/)).not.toBeInTheDocument();

    await user.click(screen.getByText('Who can see my data?'));
    expect(screen.getByText(/You control access entirely/)).toBeInTheDocument();

    await user.click(screen.getByText('Who can see my data?'));
    expect(screen.queryByText(/You control access entirely/)).not.toBeInTheDocument();
  });

  it('renders back to home link', () => {
    render(<PricingPage onLaunch={vi.fn()} />);

    expect(screen.getByText('Back to home')).toBeInTheDocument();
  });

  it('calls onLaunch when Get Started button is clicked', async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();

    render(<PricingPage onLaunch={onLaunch} />);

    const ctaButtons = screen.getAllByText('Get Started');
    await user.click(ctaButtons[0]);

    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it('renders GitHub and Docs links in footer', () => {
    render(<PricingPage onLaunch={vi.fn()} />);

    const githubLinks = screen.getAllByRole('link', { name: /github/i });
    expect(githubLinks.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });
});
