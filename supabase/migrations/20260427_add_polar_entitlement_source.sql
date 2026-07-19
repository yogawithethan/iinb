-- Add 'polar' to the entitlement_source enum so the polar-webhook Edge Function
-- can record entitlements granted via Polar checkouts.
alter type entitlement_source add value if not exists 'polar';
