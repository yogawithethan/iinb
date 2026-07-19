// Redeem a license code for the authenticated user.
//
// Body: { code: string }
// Response: { ok: true } | { ok: false, error: string }
//
// On success, marks the code as redeemed and writes a product_entitlements
// row. The actual atomic work happens inside the `redeem_license_key` SQL
// function so concurrent calls can't race.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { normalizeLicenseCode } from '../_shared/code.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

// Map the SQL function's exception messages to friendly client errors.
function errorMessageFor(code: string | undefined): string {
  switch (code) {
    case 'CODE_NOT_FOUND':
      return 'That code wasn\'t recognized. Double-check the letters and try again.';
    case 'ALREADY_REDEEMED_BY_YOU':
      return 'You\'ve already redeemed this code — the book is yours.';
    case 'ALREADY_REDEEMED':
      return 'That code has already been redeemed by another account.';
    case 'CODE_REVOKED':
      return 'That code is no longer valid. Reach out and we\'ll sort it out.';
    default:
      return 'Something went wrong redeeming that code. Try again in a moment.';
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const user = await resolveUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Sign in first.' }),
      { status: 401, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid request.' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const code = normalizeLicenseCode(body.code ?? '');
  if (!code || !/^IINB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'That doesn\'t look like a valid code.' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const { error } = await supabaseService.rpc('redeem_license_key', {
    p_code: code,
    p_user_id: user.userId,
  });

  if (error) {
    // Postgres raises with the exception message as the message field; we use
    // it as a stable error code (CODE_NOT_FOUND, ALREADY_REDEEMED, etc.).
    const message = errorMessageFor(error.message);
    const status = error.message === 'CODE_NOT_FOUND' ? 404 : 409;
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
  );
});
