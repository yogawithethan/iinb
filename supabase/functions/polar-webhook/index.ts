// Polar → Supabase webhook bridge.
//
// On `order.paid`:
//   1. Generate a license key.
//   2. Determine if it's a gift (metadata.is_gift === 'true' AND
//      metadata.recipient_email present).
//   3. Insert license_keys row.
//   4. Self-purchase by signed-in buyer (metadata.user_id present, not gift):
//      auto-redeem now → entitlement created → email buyer with confirmation
//      + the code (so they can restore on other devices later).
//   5. Gift: email recipient with code + redeem instructions.
//   6. Guest self-purchase: email buyer with code; auto-claim will fire when
//      they sign up with the same email.
//
// On `order.refunded`:
//   - Mark the license key 'revoked' AND the entitlement 'refunded' (if redeemed).
//
// Required env: POLAR_WEBHOOK_SECRET, RESEND_API_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (last two auto-set).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { generateLicenseCode } from '../_shared/code.ts';
import { sendEmail } from '../_shared/email.ts';
import { purchaseConfirmationEmail, giftEmail } from '../_shared/templates.ts';

const WEBHOOK_SECRET = Deno.env.get('POLAR_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const PRODUCT_SLUG = 'ignorance-is-not-bliss' as const;
const PRODUCT_TITLE = 'Ignorance is not Bliss';

if (!WEBHOOK_SECRET) console.error('[polar-webhook] POLAR_WEBHOOK_SECRET missing');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.text();

  let event: PolarEvent;
  try {
    const normalizedSecret = WEBHOOK_SECRET.replace(/^polar_whs_/, '');
    const wh = new Webhook(normalizedSecret);
    event = wh.verify(body, {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
    }) as PolarEvent;
  } catch (err) {
    console.error('[polar-webhook] signature verification failed', err);
    return new Response('Invalid signature', { status: 401 });
  }

  console.log(`[polar-webhook] received event type=${event.type}`);

  try {
    if (event.type === 'order.paid') await handleOrderPaid(event.data);
    else if (event.type === 'order.refunded') await handleOrderRefunded(event.data);
    else console.log(`[polar-webhook] ignoring ${event.type}`);
  } catch (err) {
    console.error(`[polar-webhook] handler error for ${event.type}`, err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});

type PolarEvent =
  | { type: 'order.paid'; data: PolarOrder }
  | { type: 'order.refunded'; data: PolarOrder }
  | { type: string; data: unknown };

type PolarOrder = {
  id: string;
  customer?: { email?: string; name?: string; id?: string };
  customer_email?: string;
  metadata?: Record<string, string>;
  product?: { id?: string; name?: string };
  status?: string;
};

async function handleOrderPaid(order: PolarOrder) {
  // Idempotency: if we already issued a key for this order, bail.
  const { data: existing } = await supabase
    .from('license_keys')
    .select('code')
    .eq('channel', isGift(order) ? 'gift' : 'polar')
    .eq('external_id', order.id)
    .maybeSingle();
  if (existing) {
    console.log(`[polar-webhook] order ${order.id} already issued (${existing.code}); skipping`);
    return;
  }

  const buyerEmail = (order.customer?.email ?? order.customer_email ?? '').trim();
  const isGiftOrder = isGift(order);
  const recipientEmail = (order.metadata?.recipient_email ?? '').trim();
  const giftNote = order.metadata?.gift_note ?? '';
  const buyerUserId = order.metadata?.user_id ?? null;

  const code = generateLicenseCode();

  // 1. Insert key.
  const { error: insertErr } = await supabase.from('license_keys').insert({
    code,
    product_slug: PRODUCT_SLUG,
    status: 'unredeemed',
    channel: isGiftOrder ? 'gift' : 'polar',
    payer_email: buyerEmail || null,
    recipient_email: isGiftOrder ? recipientEmail || null : null,
    external_id: order.id,
    metadata: { gift_note: giftNote, buyer_name: order.customer?.name ?? null },
  });
  if (insertErr) {
    console.error('[polar-webhook] insert license_keys failed', insertErr);
    throw insertErr;
  }

  // 2. Self-purchase by signed-in buyer → auto-redeem now.
  if (!isGiftOrder && buyerUserId) {
    const { error: redeemErr } = await supabase.rpc('redeem_license_key', {
      p_code: code,
      p_user_id: buyerUserId,
    });
    if (redeemErr) {
      console.error('[polar-webhook] auto-redeem failed', redeemErr);
      // Non-fatal: the key still exists; user can redeem manually.
    }
  }

  // 3. Email.
  if (isGiftOrder && recipientEmail) {
    const tpl = giftEmail({
      code,
      productTitle: PRODUCT_TITLE,
      fromName: order.customer?.name ?? undefined,
      note: giftNote || undefined,
    });
    const result = await sendEmail({ to: recipientEmail, ...tpl });
    if (!result.ok) console.error('[polar-webhook] gift email failed', result.error);
  } else if (buyerEmail) {
    const tpl = purchaseConfirmationEmail({ code, productTitle: PRODUCT_TITLE });
    const result = await sendEmail({ to: buyerEmail, ...tpl });
    if (!result.ok) console.error('[polar-webhook] confirmation email failed', result.error);
  }

  console.log(`[polar-webhook] issued ${code} for order ${order.id} (gift=${isGiftOrder})`);
}

async function handleOrderRefunded(order: PolarOrder) {
  // Revoke the license key.
  const { data: key } = await supabase
    .from('license_keys')
    .select('code, redeemed_by')
    .eq('external_id', order.id)
    .maybeSingle();

  if (key) {
    await supabase
      .from('license_keys')
      .update({ status: 'revoked' })
      .eq('code', key.code);

    // Mark any entitlement created from this code refunded too.
    if (key.redeemed_by) {
      await supabase
        .from('product_entitlements')
        .update({ status: 'refunded' })
        .eq('source_reference', key.code)
        .eq('source', 'license');
    }
  }

  // Belt-and-suspenders: also revoke any direct polar-source entitlement.
  await supabase
    .from('product_entitlements')
    .update({ status: 'refunded' })
    .eq('source_reference', order.id)
    .eq('source', 'polar');

  console.log(`[polar-webhook] refund processed for order ${order.id}`);
}

function isGift(order: PolarOrder): boolean {
  return order.metadata?.is_gift === 'true' && !!order.metadata?.recipient_email;
}
