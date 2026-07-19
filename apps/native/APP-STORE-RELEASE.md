# IINB App Store release

This runbook owns the native release boundary for **Ignorance Is Not Bliss**. It does not contain credentials and does not authorize an App Store submission. The canonical app configuration is `app.json`; `app.backup.json` is legacy migration evidence only.

## Fixed identity

| Field | Canonical value |
| --- | --- |
| Expo owner/project | `@yogawithethan/iinb` |
| EAS project ID | `30783386-c185-4e88-8509-b33e92f22b45` |
| iOS bundle ID | `com.yogawithethan.iinb` |
| URL scheme | `iinbnative` |
| Full-book product | `iinb.fullbook` |
| Gift product | `iinb.giftcode` |
| Public book price | **$22.00 USD** |

Run this before creating a build:

```bash
cd /Users/ethanhill/drsti/iinb/apps/native
npx eas-cli project:info
npx expo config --type public --json
```

The EAS project ID and the UUID in `expo.updates.url` must match. `npm run verify:ecosystem` at the repository root enforces that relationship.

## App Store Connect setup

In the Yoga With Ethan Apple developer account:

1. Confirm the App Store Connect app uses `com.yogawithethan.iinb` and is owned by the same team EAS will sign with.
2. Add `iinb.fullbook` as a **non-consumable** in-app purchase named “Ignorance Is Not Bliss.” Set its US base price to **$22.00** and complete its localization, review screenshot, tax category, and availability.
3. Add `iinb.giftcode` as a **consumable** in-app purchase named “Gift a Copy.” Set its US base price to **$22.00**. One successful transaction returns one transferable IINB license code.
4. Make both products available to the app version being tested. Product identifiers are immutable after creation; stop if either identifier differs from this table.
5. Create an App Store Server API in-app-purchase key and securely hand off its issuer ID, key ID, and downloaded `.p8` private key. Apple permits downloading the private key only once.

The app must display Apple's localized StoreKit price on iOS. `$22.00` in the UI is only the loading fallback for the US base price.

## YWE Worker credential handoff

Run from the canonical YWE repository's `worker` directory. Enter values only at Wrangler's prompt; do not put them in shell history, `.env` files, tickets, or this repository.

```bash
cd /Users/ethanhill/drsti/ywe/worker
npx wrangler secret put APPLE_BUNDLE_ID
npx wrangler secret put APPLE_ISSUER_ID
npx wrangler secret put APPLE_KEY_ID
npx wrangler secret put APPLE_PRIVATE_KEY
npx wrangler secret put IINB_LICENSE_HMAC_KEY
npx wrangler secret list
```

Use `com.yogawithethan.iinb` for `APPLE_BUNDLE_ID`. Paste the complete `.p8` file, including its BEGIN/END lines, for `APPLE_PRIVATE_KEY`. Generate `IINB_LICENSE_HMAC_KEY` once with a password manager or `openssl rand -hex 32`, retain it in the Yoga With Ethan secret vault, and do not casually rotate it: deterministic gift-code recovery depends on that key remaining stable.

`APPLE_SHARED_SECRET` is only the legacy StoreKit receipt fallback. Add it with `npx wrangler secret put APPLE_SHARED_SECRET` only if the Apple account supplies an applicable app-specific shared secret and legacy receipts must be supported. StoreKit 2 verification uses the App Store Server API credentials above.

Secret names appearing in `wrangler secret list` is not end-to-end verification. Values remain unreadable by design.

## Build and sandbox gate

Before a device build:

```bash
cd /Users/ethanhill/drsti/iinb
npm run verify
cd apps/native
npx tsc --noEmit
npx expo-doctor
npx eas-cli build --platform ios --profile preview
```

Use a sandbox Apple account on a physical device and a distinct Yoga With Ethan test account. Pass all of these checks:

- StoreKit returns both product identifiers and a localized price; the full-book US storefront price is $22.00.
- A signed-out purchase attempt asks the reader to sign in before purchase.
- Buying `iinb.fullbook` returns `entitled: true`, unlocks paid chapters for that YWE account, and creates one `source='app_store'` D1 entitlement.
- Reinstalling the app and using Restore Purchases restores the same account entitlement without a second charge.
- Buying `iinb.giftcode` returns a single license code, does not silently entitle the buyer, and finishes the transaction as consumable.
- A second YWE account can redeem that gift code exactly once; repeating the same transaction returns the same code rather than issuing a second one.
- A malformed receipt, wrong bundle ID, wrong product ID, and signed-out verification are all rejected.
- Free Preface and Chapter 0 remain readable without purchase; all later chapters remain server-gated.

Record transaction IDs, test-account emails, Worker response codes, and D1 source counts in the release evidence. Never record receipt bodies, private keys, or full license codes.

## Production stop conditions

Do not submit while any of these are true:

- the EAS project, Updates URL, Apple team, or bundle ID disagree;
- either StoreKit product is missing metadata, unavailable, or not attached to the version;
- the YWE Worker cannot verify a sandbox StoreKit 2 transaction;
- full-book restore or gift-code idempotency fails;
- Apple refund/revocation handling has not been implemented and verified for production entitlements;
- the privacy disclosures, support URL, screenshots, review notes, or account-deletion requirements are incomplete.

The current backend verifies purchases and restores, but App Store Server Notification handling for later refunds/revocations is still a required production gate.

## Production build and submission

Creating a production build is an external Apple/EAS action. Submitting it is a separate explicit approval gate.

```bash
cd /Users/ethanhill/drsti/iinb/apps/native
npx eas-cli build --platform ios --profile production
# After the build is inspected and submission is explicitly approved:
npx eas-cli submit --platform ios --profile production --latest
```

After TestFlight processing, repeat the full-book purchase, restore, gift, sign-in return, free/paid boundary, and YWE account checks against production Worker infrastructure before requesting App Review.
