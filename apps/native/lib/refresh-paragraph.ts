// Client for the refresh-paragraph Supabase Edge Function. Returns a single
// rewritten paragraph (no streaming) tailored to the reader's profile.

import { supabase } from './supabase';
import type { RefreshProfile } from './SettingsContext';

const FN_URL = (() => {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://swtsqngrkkhggjacfhft.supabase.co';
  return `${base.replace(/\/+$/, '')}/functions/v1/refresh-paragraph`;
})();

export type RefreshOutcome =
  | { kind: 'ok'; rewrite: string }
  | { kind: 'sign_in_required' }
  | { kind: 'purchase_required' }
  | { kind: 'error'; message: string };

/**
 * Rewrite a single inline span (the text inside `{{...}}`) so it fits
 * naturally in the surrounding paragraph. The Edge Function receives the
 * full paragraph for context but is instructed to return only the
 * replacement phrase (no surrounding prose, no quotes).
 */
export async function refreshSpan(
  paragraph: string,
  span: string,
  profile: RefreshProfile,
  signal?: AbortSignal,
): Promise<RefreshOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { kind: 'sign_in_required' };

  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mode: 'span',
        paragraph,
        span,
        profile: {
          decade: profile.decade ?? undefined,
          humor: profile.humor ?? [],
          culture: profile.culture ?? [],
        },
      }),
      signal,
    });
  } catch (err) {
    return { kind: 'error', message: (err as Error)?.message ?? 'Network error' };
  }

  if (res.status === 401) return { kind: 'sign_in_required' };
  if (res.status === 402) return { kind: 'purchase_required' };

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { kind: 'error', message: text || `HTTP ${res.status}` };
  }

  const data = await res.json().catch(() => null);
  const rewrite = data?.rewrite;
  if (typeof rewrite !== 'string' || !rewrite) {
    return { kind: 'error', message: 'Empty response' };
  }
  return { kind: 'ok', rewrite };
}

export async function refreshParagraph(
  paragraph: string,
  profile: RefreshProfile,
  signal?: AbortSignal,
): Promise<RefreshOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { kind: 'sign_in_required' };

  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        paragraph,
        profile: {
          decade: profile.decade ?? undefined,
          humor: profile.humor ?? [],
          culture: profile.culture ?? [],
        },
      }),
      signal,
    });
  } catch (err) {
    return { kind: 'error', message: (err as Error)?.message ?? 'Network error' };
  }

  if (res.status === 401) return { kind: 'sign_in_required' };
  if (res.status === 402) return { kind: 'purchase_required' };

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { kind: 'error', message: text || `HTTP ${res.status}` };
  }

  const data = await res.json().catch(() => null);
  const rewrite = data?.rewrite;
  if (typeof rewrite !== 'string' || !rewrite) {
    return { kind: 'error', message: 'Empty response' };
  }
  return { kind: 'ok', rewrite };
}
