// Refresh a single paragraph (or a single inline span within a paragraph) of
// the book in the reader's voice.
//
// Auth: same as ask-the-book — Bearer JWT, must own the entitlement.
// Body (paragraph mode — default):
//   { paragraph: string, profile: {...} }
// Body (span mode — rewrites only the marked example/phrase, paragraph is
//   provided as context for tone and grammatical fit):
//   { mode: 'span', paragraph: string, span: string, profile: {...} }
// Response (both): { rewrite: string }   (no streaming — answer is short)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const PRODUCT_SLUG = 'ignorance-is-not-bliss' as const;
const MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 600;

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

async function resolveUser(req: Request): Promise<{ userId: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
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
    console.error('[refresh-paragraph] entitlement query error', error);
    return false;
  }
  return Boolean(data);
}

type Profile = { decade?: string; humor?: string[]; culture?: string[] };

function buildSystemPrompt(profile: Profile): string {
  const parts: string[] = [
    `You rewrite a single paragraph from the book "Ignorance is not Bliss" by Ethan Hill into the reader's voice and cultural world, while preserving the EXACT meaning, argument, and tone of the original.`,
    ``,
    `Constraints:`,
    `- Same length, same number of sentences (±1).`,
    `- Same argument and same emotional register. If the original is somber, stay somber. If wry, stay wry.`,
    `- Replace examples and metaphors with ones the reader will recognize from their decade and cultural worlds. Never invent facts about the book or its claims.`,
    `- Do NOT add a preamble, framing, quotes, attribution, or commentary. Output ONLY the rewritten paragraph as plain prose.`,
    `- Match Ethan's voice — measured, plainspoken, occasionally wry. No corporate or motivational tones.`,
  ];
  appendProfile(parts, profile);
  return parts.join('\n');
}

function buildSpanSystemPrompt(profile: Profile): string {
  const parts: string[] = [
    `You rewrite a SHORT inline span (an example, metaphor, or phrase) from a paragraph in "Ignorance is not Bliss" by Ethan Hill, so it lands more naturally for this specific reader.`,
    ``,
    `You will be given the full paragraph for context and the exact span to replace. The span's role in the paragraph (an example, a metaphor, a parenthetical, a list item, etc.) must be preserved.`,
    ``,
    `Constraints:`,
    `- Output ONLY the replacement phrase. No quotes, no surrounding prose, no leading/trailing punctuation that wasn't in the original.`,
    `- Approximately the same length as the original (±30%).`,
    `- The replacement must read naturally when substituted in place of the span. Mind grammar, tense, agreement, and capitalization. If the original begins mid-sentence, the replacement should too.`,
    `- Preserve the same argumentative function. If the span is an example illustrating a point, the replacement must illustrate the same point. Do NOT invent factual claims about the book.`,
    `- Match Ethan's voice — measured, plainspoken, occasionally wry. No corporate or motivational tones.`,
    `- If the original span includes a proper noun the reader is unlikely to recognize, swap it for a recognizable analogue from their cultural world.`,
  ];
  appendProfile(parts, profile);
  return parts.join('\n');
}

function appendProfile(parts: string[], profile: Profile): void {
  const flavor: string[] = [];
  if (profile.decade) flavor.push(`Reader's formative decade: ${profile.decade}.`);
  if (profile.humor && profile.humor.length > 0)
    flavor.push(`Humor preference: ${profile.humor.join(', ')}.`);
  if (profile.culture && profile.culture.length > 0)
    flavor.push(`Cultural worlds the reader knows: ${profile.culture.join(', ')}.`);
  if (flavor.length > 0) {
    parts.push('', 'Reader profile:', ...flavor.map((f) => `- ${f}`));
  }
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

  const user = await resolveUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'sign_in_required' }),
      { status: 401, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const entitled = await userIsEntitled(user.userId);
  if (!entitled) {
    return new Response(
      JSON.stringify({ error: 'purchase_required' }),
      { status: 402, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  let body: { mode?: 'span' | 'paragraph'; paragraph?: string; span?: string; profile?: Profile };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_body' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const paragraph = (body.paragraph ?? '').trim();
  if (!paragraph || paragraph.length < 20 || paragraph.length > 4000) {
    return new Response(
      JSON.stringify({ error: 'invalid_paragraph' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }
  const profile: Profile = body.profile ?? {};
  const isSpanMode = body.mode === 'span';
  const span = (body.span ?? '').trim();
  if (isSpanMode) {
    if (!span || span.length < 2 || span.length > 600) {
      return new Response(
        JSON.stringify({ error: 'invalid_span' }),
        { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
      );
    }
    if (!paragraph.includes(span)) {
      return new Response(
        JSON.stringify({ error: 'span_not_in_paragraph' }),
        { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
      );
    }
  }

  const anthropicReq = isSpanMode
    ? {
        model: MODEL,
        max_tokens: 240,
        system: buildSpanSystemPrompt(profile),
        messages: [
          {
            role: 'user' as const,
            content:
              `Paragraph (for context only — do NOT rewrite the whole thing):\n${paragraph}\n\n` +
              `Span to rewrite (return only the replacement phrase):\n${span}`,
          },
        ],
      }
    : {
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: buildSystemPrompt(profile),
        messages: [
          { role: 'user' as const, content: `Rewrite this paragraph:\n\n${paragraph}` },
        ],
      };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(anthropicReq),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[refresh-paragraph] anthropic error', res.status, text);
    return new Response(
      JSON.stringify({ error: 'upstream_error' }),
      { status: 502, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const data = await res.json();
  let rewrite = (data?.content?.[0]?.text ?? '').trim();
  if (isSpanMode) {
    // Defensive: strip wrapping quotes the model sometimes adds despite being
    // told not to, and any trailing terminal punctuation that wasn't on the
    // original span.
    rewrite = rewrite.replace(/^["“'']+|["“'']+$/g, '').trim();
    const origEndsWithSentence = /[.!?…]$/.test(span);
    if (!origEndsWithSentence) rewrite = rewrite.replace(/[.!?…]+$/g, '').trim();
  }
  if (!rewrite) {
    return new Response(
      JSON.stringify({ error: 'empty_response' }),
      { status: 502, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ rewrite }),
    { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
  );
});
