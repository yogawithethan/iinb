# Ignorance Is Not Bliss

This repository is the canonical product unit for **Ignorance Is Not Bliss** (IINB) across web, native, shared content, and backend contracts.

## Repository layout

- `apps/web/` — the Next.js interactive reader served at `iinb.yogawithethan.com`
- `apps/native/` — the Expo iOS and Android reader
- `packages/content/` — the only canonical manuscript, glossary, image, audio, and cross-product content source
- `supabase/` — read-only legacy schema and Edge Function evidence retained for the audited historical import
- `docs/` — product specifications and migration evidence

The Yoga With Ethan repository registers IINB as a governed product surface and owns ecosystem navigation, shared UI foundations, account integration, operator tooling, Stripe fulfillment, App Store receipt verification, AI, reader sync, and canonical D1 entitlements. This repository owns the IINB web/native runtime and content. Supabase and Polar are no longer runtime writers.

## Access and commerce contract

- Preface and Chapter 0 are readable without purchase; Chapter 1 onward requires an active IINB entitlement.
- Web and non-iOS checkout uses the authenticated YWE Stripe route at a fixed **$14.99 USD** one-time price.
- iOS digital purchases remain StoreKit purchases; the YWE Worker verifies Apple receipts and grants the same D1 entitlement used by web.
- Existing license keys are imported as hashed, auditable records and become attached to a verified YWE email when claimed.
- The web reader uses the shared `.yogawithethan.com` member cookie. Native exchanges a one-time email-link code for a secure YWE bearer session stored in Keychain/Keystore.

## Local commands

```bash
npm run build:native-content
npm run lint:web
npm run lint:native
npm run build:web
npm --prefix apps/web run preview:cloudflare
```

The web deployment is an OpenNext application on Cloudflare Workers. Its build bundles a deterministic snapshot from `packages/content`, while that package remains the only editable manuscript source. The web production build currently emits a non-fatal Turbopack warning for the standards-based CSS Custom Highlight pseudo-element, `::highlight(iinb-highlight)`.

The source folders `/Users/ethanhill/drsti/iinb-native` and `/Users/ethanhill/drsti/iinb-shared` remain as migration fallbacks until parity and deployment verification are complete. Do not edit them as canonical sources after the monorepo cutover.
