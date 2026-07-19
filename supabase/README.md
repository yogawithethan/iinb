# Islands Supabase — backend bits shared by iinb (web) and iinb-native

## What's here

- `migrations/` — SQL migrations that mutate the Islands schema
- `functions/` — Supabase Edge Functions (Deno runtime)
- `config.toml` — links this folder to project `swtsqngrkkhggjacfhft`

## One-time setup

You need the Supabase CLI logged in:

```bash
cd /Users/ethanhill/drsti/iinb-shared
npx supabase login
npx supabase link --project-ref swtsqngrkkhggjacfhft
```

## Apply pending SQL migrations

```bash
cd /Users/ethanhill/drsti/iinb-shared
npx supabase db push
```

This runs every `.sql` file in `migrations/` against the linked project. Run it once after pulling new migrations.

## Set Edge Function secrets

The polar-webhook function needs the webhook signing secret as an env var:

```bash
cd /Users/ethanhill/drsti/iinb-shared
npx supabase secrets set POLAR_WEBHOOK_SECRET=replace-with-secret-from-password-manager
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided to functions by Supabase — no need to set them.)

## Deploy the polar-webhook function

```bash
cd /Users/ethanhill/drsti/iinb-shared
npx supabase functions deploy polar-webhook
```

After deploy, the function URL is:

```
https://swtsqngrkkhggjacfhft.supabase.co/functions/v1/polar-webhook
```

Paste that URL into the Polar dashboard webhook config to replace the placeholder.

## How it works

1. Customer pays via Polar checkout
2. Polar sends `order.paid` webhook to the function URL
3. Function verifies the signature using `POLAR_WEBHOOK_SECRET`
4. Function resolves the buyer to a Supabase user (via `metadata.user_id` or email match)
5. Function inserts a row into `product_entitlements` with `product_slug='ignorance-is-not-bliss'`, `source='polar'`, `status='active'`
6. Both web and native iinb apps query this table on sign-in to determine premium status

## Logs

```bash
npx supabase functions logs polar-webhook
```

or in the dashboard: Edge Functions → polar-webhook → Logs.
