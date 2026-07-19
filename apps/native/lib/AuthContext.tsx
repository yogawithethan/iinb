import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './supabase';

const IINB_PRODUCT_SLUG = 'ignorance-is-not-bliss' as const;

type AuthCtx = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** True iff the signed-in user has an active iinb entitlement in product_entitlements. */
  entitled: boolean;
  /** Re-fetch the entitlement (e.g. after a purchase). */
  refreshEntitlements: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; alreadyRegistered: boolean; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);

  const fetchEntitlement = useCallback(async (userId: string | null) => {
    if (!userId) {
      setEntitled(false);
      return;
    }
    const { data, error } = await supabase
      .from('product_entitlements')
      .select('status')
      .eq('user_id', userId)
      .eq('product_slug', IINB_PRODUCT_SLUG)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      console.warn('[auth] entitlement check failed', error.message);
      // Don't change entitled state on transient errors — keep last good value.
      return;
    }
    setEntitled(Boolean(data));
  }, []);

  const refreshEntitlements = useCallback(async () => {
    await fetchEntitlement(session?.user?.id ?? null);
  }, [fetchEntitlement, session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next ?? null);
      // Auto-claim license keys whose payer/recipient email matches this
      // user. Silent; runs only on fresh sign-ins (not token refresh).
      if (event === 'SIGNED_IN' && next) {
        // Lazy require avoids a circular dep at module load.
        import('./license').then(({ claimPendingLicenses }) => {
          claimPendingLicenses().catch(() => undefined);
        });
      }
    });

    // Refresh tokens when app comes back to the foreground.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    supabase.auth.startAutoRefresh();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  // Re-check entitlement whenever the user identity changes.
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (lastCheckedUserId.current === userId) return;
    lastCheckedUserId.current = userId;
    fetchEntitlement(userId);
  }, [session?.user?.id, fetchEntitlement]);

  const value = useMemo<AuthCtx>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      entitled,
      refreshEntitlements,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          // Supabase returns "User already registered" for existing emails — surface
          // that as a flag so the UI can flip into sign-in mode rather than show a
          // generic error that reads like the app is broken.
          const msg = (error.message ?? '').toLowerCase();
          const alreadyRegistered =
            msg.includes('already registered') ||
            msg.includes('user already') ||
            msg.includes('already exists');
          return { error: error.message, alreadyRegistered, needsConfirmation: false };
        }
        // Some Supabase configs return success + no session for existing
        // unconfirmed emails ("user-already-exists" leak prevention). When
        // identities is empty, treat as already-registered.
        const identities = (data.user as unknown as { identities?: unknown[] } | null)
          ?.identities;
        const looksAlreadyRegistered = Array.isArray(identities) && identities.length === 0;
        if (looksAlreadyRegistered) {
          return {
            error: 'An Islands account already exists for this email.',
            alreadyRegistered: true,
            needsConfirmation: false,
          };
        }
        const needsConfirmation = !data.session;
        return { error: null, alreadyRegistered: false, needsConfirmation };
      },
      async signOut() {
        await supabase.auth.signOut();
        setEntitled(false);
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error: error?.message ?? null };
      },
    }),
    [ready, session, entitled, refreshEntitlements]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
