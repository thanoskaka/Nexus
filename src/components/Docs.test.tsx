/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Docs } from './Docs';

describe('Docs', () => {
  it('renders docs page signed out', () => {
    render(<Docs />);
    expect(screen.getByText('What is Nexus Portfolio?')).toBeInTheDocument();
  });

  it('renders the documentation sidebar', () => {
    render(<Docs />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('renders getting started content by default', () => {
    render(<Docs />);
    expect(screen.getByText('What is Nexus Portfolio?')).toBeInTheDocument();
    expect(screen.getByText('Hosted vs Self-Hosted')).toBeInTheDocument();
    expect(screen.getByText('Local Mock / Demo Mode')).toBeInTheDocument();
  });

  it('renders firebase section when initialSection is firebase', () => {
    render(<Docs initialSection="firebase" />);
    expect(screen.getByText('Firebase Project Creation')).toBeInTheDocument();
    expect(screen.getByText('Authorized Domains')).toBeInTheDocument();
    expect(screen.getByText('Firebase Admin Service Account')).toBeInTheDocument();
  });

  it('renders api-keys section', () => {
    render(<Docs initialSection="api-keys" />);
    expect(screen.getByText('Gemini (AI Assistant)')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek (AI Assistant)')).toBeInTheDocument();
    expect(screen.getAllByText('Alpha Vantage').length).toBeGreaterThanOrEqual(1);
  });

  it('renders troubleshooting section', () => {
    render(<Docs initialSection="troubleshooting" />);
    expect(screen.getByText('Common Issues')).toBeInTheDocument();
    expect(screen.getByText('Firebase env missing')).toBeInTheDocument();
    expect(screen.getByText('unauthorized-domain')).toBeInTheDocument();
  });

  it('renders integrations section', () => {
    render(<Docs initialSection="integrations" />);
    expect(screen.getByText('Upstox OAuth')).toBeInTheDocument();
    expect(screen.getByText('Splitwise OAuth')).toBeInTheDocument();
    expect(screen.getByText('Google Drive OAuth')).toBeInTheDocument();
  });

  it('renders user-guide section', () => {
    render(<Docs initialSection="user-guide" />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Assets Ledger')).toBeInTheDocument();
  });

  it('renders vercel section', () => {
    render(<Docs initialSection="vercel" />);
    expect(screen.getByText('Preview vs Production Safety')).toBeInTheDocument();
  });

  it('renders localhost section', () => {
    render(<Docs initialSection="localhost" />);
    expect(screen.getByText('Local Real Firebase Mode')).toBeInTheDocument();
  });

  it('shows ENV table in localhost section', () => {
    render(<Docs initialSection="localhost" />);
    expect(screen.getByText('Full .env.local Reference')).toBeInTheDocument();
    expect(screen.getByText('NEXT_PUBLIC_FIREBASE_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('APP_BASE_URL')).toBeInTheDocument();
  });

  it('shows the back button', () => {
    render(<Docs onBack={() => {}} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});
