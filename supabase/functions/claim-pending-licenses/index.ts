// Auto-claim any unredeemed license keys whose payer or recipient email
// matches the signed-in user. Called silently after every sign-in.
//
// Body: {}
// Response: { ok: true, claimed: number }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

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

async function resolveUser(req: Request): Promise<{ userId: string; email: string } | null> {
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
  return { userId: data.user.id, email: data.user.email ?? '' };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const user = await resolveUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: 'unauthorized' }),
      { status: 401, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }
  if (!user.email) {
    return new Response(
      JSON.stringify({ ok: true, claimed: 0 }),
      { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const { data, error } = await supabaseService.rpc('claim_pending_licenses', {
    p_user_id: user.userId,
    p_email: user.email,
  });

  if (error) {
    console.error('[claim-pending-licenses] rpc error', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      { status: 500, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, claimed: data ?? 0 }),
    { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
  );
});
