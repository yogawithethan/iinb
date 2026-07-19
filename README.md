# Ignorance Is Not Bliss

This repository is the canonical product unit for **Ignorance Is Not Bliss** (IINB) across web, native, shared content, and backend contracts.

## Repository layout

- `apps/web/` — the Next.js interactive reader served at `iinb.yogawithethan.com`
- `apps/native/` — the Expo iOS and Android reader
- `packages/content/` — the only canonical manuscript, glossary, image, audio, and cross-product content source
- `supabase/` — authentication, licenses, entitlements, purchase webhooks, AI, and account-supporting backend functions
- `docs/` — product specifications and migration evidence

The Yoga With Ethan repository registers IINB as a governed product surface and owns ecosystem navigation, shared UI foundations, account integration, and operator tooling. This repository owns the IINB runtime and content.

## Local commands

```bash
npm run build:native-content
npm run lint:web
npm run lint:native
npm run build:web
```

The source folders `/Users/ethanhill/drsti/iinb-native` and `/Users/ethanhill/drsti/iinb-shared` remain as migration fallbacks until parity and deployment verification are complete. Do not edit them as canonical sources after the monorepo cutover.
