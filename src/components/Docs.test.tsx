/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Docs } from './Docs';

describe('Docs', () => {
  it('renders docs page signed out', () => {
    render(<Docs />);
    expect(screen.getByText('What is Nexus?')).toBeInTheDocument();
  });

  it('renders the documentation sidebar', () => {
    render(<Docs />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('renders getting started content by default', () => {
    render(<Docs />);
    expect(screen.getByText('What is Nexus?')).toBeInTheDocument();
    expect(screen.getByText('Two ways to use Nexus')).toBeInTheDocument();
    expect(screen.getByText('Who is it for?')).toBeInTheDocument();
  });

  it('renders firebase section when initialSection is firebase', () => {
    render(<Docs initialSection="firebase" />);
    expect(screen.getByText('Firebase Project Creation')).toBeInTheDocument();
    expect(screen.getByText('Authorized Domains')).toBeInTheDocument();
    expect(screen.getByText('Firebase Admin Service Account')).toBeInTheDocument();
  });

  it('renders api-keys section', () => {
    render(<Docs initialSection="api-keys" />);
    expect(screen.getByText('Setting up your AI assistant')).toBeInTheDocument();
    expect(screen.getByText('Option 1 — Gemini (Google AI)')).toBeInTheDocument();
    expect(screen.getByText('Option 2 — DeepSeek')).toBeInTheDocument();
  });

  it('renders troubleshooting section', () => {
    render(<Docs initialSection="troubleshooting" />);
    expect(screen.getByText('Something not working?')).toBeInTheDocument();
    expect(screen.getByText('I cannot sign in')).toBeInTheDocument();
  });

  it('renders integrations section', () => {
    render(<Docs initialSection="integrations" />);
    expect(screen.getByText('Connecting other services')).toBeInTheDocument();
    expect(screen.getByText(/Upstox.*auto-import/)).toBeInTheDocument();
  });

  it('renders user-guide section', () => {
    render(<Docs initialSection="user-guide" />);
    expect(screen.getByText('How to use Nexus')).toBeInTheDocument();
  });

  it('renders vercel section', () => {
    render(<Docs initialSection="production" />);
    expect(screen.getByText('Preview vs Production Safety')).toBeInTheDocument();
  });

  it('renders localhost section', () => {
    render(<Docs initialSection="development" />);
    expect(screen.getByText('Development Mode with Firebase')).toBeInTheDocument();
  });

  it('shows ENV table in localhost section', () => {
    render(<Docs initialSection="development" />);
    expect(screen.getByText('Full .env.local Reference')).toBeInTheDocument();
    expect(screen.getByText('NEXT_PUBLIC_FIREBASE_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('APP_BASE_URL')).toBeInTheDocument();
  });

  it('shows the back button', () => {
    render(<Docs onBack={() => {}} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});
