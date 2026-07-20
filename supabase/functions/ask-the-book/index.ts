// Ask the book — streams a Claude response grounded in the full book text.
//
// Auth model:
//   1. Verifies the caller's Supabase JWT (Authorization: Bearer <jwt>).
//   2. Looks up product_entitlements for the user — only purchasers can ask.
//      Signed-in non-buyers get a clean 402 with a hint; the client routes them
//      to the paywall. Guests get a 401; the client routes them to sign-up.
//
// Body:
//   { question: string, history?: { role: 'user'|'assistant'; content: string }[] }
//
// Response:
//   text/event-stream of these event types:
//     event: token         data: { text: string }
//     event: done          data: { usage: {...} }
//     event: error         data: { message: string }
//
// Required env vars (set via `supabase secrets set ...`):
//   ANTHROPIC_API_KEY        — sk-ant-…
//   SUPABASE_URL             — auto-set
//   SUPABASE_SERVICE_ROLE_KEY — auto-set
//   SUPABASE_ANON_KEY        — auto-set; used to verify caller JWT

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const PRODUCT_SLUG = 'ignorance-is-not-bliss' as const;
const MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 1024;
const MAX_HISTORY_TURNS = 8; // last 8 user/assistant pairs

if (!ANTHROPIC_API_KEY) console.error('[ask-the-book] ANTHROPIC_API_KEY missing');

// Loaded once per cold start; cached on warm container instances.
const BOOK_TEXT = await Deno.readTextFile(new URL('./book.txt', import.meta.url));

const SYSTEM_PROMPT_PREFIX = `You are the in-app companion for "Ignorance is not Bliss" by Ethan Hill — a contemplative book on suffering, purification, and the future of the species.

When a reader asks a question, answer **only** from what the book actually says. If the book doesn't address the question, say so plainly rather than improvising.

Style:
- Match the book's voice — measured, plainspoken, occasionally wry. Avoid corporate or motivational tones.
- Quote sparingly. Prefer paraphrase that points the reader at where to look.
- When you cite, name the chapter (e.g. "in Chapter 2, the author argues…").
- Keep answers concise — three short paragraphs at most unless the question genuinely needs more.
- Never invent details, dates, or quotes. If you're paraphrasing, don't put it in quote marks.

The full book follows.`;

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function resolveUser(req: Request): Promise<{ userId: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  // Verify the JWT by asking Supabase auth who owns it.
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { userId: data.user.id };
}

async function userIsEntitled(userId: string): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('product_entitlements')
    .select('user_id')
    .eq('user_id', userId)
    .eq('product_slug', PRODUCT_SLUG)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[ask-the-book] entitlement query error', error);
    return false;
  }
  return Boolean(data);
}

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type AskBody = {
  question?: string;
  history?: ChatTurn[];
};

function buildAnthropicRequest(question: string, history: ChatTurn[]) {
  // Truncate history to the last MAX_HISTORY_TURNS messages.
  const trimmed = history.slice(-MAX_HISTORY_TURNS).filter(
    (t) => typeof t?.content === 'string' && (t.role === 'user' || t.role === 'assistant'),
  );
  const messages = [...trimmed, { role: 'user' as const, content: question }];
  return {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
    system: [
      // Cache the static prefix + book together. The breakpoint sits AFTER
      // the book, so every subsequent question reuses the cache.
      {
        type: 'text',
        text: `${SYSTEM_PROMPT_PREFIX}\n\n${BOOK_TEXT}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  // 1. Auth
  const user = await resolveUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'sign_in_required' }),
      { status: 401, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  // 2. Entitlement
  const entitled = await userIsEntitled(user.userId);
  if (!entitled) {
    return new Response(
      JSON.stringify({ error: 'purchase_required' }),
      { status: 402, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  // 3. Body
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const question = (body.question ?? '').trim();
  if (!question) {
    return new Response(
      JSON.stringify({ error: 'missing_question' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const anthropicReq = buildAnthropicRequest(question, body.history ?? []);

  // 4. Call Anthropic with streaming
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': ANTHROPIC_API_KEY,
    },
    body: JSON.stringify(anthropicReq),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    console.error('[ask-the-book] anthropic error', upstream.status, errText);
    return new Response(
      JSON.stringify({ error: 'upstream_error', status: upstream.status }),
      { status: 502, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  // 5. Transform Anthropic's SSE → our SSE.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      let usage: Record<string, number> | undefined;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Split on SSE event boundary (\n\n).
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

            if (eventType === 'content_block_delta' && json?.delta?.type === 'text_delta') {
              const text = json.delta.text ?? '';
              if (text) {
                controller.enqueue(encoder.encode(sseEvent('token', { text })));
              }
            } else if (eventType === 'message_delta' && json?.usage) {
              usage = { ...(usage ?? {}), ...json.usage };
            } else if (eventType === 'message_start' && json?.message?.usage) {
              usage = { ...(usage ?? {}), ...json.message.usage };
            } else if (eventType === 'error') {
              controller.enqueue(
                encoder.encode(sseEvent('error', { message: json?.error?.message ?? 'upstream_error' })),
              );
            }
          }
        }

        controller.enqueue(encoder.encode(sseEvent('done', { usage: usage ?? {} })));
      } catch (err) {
        console.error('[ask-the-book] stream error', err);
        controller.enqueue(
          encoder.encode(sseEvent('error', { message: (err as Error)?.message ?? 'stream_error' })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...cors,
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
});
