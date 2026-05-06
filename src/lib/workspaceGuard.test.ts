// @vitest-environment node
import { describe, expect, it, beforeEach } from 'vitest';
import { setWorkspaceMode, isSelfOwnedMode, assertHostedMode } from './workspaceGuard';

describe('workspaceGuard', () => {
  beforeEach(() => {
    setWorkspaceMode('hosted');
  });

  describe('setWorkspaceMode / isSelfOwnedMode', () => {
    it('defaults to hosted mode', () => {
      expect(isSelfOwnedMode()).toBe(false);
    });

    it('returns true after setWorkspaceMode selfOwned', () => {
      setWorkspaceMode('selfOwned');
      expect(isSelfOwnedMode()).toBe(true);
    });

    it('returns false after switching back to hosted', () => {
      setWorkspaceMode('selfOwned');
      setWorkspaceMode('hosted');
      expect(isSelfOwnedMode()).toBe(false);
    });
  });

  describe('assertHostedMode', () => {
    it('does not throw in hosted mode', () => {
      expect(() => assertHostedMode('AI Chat')).not.toThrow();
    });

    it('throws descriptive error in selfOwned mode', () => {
      setWorkspaceMode('selfOwned');
      expect(() => assertHostedMode('AI Chat')).toThrow(
        /not supported in Bring Your Own Firebase mode/
      );
    });

    it('includes the feature name in the error', () => {
      setWorkspaceMode('selfOwned');
      expect(() => assertHostedMode('Splitwise')).toThrow(
        /Splitwise is not supported/
      );
    });

    it('includes actionable next steps in the error', () => {
      setWorkspaceMode('selfOwned');
      expect(() => assertHostedMode('CAS Import')).toThrow(
        /Switch to Nexus Hosted|self-host the Nexus backend/
      );
    });
  });
});
