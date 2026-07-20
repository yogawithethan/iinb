import * as SecureStore from 'expo-secure-store';

const AUTH_ORIGIN = (process.env.EXPO_PUBLIC_YWE_AUTH_ORIGIN || 'https://auth.yogawithethan.com').replace(/\/+$/, '');
const SESSION_KEY = 'iinb:ywe-member-session';

export type StoredMemberSession = {
  token: string;
  email: string;
  expiresAt: number;
};

export async function getMemberSession(): Promise<StoredMemberSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as StoredMemberSession;
    if (!session.token || !session.email || session.expiresAt <= Date.now()) {
      await clearMemberSession();
      return null;
    }
    return session;
  } catch {
    await clearMemberSession();
    return null;
  }
}

export async function setMemberSession(session: StoredMemberSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function clearMemberSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
}

export async function yweFetch(path: string, init: RequestInit = {}) {
  const session = await getMemberSession();
  const headers = new Headers(init.headers);
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${AUTH_ORIGIN}${path}`, { ...init, headers });
}

export async function requestNativeSignInLink(email: string) {
  return fetch(`${AUTH_ORIGIN}/auth/member/request-native-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function exchangeNativeCode(code: string): Promise<StoredMemberSession> {
  const response = await fetch(`${AUTH_ORIGIN}/auth/member/native-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token || !data.email) {
    throw new Error(data.error || 'The sign-in link could not be exchanged.');
  }
  const session = {
    token: String(data.token),
    email: String(data.email),
    expiresAt: Number(data.expiresAt || Date.now() + 60 * 24 * 60 * 60 * 1000),
  };
  await setMemberSession(session);
  return session;
}
