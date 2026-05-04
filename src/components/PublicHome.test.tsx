// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PublicHome } from './PublicHome';

describe('PublicHome', () => {
  it('renders the headline and value props', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Nexus Portfolio')).toBeInTheDocument();
    expect(screen.getByText(/one portfolio home for families/i)).toBeInTheDocument();
    expect(screen.getByText('Family wealth tracking')).toBeInTheDocument();
    expect(screen.getByText('Canada + India + US')).toBeInTheDocument();
    expect(screen.getByText('Manual + connected')).toBeInTheDocument();
    expect(screen.getByText('Bring your own keys')).toBeInTheDocument();
  });

  it('renders hosted, self-host, and docs path cards', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('Hosted (cloud)')).toBeInTheDocument();
    expect(screen.getByText('Self-host / open-source')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('renders Google sign-in CTAs', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    const signInButtons = screen.getAllByText('Sign in with Google');
    expect(signInButtons.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Uses Google sign-in for the hosted app')).toBeInTheDocument();
    expect(screen.getByText('Sign in to hosted app')).toBeInTheDocument();
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

  it('calls onLaunch when a Sign in with Google button is clicked', async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();

    render(<PublicHome authError={null} onLaunch={onLaunch} />);

    const signInButtons = screen.getAllByText('Sign in with Google');
    await user.click(signInButtons[0]);

    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it('renders links to GitHub repo', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    const githubLinks = screen.getAllByRole('link', { name: /github/i });
    expect(githubLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders footer with MIT license', () => {
    render(<PublicHome authError={null} onLaunch={vi.fn()} />);

    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });
});
