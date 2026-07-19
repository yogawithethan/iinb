// Client for the ask-the-book Supabase Edge Function. Handles SSE streaming
// from the function and dispatches tokens to the caller as they arrive.

import { supabase } from './supabase';

const FN_URL = (() => {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://swtsqngrkkhggjacfhft.supabase.co';
  return `${base.replace(/\/+$/, '')}/functions/v1/ask-the-book`;
})();

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type AskOutcome =
  | { kind: 'ok'; usage?: Record<string, number> }
  | { kind: 'sign_in_required' }
  | { kind: 'purchase_required' }
  | { kind: 'error'; message: string };

export type AskHandlers = {
  onToken?: (text: string) => void;
  onDone?: (usage?: Record<string, number>) => void;
  onError?: (message: string) => void;
};

/**
 * Stream a question to the edge function. Resolves once the stream completes
 * (or aborts via the AbortSignal).
 */
export async function askTheBook(
  question: string,
  history: ChatTurn[],
  handlers: AskHandlers,
  signal?: AbortSignal,
): Promise<AskOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { kind: 'sign_in_required' };

  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ question, history }),
      signal,
    });
  } catch (err) {
    const message = (err as Error)?.message ?? 'network_error';
    handlers.onError?.(message);
    return { kind: 'error', message };
  }

  if (res.status === 401) return { kind: 'sign_in_required' };
  if (res.status === 402) return { kind: 'purchase_required' };
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    const message = `HTTP ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`;
    handlers.onError?.(message);
    return { kind: 'error', message };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage: Record<string, number> | undefined;
  let errored: string | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const lines = rawEvent.split('\n');
        let eventType = '';
        let dataLine = '';
        for (const ln of lines) {
          if (ln.startsWith('event: ')) eventType = ln.slice(7).trim();
          else if (ln.startsWith('data: ')) dataLine += ln.slice(6);
        }
        if (!dataLine) continue;
        let json: any;
        try {
          json = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (eventType === 'token' && typeof json?.text === 'string') {
          handlers.onToken?.(json.text);
        } else if (eventType === 'done') {
          usage = json?.usage;
        } else if (eventType === 'error') {
          errored = json?.message ?? 'stream_error';
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      return { kind: 'error', message: 'aborted' };
    }
    const message = (err as Error)?.message ?? 'stream_error';
    handlers.onError?.(message);
    return { kind: 'error', message };
  }

  if (errored) {
    handlers.onError?.(errored);
    return { kind: 'error', message: errored };
  }

  handlers.onDone?.(usage);
  return { kind: 'ok', usage };
}
