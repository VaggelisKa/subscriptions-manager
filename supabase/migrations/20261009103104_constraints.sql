-- Phase 1b, file 3 of 3 (spec §5.2 file 3; rulings: category data fixes first, real FK names,
-- ON UPDATE kept as audited, default privileges, no client writes on categories).
-- Order: preconditions → category data → categories columns → price type → category FK →
-- subscriptions CHECKs (NOT VALID, validated in 1d) → privileges/defaults → indexes → guard.

-- ── (0) preconditions: abort if prod no longer looks like the 1a audit ──
do $$ begin
  -- Category-row checks apply only when categories has rows (prod). On a fresh local/staging DB the
  -- table is still empty here, because seed.sql runs after all migrations.
  if exists (select 1 from public.categories) and (
        not exists (select 1 from public.categories where id = 'e3e913bd-f54e-4523-a9fd-d3ac7e73777d' and type = 'productivity')
     or not exists (select 1 from public.categories where id = 'ae20f079-171d-460d-b360-ec65ee22a456'
                      and name = 'Education' and type in ('productivity', 'education'))
     or exists (select 1 from public.categories where type = 'productivity'
                  and id not in ('e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'ae20f079-171d-460d-b360-ec65ee22a456'))) then
    raise exception '1b precondition: Productivity/Education rows differ from the 1a audit; re-run the audit';
  end if;
  if (select confupdtype from pg_constraint where conname = 'subscriptions_user_id_fkey'
        and conrelid = 'public.subscriptions'::regclass) is distinct from 'c'
     or (select confdeltype from pg_constraint where conname = 'subscriptions_user_id_fkey'
        and conrelid = 'public.subscriptions'::regclass) is distinct from 'c' then
    raise exception '1b precondition: subscriptions_user_id_fkey is not ON UPDATE/DELETE CASCADE as audited';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_category_id_fkey'
                 and conrelid = 'public.subscriptions'::regclass) then
    raise exception '1b precondition: subscriptions_category_id_fkey not found';
  end if;
end $$;

-- ── (1) category data: missing transport row, Education key fix, unique name ──
-- Transport: fixed id (same row in seed.sql). Colour #F59E0B = the Transport colour already used in
-- ng-native's demo data (apps/ng-native/src/app/data/demo.ts); PENDING DESIGN CONFIRMATION.
insert into public.categories (id, name, color_hex, type)
select 'c9a35299-a72b-4f3d-87f1-ea93cd4b1a33'::uuid, 'Transport', '#F59E0B', 'transport'
where not exists (select 1 from public.categories where type = 'transport');

update public.categories                                      -- Education is NOT a duplicate: fix its key only
   set type = 'education'                                     -- id, name, colour unchanged; no subscription repointed
 where id = 'ae20f079-171d-460d-b360-ec65ee22a456' and type = 'productivity';

create unique index categories_name_lower_key on public.categories (lower(name));   -- built on the corrected data

-- ── (2) categories columns: keep varchar; NOT NULL / length only where the data allows ──
alter table public.categories alter column name set not null;                     -- audit: 0 null names
alter table public.categories
  add constraint categories_name_len check (char_length(name) between 1 and 40) not valid;   -- longest today: 17
alter table public.categories                                                       -- REPLACE, not duplicate
  drop constraint categories_color_hex_check,
  add  constraint categories_color_hex_format check ((color_hex)::text ~ '^#[0-9A-Fa-f]{6}$');  -- clean rows: validated now

-- ── (3) price: numeric → numeric(12,2) before the round() CHECK (audit: 0 non-øre prices) ──
alter table public.subscriptions
  alter column price type numeric(12,2) using round(price, 2);

-- ── (4) FK: real names; change ON DELETE only, keep each ON UPDATE as audited ──
-- subscriptions_user_id_fkey: already ON UPDATE CASCADE ON DELETE CASCADE → unchanged (asserted in (0)).
alter table public.subscriptions
  drop constraint subscriptions_category_id_fkey,
  add  constraint subscriptions_category_id_fkey
       foreign key (category_id) references public.categories(id)
       on update no action            -- kept as audited
       on delete set null;            -- the only change

-- ── (5) subscriptions CHECKs: NOT VALID now, validated in 1d (audit: all counts 0) ──
alter table public.subscriptions
  add constraint subscriptions_name_not_blank check (char_length(btrim(name)) between 1 and 120) not valid,
  add constraint subscriptions_price_valid    check (price >= 0 and price < 10000000 and price = round(price, 2)) not valid;

-- ── (6) defaults + privileges: start from zero, grant explicitly ──
alter table public.subscriptions alter column user_id set default auth.uid();

revoke all on public.subscriptions from anon, authenticated;     -- TRUNCATE bypasses RLS: never granted back
revoke all on public.categories    from anon, authenticated;
grant select, delete on public.subscriptions to authenticated;
grant insert (user_id, name, price, interval, billed_at, category_id) on public.subscriptions to authenticated;
grant update (name, price, interval, billed_at, category_id)          on public.subscriptions to authenticated;
grant select on public.categories to authenticated;               -- read-only: no write grants, column-level or otherwise

-- Future objects get nothing by default (ruling). Every later migration grants explicitly.
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
-- (PUBLIC EXECUTE on functions is removed globally in file 1.)

-- supabase_admin: attempt; the migration role normally isn't allowed to alter another role's defaults.
do $$
begin
  alter default privileges for role supabase_admin in schema public revoke all on tables    from anon, authenticated;
  alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated;
  alter default privileges for role supabase_admin in schema public revoke all on functions from anon, authenticated;
  raise notice 'supabase_admin default privileges in public revoked';
exception when insufficient_privilege then
  raise notice 'supabase_admin default privileges not alterable by %; documented in spec §5.2, covered by the guard', current_user;
end $$;

-- ── (7) indexes (clear the unindexed_foreign_keys advisors) ──
create index if not exists subscriptions_user_id_idx     on public.subscriptions (user_id);
create index if not exists subscriptions_category_id_idx on public.subscriptions (category_id);

-- ── (8) guard ──
select private.assert_hardening();
