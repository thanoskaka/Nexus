import { useEffect, useMemo, useState } from 'react';
import { computeAllResolved } from './checklistCompletion';

const SETUP_TAB_CREATED_KEY_PREFIX = 'nexus-setup-tab:v2';
const SETUP_COMPLETED_KEY_PREFIX = 'nexus-setup-completed:v2';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function buildCreatedKey(uid?: string): string {
  return uid ? `${SETUP_TAB_CREATED_KEY_PREFIX}:${uid}` : SETUP_TAB_CREATED_KEY_PREFIX;
}

function buildCompletedKey(uid?: string): string {
  return uid ? `${SETUP_COMPLETED_KEY_PREFIX}:${uid}` : SETUP_COMPLETED_KEY_PREFIX;
}

function getTabCreatedAt(uid?: string): number | null {
  try {
    const raw = window.localStorage.getItem(buildCreatedKey(uid));
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isSetupPermanentlyCompleted(uid?: string): boolean {
  try {
    return window.localStorage.getItem(buildCompletedKey(uid)) === 'true';
  } catch {
    return false;
  }
}

export function useSetupTabVisibility(params: {
  assetsCount: number;
  upstoxConnected: boolean;
  splitwiseConnected: boolean;
  aiKeyConfigured: boolean;
  userUid?: string;
}): { visible: boolean } {
  const { assetsCount, upstoxConnected, splitwiseConnected, aiKeyConfigured, userUid } = params;

  const [permanentlyCompleted, setPermanentlyCompleted] = useState<boolean>(() => isSetupPermanentlyCompleted(userUid));

  useEffect(() => {
    setPermanentlyCompleted(isSetupPermanentlyCompleted(userUid));
  }, [userUid]);

  const [adminHealthy, setAdminHealthy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => {
        if (!cancelled) {
          setAdminHealthy(res.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminHealthy(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const allResolved = useMemo(
    () => computeAllResolved({ assetsCount, upstoxConnected, splitwiseConnected, aiKeyConfigured, adminHealthy }),
    [assetsCount, upstoxConnected, splitwiseConnected, aiKeyConfigured, adminHealthy],
  );

  const isExpired = useMemo(() => {
    const createdAt = getTabCreatedAt(userUid);
    if (!createdAt) return false;
    return Date.now() - createdAt >= THIRTY_DAYS_MS;
  }, [userUid]);

  const shouldHide = permanentlyCompleted || allResolved || isExpired;

  useEffect(() => {
    if (shouldHide && !permanentlyCompleted) {
      try {
        window.localStorage.setItem(buildCompletedKey(userUid), 'true');
        setPermanentlyCompleted(true);
      } catch {}
    }
  }, [shouldHide, permanentlyCompleted, userUid]);

  useEffect(() => {
    const existing = getTabCreatedAt(userUid);
    if (existing === null) {
      try {
        window.localStorage.setItem(buildCreatedKey(userUid), String(Date.now()));
      } catch {}
    }
  }, [userUid]);

  return { visible: !shouldHide };
}
