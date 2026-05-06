let _isSelfOwned = false;

export function setWorkspaceMode(mode: 'hosted' | 'selfOwned'): void {
  _isSelfOwned = mode === 'selfOwned';
}

export function isSelfOwnedMode(): boolean {
  return _isSelfOwned;
}

export function assertHostedMode(feature: string): void {
  if (_isSelfOwned) {
    throw new Error(
      `${feature} is not supported in Bring Your Own Firebase mode. ` +
      'Switch to Nexus Hosted in Settings, or self-host the Nexus backend with your Firebase Admin credentials.'
    );
  }
}
