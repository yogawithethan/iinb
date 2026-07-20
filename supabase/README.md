# Legacy Supabase backend (read-only migration evidence)

This folder preserves the historical Islands/Supabase schema and Edge Functions used by IINB before the Yoga With Ethan integration. It is not a canonical runtime and must not receive new application writes or deployments.

The canonical writer is the Yoga With Ethan Worker and D1 database in `/Users/ethanhill/drsti/ywe`:

- shared member identity and magic links
- Stripe checkout and fulfillment
- App Store receipt verification
- license redemption and historical entitlement recovery
- AI and paragraph personalization
- reader position, settings, highlights, and activity

Do not run `supabase db push` or deploy these functions. The files remain available only to prepare and verify the one-time historical export. Use `scripts/prepare-iinb-historical-import.mjs` in the YWE repository to transform an approved Supabase JSON export into reviewable D1 SQL. Retire the Supabase project only after row counts and representative entitlement claims have been reconciled in production.
