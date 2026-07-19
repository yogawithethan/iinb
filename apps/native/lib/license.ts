import { getMemberSession, yweFetch } from './ywe';

export type RedeemOutcome =
  | { kind: 'ok' }
  | { kind: 'sign_in_required' }
  | { kind: 'error'; message: string };

export async function redeemLicense(code: string): Promise<RedeemOutcome> {
  if (!await getMemberSession()) return { kind: 'sign_in_required' };
  try {
    const response = await yweFetch('/iinb/redeem', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: code }),
    });
    if (response.status === 401) return { kind: 'sign_in_required' };
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) return { kind: 'ok' };
    return { kind: 'error', message: data.error || 'That license key could not be redeemed.' };
  } catch (error) {
    return { kind: 'error', message: error instanceof Error ? error.message : 'Network error.' };
  }
}

/** YWE access checks auto-claim historical keys assigned to the verified email. */
export async function claimPendingLicenses(): Promise<number> {
  try {
    await yweFetch('/iinb/access');
  } catch { /* optional refresh */ }
  return 0;
}
