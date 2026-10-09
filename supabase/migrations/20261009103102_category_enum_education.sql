-- Phase 1b, file 2 of 3 (spec §5.2 file 2; ruling: Education is a real category, fix its key).
-- On its own: Postgres won't let a new enum value be used in the transaction that adds it.
alter type public.subscription_category add value if not exists 'education';

select private.assert_hardening();
