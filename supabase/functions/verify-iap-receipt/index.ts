// Verify an iOS In-App Purchase receipt and grant the corresponding right.
//
// Auth: Bearer JWT (the buyer's Supabase session).
// Body: { platform: 'ios', productId: string, receipt: string, transactionId?: string }
// Response (full-book purchase): { entitled: true }
// Response (gift purchase):      { giftCode: 'IINB-XXXX-XXXX-XXXX' }
//
// Verification: posts to Apple's /verifyReceipt with APPLE_SHARED_SECRET. If
// production rejects the receipt with status 21007 (sandbox receipt) it
// retries against the sandbox endpoint — Apple's recommended pattern so the
// same code works for sandbox tester accounts and live App Store users.
//
// Required Supabase secrets (set with `supabase secrets set`):
//   APPLE_SHARED_SECRET    — the IAP "App-Specific Shared Secret" from
//                            App Store Connect → My Apps → App Information.
//   APPLE_BUNDLE_ID        — your iOS bundle id, e.g. com.yogawithethan.iinb.
//   IAP_PRODUCT_FULL_BOOK  — defaults to 'iinb.fullbook'.
//   IAP_PRODUCT_GIFT_CODE  — defaults to 'iinb.giftcode'.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { generateLicenseCode } from '../_shared/code.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const APPLE_SHARED_SECRET = Deno.env.get('APPLE_SHARED_SECRET') ?? '';
const APPLE_BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? '';
const PRODUCT_FULL_BOOK = Deno.env.get('IAP_PRODUCT_FULL_BOOK') ?? 'iinb.fullbook';
const PRODUCT_GIFT_CODE = Deno.env.get('IAP_PRODUCT_GIFT_CODE') ?? 'iinb.giftcode';
const PRODUCT_SLUG = 'ignorance-is-not-bliss';

const APPLE_PROD_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

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

async function resolveUser(req: Request): Promise<{ userId: string; email: string | null } | null> {
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
  return { userId: data.user.id, email: data.user.email ?? null };
}

type AppleReceipt = {
  status: number;
  environment?: string;
  receipt?: { bundle_id?: string; in_app?: AppleInAppEntry[] };
  latest_receipt_info?: AppleInAppEntry[];
};
type AppleInAppEntry = {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  purchase_date_ms?: string;
  cancellation_date_ms?: string;
};

async function verifyWithApple(receipt: string): Promise<AppleReceipt> {
  const body = JSON.stringify({
    'receipt-data': receipt,
    password: APPLE_SHARED_SECRET,
    'exclude-old-transactions': true,
  });
  const prod = await fetch(APPLE_PROD_URL, { method: 'POST', body });
  const prodJson = (await prod.json()) as AppleReceipt;
  // 21007 = "this receipt is from the test environment, but it was sent to
  // the production environment. Send it to the test environment instead."
  if (prodJson.status === 21007) {
    const sb = await fetch(APPLE_SANDBOX_URL, { method: 'POST', body });
    return (await sb.json()) as AppleReceipt;
  }
  return prodJson;
}

function findEntry(receipt: AppleReceipt, productId: string, transactionId?: string | null): AppleInAppEntry | undefined {
  const candidates = [
    ...(receipt.latest_receipt_info ?? []),
    ...(receipt.receipt?.in_app ?? []),
  ];
  const matches = candidates.filter((e) => e.product_id === productId && !e.cancellation_date_ms);
  if (transactionId) {
    const exact = matches.find(
      (e) => e.transaction_id === transactionId || e.original_transaction_id === transactionId,
    );
    if (exact) return exact;
  }
  // Most recent purchase wins.
  return matches.sort(
    (a, b) => Number(b.purchase_date_ms ?? 0) - Number(a.purchase_date_ms ?? 0),
  )[0];
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  if (!APPLE_SHARED_SECRET || !APPLE_BUNDLE_ID) {
    console.error('[verify-iap-receipt] missing APPLE_SHARED_SECRET or APPLE_BUNDLE_ID');
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  const user = await resolveUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'sign_in_required' }),
      { status: 401, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  let body: { platform?: string; productId?: string; receipt?: string; transactionId?: string | null };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }

  if (body.platform !== 'ios') {
    return new Response(JSON.stringify({ error: 'unsupported_platform' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }
  const productId = (body.productId ?? '').trim();
  const receipt = (body.receipt ?? '').trim();
  if (!productId || !receipt) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }
  if (productId !== PRODUCT_FULL_BOOK && productId !== PRODUCT_GIFT_CODE) {
    return new Response(JSON.stringify({ error: 'unknown_product' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }

  let parsed: AppleReceipt;
  try {
    parsed = await verifyWithApple(receipt);
  } catch (err) {
    console.error('[verify-iap-receipt] apple fetch failed', err);
    return new Response(JSON.stringify({ error: 'upstream_error' }), { status: 502, headers: { ...cors, 'content-type': 'application/json' } });
  }

  if (parsed.status !== 0) {
    console.warn('[verify-iap-receipt] apple rejected', parsed.status);
    return new Response(JSON.stringify({ error: 'invalid_receipt', status: parsed.status }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }
  if (parsed.receipt?.bundle_id && parsed.receipt.bundle_id !== APPLE_BUNDLE_ID) {
    console.warn('[verify-iap-receipt] bundle id mismatch', parsed.receipt.bundle_id);
    return new Response(JSON.stringify({ error: 'bundle_mismatch' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }

  const entry = findEntry(parsed, productId, body.transactionId);
  if (!entry) {
    return new Response(JSON.stringify({ error: 'product_not_in_receipt' }), { status: 400, headers: { ...cors, 'content-type': 'application/json' } });
  }
  const externalId = entry.transaction_id ?? entry.original_transaction_id ?? null;

  // ---------- Full book (non-consumable) — grant entitlement ----------
  if (productId === PRODUCT_FULL_BOOK) {
    const { error } = await supabaseService.from('product_entitlements').upsert(
      {
        user_id: user.userId,
        product_slug: PRODUCT_SLUG,
        source: 'app_store',
        source_reference: externalId,
        status: 'active',
        starts_at: new Date().toISOString(),
        ends_at: null,
      },
      { onConflict: 'user_id,product_slug' },
    );
    if (error) {
      console.error('[verify-iap-receipt] entitlement upsert failed', error);
      return new Response(JSON.stringify({ error: 'db_error' }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
    }
    return new Response(
      JSON.stringify({ entitled: true }),
      { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  // ---------- Gift (consumable) — issue a license code, idempotent on transaction ----------
  if (productId === PRODUCT_GIFT_CODE) {
    if (externalId) {
      const { data: existing } = await supabaseService
        .from('license_keys')
        .select('code')
        .eq('channel', 'gift')
        .eq('external_id', externalId)
        .maybeSingle();
      if (existing?.code) {
        return new Response(
          JSON.stringify({ giftCode: existing.code }),
          { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
        );
      }
    }
    let code = generateLicenseCode();
    // Retry-on-collision is paranoid given 60-bit entropy, but the unique
    // index will reject duplicates so handle the (vanishingly rare) case.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabaseService.from('license_keys').insert({
        code,
        product_slug: PRODUCT_SLUG,
        status: 'unredeemed',
        channel: 'gift',
        payer_email: user.email,
        external_id: externalId,
        metadata: { source: 'app_store', buyer_user_id: user.userId },
      });
      if (!error) break;
      if (error.code === '23505' && attempt < 2) {
        code = generateLicenseCode();
        continue;
      }
      console.error('[verify-iap-receipt] license_keys insert failed', error);
      return new Response(JSON.stringify({ error: 'db_error' }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
    }
    return new Response(
      JSON.stringify({ giftCode: code }),
      { status: 200, headers: { ...cors, 'content-type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ error: 'unhandled' }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
});
