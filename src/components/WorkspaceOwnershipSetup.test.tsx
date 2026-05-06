// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { parseFirebaseConfigText, WorkspaceOwnershipSetup } from './WorkspaceOwnershipSetup';

describe('WorkspaceOwnershipSetup', () => {
  it('parses a pasted Firebase config object', () => {
    expect(parseFirebaseConfigText(`
      const firebaseConfig = {
        apiKey: "AIza-test",
        authDomain: "budget.firebaseapp.com",
        projectId: "budget",
        storageBucket: "budget.firebasestorage.app",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abc123"
      };
    `)).toEqual({
      apiKey: 'AIza-test',
      authDomain: 'budget.firebaseapp.com',
      projectId: 'budget',
      storageBucket: 'budget.firebasestorage.app',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abc123',
    });
  });

  it('renders the mode selection screen with both options', () => {
    render(<WorkspaceOwnershipSetup onChooseMode={vi.fn()} />);

    expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
    expect(screen.getAllByText('Use Nexus Hosted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bring Your Own Firebase').length).toBeGreaterThanOrEqual(1);
  });

  it('renders value propositions for hosted mode', () => {
    render(<WorkspaceOwnershipSetup onChooseMode={vi.fn()} />);

    expect(screen.getByText('Zero configuration required')).toBeInTheDocument();
    expect(screen.getByText('Automatic backups and updates')).toBeInTheDocument();
    expect(screen.getByText('Shared portfolio with family members')).toBeInTheDocument();
  });

  it('renders value propositions for self-owned mode', () => {
    render(<WorkspaceOwnershipSetup onChooseMode={vi.fn()} />);

    expect(screen.getByText('Full data ownership and privacy')).toBeInTheDocument();
    expect(screen.getByText('Use your own Firebase project')).toBeInTheDocument();
    expect(screen.getByText('Still use Nexus app and login')).toBeInTheDocument();
  });

  it('calls onChooseMode with hosted when hosted button is clicked', async () => {
    const user = userEvent.setup();
    const onChooseMode = vi.fn();

    render(<WorkspaceOwnershipSetup onChooseMode={onChooseMode} />);

    const hostedButtons = screen.getAllByText('Use Nexus Hosted');
    const hostedButton = hostedButtons.find(el => el.tagName === 'BUTTON') || hostedButtons[0];
    await user.click(hostedButton);
    expect(onChooseMode).toHaveBeenCalledWith('hosted');
    expect(onChooseMode).toHaveBeenCalledTimes(1);
  });

  it('shows firebase config form when self-owned is selected', async () => {
    const user = userEvent.setup();
    const onChooseMode = vi.fn();

    render(<WorkspaceOwnershipSetup onChooseMode={onChooseMode} />);

    await user.click(screen.getByText('Configure My Firebase'));

    expect(screen.getByText('Configure Your Firebase')).toBeInTheDocument();
    expect(screen.getByText(/Where to find this in Firebase/)).toBeInTheDocument();
    expect(screen.getByText(/Project Overview/)).toBeInTheDocument();
    expect(screen.getByLabelText('Paste firebaseConfig')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText('Auth Domain')).toBeInTheDocument();
    expect(screen.getByText('Project ID')).toBeInTheDocument();
    expect(screen.getByText('Storage Bucket')).toBeInTheDocument();
    expect(screen.getByText('Messaging Sender ID')).toBeInTheDocument();
    expect(screen.getByText('App ID')).toBeInTheDocument();

    expect(onChooseMode).not.toHaveBeenCalled();
  });

  it('goes back to mode selection from firebase config form', async () => {
    const user = userEvent.setup();
    const onChooseMode = vi.fn();

    render(<WorkspaceOwnershipSetup onChooseMode={onChooseMode} />);

    await user.click(screen.getByText('Configure My Firebase'));
    await user.click(screen.getByText('Back'));

    expect(screen.getByText('Welcome to Nexus Portfolio')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty firebase config', async () => {
    const user = userEvent.setup();
    const onChooseMode = vi.fn();

    render(<WorkspaceOwnershipSetup onChooseMode={onChooseMode} />);

    await user.click(screen.getByText('Configure My Firebase'));
    await user.click(screen.getByText('Save & Continue'));

    expect(screen.getAllByText(/is required/).length).toBe(6);
    expect(onChooseMode).not.toHaveBeenCalled();
  });

  it('calls onChooseMode with selfOwned and config when valid', async () => {
    const user = userEvent.setup();
    const onChooseMode = vi.fn();

    render(<WorkspaceOwnershipSetup onChooseMode={onChooseMode} />);

    await user.click(screen.getByText('Configure My Firebase'));

    const fields = [
      { placeholder: 'AIza...', value: 'my-api-key' },
      { placeholder: 'project.firebaseapp.com', value: 'my-project.firebaseapp.com' },
      { placeholder: 'my-project-id', value: 'my-project-id' },
      { placeholder: 'project.firebasestorage.app', value: 'my-project.appspot.com' },
      { placeholder: '123456789', value: '123456789' },
      { placeholder: '1:123:web:abc', value: '1:123:web:abc' },
    ];

    for (const field of fields) {
      const input = screen.getByPlaceholderText(field.placeholder);
      await user.clear(input);
      await user.type(input, field.value);
    }

    await user.click(screen.getByText('Save & Continue'));

    expect(onChooseMode).toHaveBeenCalledTimes(1);
    expect(onChooseMode).toHaveBeenCalledWith('selfOwned', {
      apiKey: 'my-api-key',
      authDomain: 'my-project.firebaseapp.com',
      projectId: 'my-project-id',
      storageBucket: 'my-project.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123:web:abc',
    });
  });

  it('fills firebase fields from pasted config', async () => {
    const user = userEvent.setup();
    const onChooseMode = vi.fn();

    render(<WorkspaceOwnershipSetup onChooseMode={onChooseMode} />);

    await user.click(screen.getByText('Configure My Firebase'));
    fireEvent.change(screen.getByLabelText('Paste firebaseConfig'), { target: { value: `const firebaseConfig = {
      apiKey: "AIza-pasted",
      authDomain: "budget.firebaseapp.com",
      projectId: "budget",
      storageBucket: "budget.firebasestorage.app",
      messagingSenderId: "987654321",
      appId: "1:987654321:web:def456"
    };` } });
    await user.click(screen.getByText('Save & Continue'));

    expect(onChooseMode).toHaveBeenCalledWith('selfOwned', {
      apiKey: 'AIza-pasted',
      authDomain: 'budget.firebaseapp.com',
      projectId: 'budget',
      storageBucket: 'budget.firebasestorage.app',
      messagingSenderId: '987654321',
      appId: '1:987654321:web:def456',
    });
  });

  it('shows info box about admin credentials being separate', () => {
    render(<WorkspaceOwnershipSetup onChooseMode={vi.fn()} />);

    expect(screen.getByText('Learn more about setup modes in the docs')).toBeInTheDocument();
  });

  it('shows admin credentials notice in firebase config form', async () => {
    const user = userEvent.setup();

    render(<WorkspaceOwnershipSetup onChooseMode={vi.fn()} />);
    await user.click(screen.getByText('Configure My Firebase'));

    expect(screen.getByText(/Server-side Admin credentials are configured separately/)).toBeInTheDocument();
  });
});
