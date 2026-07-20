import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Linking } from 'react-native';

import {
  clearMemberSession,
  exchangeNativeCode,
  getMemberSession,
  requestNativeSignInLink,
  type StoredMemberSession,
  yweFetch,
} from './ywe';

type MemberUser = { id: string; email: string };

type AuthCtx = {
  ready: boolean;
  session: StoredMemberSession | null;
  user: MemberUser | null;
  entitled: boolean;
  refreshEntitlements: () => Promise<void>;
  requestSignInLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredMemberSession | null>(null);
  const [entitled, setEntitled] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshEntitlements = useCallback(async () => {
    const current = await getMemberSession();
    if (!current) {
      setSession(null);
      setEntitled(false);
      return;
    }
    const response = await yweFetch('/iinb/access');
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.loggedIn) {
      await clearMemberSession();
      setSession(null);
      setEntitled(false);
      return;
    }
    setSession({ ...current, email: String(data.email || current.email) });
    setEntitled(Boolean(data.entitled));
  }, []);

  const handleAuthUrl = useCallback(async (url: string | null) => {
    if (!url) return;
    let code = '';
    try { code = new URL(url).searchParams.get('code') || ''; } catch { return; }
    if (!code) return;
    try {
      const next = await exchangeNativeCode(code);
      setSession(next);
      await refreshEntitlements();
    } catch (error) {
      console.warn('[auth] native exchange failed', error);
    }
  }, [refreshEntitlements]);

  useEffect(() => {
    let mounted = true;
    void getMemberSession().then(async (stored) => {
      if (!mounted) return;
      setSession(stored);
      await refreshEntitlements().catch(() => undefined);
      if (mounted) setReady(true);
    });
    void Linking.getInitialURL().then(handleAuthUrl);
    const linkSub = Linking.addEventListener('url', ({ url }) => { void handleAuthUrl(url); });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshEntitlements().catch(() => undefined);
    });
    return () => {
      mounted = false;
      linkSub.remove();
      appSub.remove();
    };
  }, [handleAuthUrl, refreshEntitlements]);

  const value = useMemo<AuthCtx>(() => ({
    ready,
    session,
    user: session ? { id: session.email, email: session.email } : null,
    entitled,
    refreshEntitlements,
    async requestSignInLink(email) {
      try {
        const response = await requestNativeSignInLink(email.trim());
        const data = await response.json().catch(() => ({}));
        return { error: response.ok && data.ok ? null : String(data.error || 'Could not send the sign-in link.') };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Network error.' };
      }
    },
    async signOut() {
      await clearMemberSession();
      setSession(null);
      setEntitled(false);
    },
  }), [ready, session, entitled, refreshEntitlements]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
