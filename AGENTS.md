# IINB Repository Guidance

This repository is the canonical product unit for Ignorance Is Not Bliss.

## Ownership

- Edit manuscript and shared media only in `packages/content/`.
- Treat generated files in `apps/native/content/`, `apps/native/assets/audio/`, `apps/native/assets/logos/`, and the generated native asset maps as build outputs.
- Keep authentication, license, entitlement, webhook, and AI backend contracts in `supabase/`.
- Keep product-specific reader typography and theme behavior local to IINB.
- Reuse Yoga With Ethan shared foundations and shared navigation for ecosystem chrome; do not fork the canonical header.

## Verification

Run the root scripts for the affected platform. Before a release, run `npm run verify` and confirm both the canonical hostname and the `workers.dev` rollback endpoint separately.

The web app has version-specific Next.js guidance in `apps/web/AGENTS.md`; read it before editing web runtime code.
