// iOS In-App Purchase wrapper for the book and gift codes.
//
// Apple's review policy requires digital-goods purchases inside the app to use
// StoreKit IAP, not external web checkouts. This module is iOS-only — Android
// and web continue to use Polar (see PaywallCard.tsx / ProfileSettings.tsx).
//
// Two products are configured in App Store Connect:
//   - PRODUCT_FULL_BOOK   (non-consumable) — "Ignorance Is Not Bliss"
//   - PRODUCT_GIFT_CODE   (consumable)     — "Gift a Copy" (issues a license code)
//
// Receipt verification + entitlement/code issuance happens server-side in the
// `verify-iap-receipt` Edge Function.

import { Platform } from 'react-native';
import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
} from 'expo-iap';

import { supabase } from './supabase';

export const PRODUCT_FULL_BOOK = 'iinb.fullbook';
export const PRODUCT_GIFT_CODE = 'iinb.giftcode';
export const ALL_PRODUCT_IDS = [PRODUCT_FULL_BOOK, PRODUCT_GIFT_CODE];

const VERIFY_FN_URL = (() => {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://swtsqngrkkhggjacfhft.supabase.co';
  return `${base.replace(/\/+$/, '')}/functions/v1/verify-iap-receipt`;
})();

let connectionReady = false;

export function isIapAvailable(): boolean {
  return Platform.OS === 'ios';
}

async function ensureConnection(): Promise<void> {
  if (connectionReady) return;
  await initConnection();
  connectionReady = true;
}

export type IapProduct = {
  id: string;
  title: string;
  description: string;
  /** Localized display price, e.g. "$22.00". */
  displayPrice: string;
};

export async function getProducts(): Promise<IapProduct[]> {
  if (!isIapAvailable()) return [];
  await ensureConnection();
  const products = await fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' });
  return (products ?? []).map((p: any) => ({
    id: p.id ?? p.productId,
    title: p.title ?? '',
    description: p.description ?? '',
    displayPrice: p.displayPrice ?? p.localizedPrice ?? p.price ?? '',
  }));
}

export type VerifyOutcome =
  | { kind: 'ok'; entitled?: boolean; giftCode?: string }
  | { kind: 'sign_in_required' }
  | { kind: 'error'; message: string };

async function verifyReceipt(productId: string, purchase: Purchase): Promise<VerifyOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { kind: 'sign_in_required' };

  // expo-iap exposes the JWS receipt under different fields across SDK versions
  // and between StoreKit 1 and 2 — try the common ones in priority order.
  const anyPurchase = purchase as any;
  const receipt: string | undefined =
    anyPurchase.purchaseToken ??
    anyPurchase.transactionReceipt ??
    anyPurchase.jwsRepresentation ??
    anyPurchase.transactionReceiptIOS ??
    anyPurchase.originalTransactionIdentifierIOS;

  if (!receipt) return { kind: 'error', message: 'Missing receipt on purchase' };

  let res: Response;
  try {
    res = await fetch(VERIFY_FN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        platform: 'ios',
        productId,
        receipt,
        transactionId: anyPurchase.transactionId ?? anyPurchase.id ?? null,
      }),
    });
  } catch (err) {
    return { kind: 'error', message: (err as Error)?.message ?? 'Network error' };
  }

  if (res.status === 401) return { kind: 'sign_in_required' };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { kind: 'error', message: text || `HTTP ${res.status}` };
  }
  const data = await res.json().catch(() => null);
  return { kind: 'ok', entitled: !!data?.entitled, giftCode: data?.giftCode };
}

/**
 * Initiate a purchase and resolve when the StoreKit transaction is confirmed
 * AND the server has verified the receipt. Resolves with `giftCode` populated
 * for consumable gift purchases. Throws on user-cancel so the caller can no-op.
 */
export async function purchaseProduct(productId: string): Promise<VerifyOutcome> {
  if (!isIapAvailable()) {
    return { kind: 'error', message: 'IAP not available on this platform' };
  }
  await ensureConnection();

  return new Promise<VerifyOutcome>((resolve) => {
    let settled = false;
    const finish = (out: VerifyOutcome) => {
      if (settled) return;
      settled = true;
      try { updateSub.remove(); } catch {}
      try { errorSub.remove(); } catch {}
      resolve(out);
    };

    const updateSub = purchaseUpdatedListener(async (purchase) => {
      const pid = (purchase as any).productId ?? (purchase as any).id;
      if (pid !== productId) return;
      const verified = await verifyReceipt(productId, purchase);
      try {
        // Always finish — even on verify failure, otherwise the transaction
        // queue will replay forever. Failed verifications can be retried by
        // the user from Restore.
        await finishTransaction({ purchase, isConsumable: productId === PRODUCT_GIFT_CODE });
      } catch (err) {
        console.warn('[iap] finishTransaction failed', err);
      }
      finish(verified);
    });

    const errorSub = purchaseErrorListener((err) => {
      const code = (err as any).code ?? '';
      const msg = (err as any).message ?? 'Purchase failed';
      if (code === 'E_USER_CANCELLED' || /cancel/i.test(msg)) {
        finish({ kind: 'error', message: 'cancelled' });
      } else {
        finish({ kind: 'error', message: msg });
      }
    });

    requestPurchase({ request: { sku: productId, ios: { sku: productId } } as any, type: 'in-app' as any }).catch(
      (err: any) => finish({ kind: 'error', message: err?.message ?? 'Purchase failed' }),
    );
  });
}

/**
 * Re-verify any prior purchases (e.g. after reinstall). Useful for the
 * non-consumable book entitlement; gift consumables are not restored.
 */
export async function restorePurchases(): Promise<VerifyOutcome> {
  if (!isIapAvailable()) {
    return { kind: 'error', message: 'IAP not available on this platform' };
  }
  await ensureConnection();
  const { restorePurchases: doRestore, getAvailablePurchases } = await import('expo-iap');
  try {
    await doRestore();
  } catch {
    // Some SDKs don't expose a separate restore; fall through to query.
  }
  const purchases = (await getAvailablePurchases()) ?? [];
  const book = purchases.find(
    (p: any) => (p.productId ?? p.id) === PRODUCT_FULL_BOOK,
  );
  if (!book) return { kind: 'ok', entitled: false };
  return verifyReceipt(PRODUCT_FULL_BOOK, book);
}
