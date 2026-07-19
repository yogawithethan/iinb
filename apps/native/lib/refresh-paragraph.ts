// Reader-personalization client. YWE identity and entitlement checks happen
// in the canonical Worker; the app only supplies the selected prose and the
// reader's local personalization profile.

import type { RefreshProfile } from './SettingsContext';
import { getMemberSession, yweFetch } from './ywe';

export type RefreshOutcome =
  | { kind: 'ok'; rewrite: string }
  | { kind: 'sign_in_required' }
  | { kind: 'purchase_required' }
  | { kind: 'error'; message: string };

async function requestRefresh(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<RefreshOutcome> {
  if (!(await getMemberSession())) return { kind: 'sign_in_required' };
  let response: Response;
  try {
    response = await yweFetch('/iinb/refresh', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    return { kind: 'error', message: (error as Error)?.message || 'Network error' };
  }
  if (response.status === 401) return { kind: 'sign_in_required' };
  if (response.status === 403) return { kind: 'purchase_required' };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { kind: 'error', message: String(data.error || `HTTP ${response.status}`) };
  }
  const rewrite = typeof data.rewrite === 'string' ? data.rewrite.trim() : '';
  return rewrite ? { kind: 'ok', rewrite } : { kind: 'error', message: 'Empty response' };
}

function cleanProfile(profile: RefreshProfile) {
  return {
    decade: profile.decade || undefined,
    humor: profile.humor || [],
    culture: profile.culture || [],
  };
}

export function refreshSpan(
  paragraph: string,
  span: string,
  profile: RefreshProfile,
  signal?: AbortSignal,
): Promise<RefreshOutcome> {
  return requestRefresh({
    mode: 'span',
    paragraph,
    span,
    profile: cleanProfile(profile),
  }, signal);
}

export function refreshParagraph(
  paragraph: string,
  profile: RefreshProfile,
  signal?: AbortSignal,
): Promise<RefreshOutcome> {
  return requestRefresh({
    mode: 'paragraph',
    paragraph,
    profile: cleanProfile(profile),
  }, signal);
}
