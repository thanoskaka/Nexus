// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { SelfOwnedPlaceholder } from './SelfOwnedPlaceholder';
import type { FirebaseClientConfig } from '../store/workspaceOwnership';

describe('SelfOwnedPlaceholder', () => {
  it('renders the draft saved heading', () => {
    render(<SelfOwnedPlaceholder onSwitchToHosted={vi.fn()} />);

    expect(screen.getByText(/Self-Owned Firebase/)).toBeInTheDocument();
    expect(screen.getByText(/Draft Saved/)).toBeInTheDocument();
  });

  it('shows not active yet message', () => {
    render(<SelfOwnedPlaceholder onSwitchToHosted={vi.fn()} />);

    expect(screen.getAllByText(/self-owned data connection is not active yet/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows saved firebase config when provided', () => {
    const config: FirebaseClientConfig = {
      apiKey: 'test-key',
      authDomain: 'my-project.firebaseapp.com',
      projectId: 'my-project-id',
      storageBucket: 'my-project.appspot.com',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    };

    render(<SelfOwnedPlaceholder firebaseConfig={config} onSwitchToHosted={vi.fn()} />);

    expect(screen.getByText('my-project-id')).toBeInTheDocument();
    expect(screen.getByText('my-project.firebaseapp.com')).toBeInTheDocument();
    expect(screen.getByText('my-project.appspot.com')).toBeInTheDocument();
  });

  it('does not show config section when no firebaseConfig provided', () => {
    render(<SelfOwnedPlaceholder onSwitchToHosted={vi.fn()} />);

    expect(screen.queryByText('Saved Draft Configuration')).not.toBeInTheDocument();
  });

  it('shows next steps docs section', () => {
    render(<SelfOwnedPlaceholder onSwitchToHosted={vi.fn()} />);

    expect(screen.getByText(/Next steps for self-owned setup/)).toBeInTheDocument();
    expect(screen.getByText(/setup documentation/)).toBeInTheDocument();
  });

  it('calls onSwitchToHosted when hosted button is clicked', async () => {
    const user = userEvent.setup();
    const onSwitchToHosted = vi.fn();

    render(<SelfOwnedPlaceholder onSwitchToHosted={onSwitchToHosted} />);

    await user.click(screen.getByText('Use Nexus Hosted Instead'));

    expect(onSwitchToHosted).toHaveBeenCalledTimes(1);
  });

  it('shows docs link', () => {
    render(<SelfOwnedPlaceholder onSwitchToHosted={vi.fn()} />);

    expect(screen.getByText('View all documentation')).toBeInTheDocument();
  });
});
