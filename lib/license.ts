// Client for the license-key Edge Functions.
//   redeem-license          — user-initiated, takes a code
//   claim-pending-licenses  — silent post-signin, claims by email match

import { supabase } from './supabase';

const BASE = (() => {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://swtsqngrkkhggjacfhft.supabase.co';
  return base.replace(/\/+$/, '');
})();

const REDEEM_URL = `${BASE}/functions/v1/redeem-license`;
const CLAIM_URL = `${BASE}/functions/v1/claim-pending-licenses`;

export type RedeemOutcome =
  | { kind: 'ok' }
  | { kind: 'sign_in_required' }
  | { kind: 'error'; message: string };

export async function redeemLicense(code: string): Promise<RedeemOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { kind: 'sign_in_required' };

  let res: Response;
  try {
    res = await fetch(REDEEM_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
  } catch (err) {
    return { kind: 'error', message: (err as Error).message ?? 'Network error' };
  }

  if (res.status === 401) return { kind: 'sign_in_required' };

  const data = await res.json().catch(() => ({}));
  if (data?.ok) return { kind: 'ok' };
  return { kind: 'error', message: data?.error ?? 'Something went wrong.' };
}

/**
 * Silently claim any pending license keys for the signed-in user. Returns
 * the count claimed (0 if there were none). Safe to call after every sign-in.
 */
export async function claimPendingLicenses(): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return 0;

  try {
    const res = await fetch(CLAIM_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: '{}',
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data?.claimed === 'number' ? data.claimed : 0;
  } catch {
    return 0;
  }
}
