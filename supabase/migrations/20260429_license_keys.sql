-- License keys + entitlements unification.
--
-- Every web purchase generates a license_keys row. Self-purchases by signed-in
-- buyers are auto-redeemed at webhook time (creates entitlement + sends a
-- confirmation email with the code for restore-on-other-devices). Gifts and
-- guest purchases stay unredeemed until the recipient signs in and either
-- enters the code manually or the auto-claim hook matches their email.
--
-- IAP (Apple) bypasses license_keys entirely — receipts grant entitlements
-- directly via 'app_store' source. License keys are for non-IAP channels.

-- Add 'license' source so redeemed-key entitlements are distinguishable
-- from polar-direct entitlements (the latter become rare once this lands).
alter type entitlement_source add value if not exists 'license';
alter type entitlement_source add value if not exists 'app_store';

create table if not exists license_keys (
  code             text primary key,
  product_slug     text not null,
  status           text not null default 'unredeemed'
                     check (status in ('unredeemed', 'redeemed', 'revoked')),
  channel          text not null
                     check (channel in ('polar', 'gift', 'manual')),
  payer_email      text,
  recipient_email  text,
  redeemed_by      uuid references auth.users(id) on delete set null,
  redeemed_at      timestamptz,
  external_id      text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

-- Auto-claim queries hit these constantly — case-insensitive lookup by email.
create index if not exists license_keys_payer_email_idx
  on license_keys (lower(payer_email))
  where status = 'unredeemed';

create index if not exists license_keys_recipient_email_idx
  on license_keys (lower(recipient_email))
  where status = 'unredeemed';

-- Unique guard: don't double-issue keys for the same external order.
create unique index if not exists license_keys_external_id_unique
  on license_keys (channel, external_id)
  where external_id is not null;

-- RLS: never expose license_keys to the client directly. All reads/writes
-- go through Edge Functions running on the service role.
alter table license_keys enable row level security;

-- Helper: redeem a key atomically. Returns the entitlement row on success,
-- raises an exception with a clean code on failure so Edge Functions can
-- map straight to HTTP responses.
create or replace function redeem_license_key(
  p_code text,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key license_keys;
begin
  -- Normalize: strip dashes/spaces, uppercase.
  p_code := upper(regexp_replace(p_code, '[^A-Z0-9]', '', 'gi'));
  -- Re-insert dashes in the IINB-XXXX-XXXX-XXXX format we store.
  if length(p_code) = 16 and substring(p_code, 1, 4) = 'IINB' then
    p_code := 'IINB-' || substring(p_code, 5, 4) || '-' ||
              substring(p_code, 9, 4) || '-' || substring(p_code, 13, 4);
  end if;

  select * into v_key from license_keys where code = p_code for update;
  if not found then raise exception 'CODE_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_key.status = 'redeemed' then
    if v_key.redeemed_by = p_user_id then
      raise exception 'ALREADY_REDEEMED_BY_YOU' using errcode = 'P0002';
    else
      raise exception 'ALREADY_REDEEMED' using errcode = 'P0003';
    end if;
  end if;
  if v_key.status = 'revoked' then
    raise exception 'CODE_REVOKED' using errcode = 'P0004';
  end if;

  update license_keys
    set status = 'redeemed',
        redeemed_by = p_user_id,
        redeemed_at = now()
    where code = p_code;

  insert into product_entitlements
    (user_id, product_slug, source, source_reference, status, starts_at, ends_at)
  values
    (p_user_id, v_key.product_slug, 'license', p_code, 'active', now(), null)
  on conflict (user_id, product_slug) do update
    set status = 'active', source = 'license', source_reference = p_code;
end;
$$;

-- Auto-claim: redeem all unredeemed keys matching the user's email (as
-- payer OR recipient). Idempotent; safe to call after every sign-in.
create or replace function claim_pending_licenses(
  p_user_id uuid,
  p_email text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_count int := 0;
  v_code text;
begin
  if v_email is null or v_email = '' then return 0; end if;

  for v_code in
    select code from license_keys
     where status = 'unredeemed'
       and (lower(payer_email) = v_email or lower(recipient_email) = v_email)
     for update
  loop
    perform redeem_license_key(v_code, p_user_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
