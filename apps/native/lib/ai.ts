import chapters from '@/content/chapters.json';
import { getMemberSession, yweFetch } from './ywe';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type AskOutcome =
  | { kind: 'ok' }
  | { kind: 'sign_in_required' }
  | { kind: 'purchase_required' }
  | { kind: 'error'; message: string };

export type AskHandlers = {
  onToken?: (text: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
};

export async function askTheBook(
  question: string,
  history: ChatTurn[],
  chapterId: string | undefined,
  handlers: AskHandlers,
  signal?: AbortSignal,
): Promise<AskOutcome> {
  if (!await getMemberSession()) return { kind: 'sign_in_required' };
  const chapter = chapters.find((item) => item.id === chapterId);
  try {
    const response = await yweFetch('/iinb/ask', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...history, { role: 'user', content: question }].slice(-12),
        chapterId: chapter?.id || chapterId,
        chapterTitle: chapter?.title || '',
        chapterExcerpt: chapter?.body || '',
      }),
      signal,
    });
    if (response.status === 401) return { kind: 'sign_in_required' };
    if (response.status === 403) return { kind: 'purchase_required' };
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.text) {
      const message = String(data.error || 'Ask the book is temporarily unavailable.');
      handlers.onError?.(message);
      return { kind: 'error', message };
    }
    handlers.onToken?.(String(data.text));
    handlers.onDone?.();
    return { kind: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error.';
    handlers.onError?.(message);
    return { kind: 'error', message };
  }
}
