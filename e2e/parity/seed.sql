-- Web parity fixtures (spec §12A.2). LOCAL STACK ONLY: creates users with a known password.
--
-- Loaded by the suite's globalSetup (support/db.ts) before every run, and by the write flows
-- before each test. Idempotent and race-free: users are created once, subscription rows are
-- upserted and anything else the fixture users own is deleted, so re-applying it while other
-- tests read the same rows changes nothing they can see.
--
-- `select set_config('parity.only_user', '<email>', false)` before running this file limits it
-- to one user (the write flows reseed only their own user). By hand:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f e2e/parity/seed.sql
--
-- The fixed "today" is Wed 14 Oct 2026 (Europe/Copenhagen); every date below is chosen
-- relative to it. Buckets: "Next 7 days" = 14–21 Oct, "Later this month" = 22–31 Oct,
-- "Later" = Nov onwards.

begin;

-- Same rows (and ids) as supabase/seed.sql, in case the stack was reset without its seed.
insert into public.categories (id, name, color_hex, type) values
  ('e5eb4564-e904-4886-a922-6fd4b5350c75', 'Entertainment',      '#FF5733', 'entertainment'),
  ('e51eda7a-0282-43df-8e78-e774144608ac', 'Utilities',          '#2ECC71', 'utilities'),
  ('e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'Productivity',       '#3498DB', 'productivity'),
  ('ae20f079-171d-460d-b360-ec65ee22a456', 'Education',          '#9B59B6', 'education'),
  ('65a602cb-9383-406e-b546-2c02eec775f3', 'Health and Fitness', '#FFD700', 'health_and_fitness'),
  ('7e21ee74-242a-4bd0-9c22-4fd6ec6aa8da', 'Business expenses',  '#800020', 'business'),
  ('c9a35299-a72b-4f3d-87f1-ea93cd4b1a33', 'Transport',          '#F59E0B', 'transport')
on conflict (id) do nothing;

-- ── users ──
-- populated: gets the 12 subscriptions below. Ids/emails match support/env.ts (USERS).
create temporary table parity_users (no int, id uuid, email text, populated boolean) on commit drop;
insert into parity_users values
  (1, '00000000-0000-4000-a000-000000000001', 'populated@parity.test',     true),   -- visual + read-only flows
  (2, '00000000-0000-4000-a000-000000000002', 'empty@parity.test',         false),  -- empty states
  (3, '00000000-0000-4000-a000-000000000003', 'loading@parity.test',       true),   -- loading skeleton (proxy holds its requests)
  (4, '00000000-0000-4000-a000-000000000004', 'failing@parity.test',       true),   -- load error + retry (proxy fails its requests)
  (5, '00000000-0000-4000-a000-000000000005', 'writer-add@parity.test',    true),   -- flow 2 (writes)
  (6, '00000000-0000-4000-a000-000000000006', 'writer-edit@parity.test',   true),   -- flow 3 (writes)
  (7, '00000000-0000-4000-a000-000000000007', 'writer-delete@parity.test', true),   -- flow 4 (writes)
  (8, '00000000-0000-4000-a000-000000000008', 'signout@parity.test',       true),   -- flow 1 (global sign-out revokes its sessions)
  (11,'00000000-0000-4000-a000-000000000011', 'realtime@parity.test',      true);   -- flow 12 (writes; skipped on Next)

delete from parity_users
 where coalesce(current_setting('parity.only_user', true), '') <> ''
   and email <> current_setting('parity.only_user', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
       extensions.crypt('parity-password-local', extensions.gen_salt('bf')), '2026-01-01 09:00:00+01',
       '{"provider":"email","providers":["email"]}', '{}', '2026-01-01 09:00:00+01', '2026-01-01 09:00:00+01',
       '', '', '', '', '', '', '', ''
  from parity_users
on conflict (id) do nothing;

-- Keep the known password even if someone changed it.
update auth.users u
   set encrypted_password = extensions.crypt('parity-password-local', extensions.gen_salt('bf'))
  from parity_users p
 where u.id = p.id
   and u.encrypted_password is distinct from extensions.crypt('parity-password-local', u.encrypted_password);

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email',
       '2026-01-01 09:00:00+01', '2026-01-01 09:00:00+01'
  from parity_users
on conflict (provider_id, provider) do nothing;

-- ── subscriptions (populated users) ──
-- n  name                                     category           interval price     anchor      next charge from 14 Oct
-- 1  Netflix                       (brand)    Entertainment      month    129       2025-12-14  Wed 14 Oct (today)
-- 2  Spotify Premium Family …      (brand)    Entertainment      month    179       2026-01-16  Fri 16 Oct (due soon; long name)
-- 3  Fitness World                 (no brand) Health and Fitness week     69        2026-09-17  Thu 15 Oct, then weekly
-- 4  Ørsted Electricity                       Utilities          month    450,50    2026-01-20  Tue 20 Oct (decimals)
-- 5  Photon Cloud Backup           (fuzzy)    Utilities          month    39        2026-04-15  Thu 15 Oct (2 charges with Fitness World)
-- 6  DSB Commuter Pass                        Transport          month    1.250     2026-01-31  Sat 31 Oct (31st anchor: 31 Jan → 28 Feb → 31 Mar)
-- 7  Duolingo Super                (brand)    Education          year     599       2025-10-27  Tue 27 Oct
-- 8  Podcast Supporter Club                   Entertainment      month    25        2026-08-13  Fri 13 Nov (charged yesterday)
-- 9  Accountant Retainer                      Business expenses  month    2.500     2026-02-05  Thu 5 Nov
-- 10 Claude Pro                    (brand)    Productivity       month    160       2026-03-09  Mon 9 Nov
-- 11 Neighbourhood Allotment …     (no cat.)  —                  year     350       2026-03-01  Mon 1 Mar 2027 (long name)
-- 12 Adobe Creative Cloud          (brand)    Productivity       year     4.299,50  2026-01-25  Mon 25 Jan 2027
-- Brands (apps/web/src/lib/brands.ts findBrand): exact matches 1, 2, 7, 10, 12; "Photon" is a typo-tolerant
-- match for Proton (gets its glyph); 3, 4, 6, 8, 9, 11 get the monogram tile.
create temporary table parity_subscriptions (
  n int, name text, category_id uuid, "interval" public.interval_enum, price numeric(12,2), anchor date, created timestamptz
) on commit drop;
insert into parity_subscriptions values
  (1,  'Netflix',                                         'e5eb4564-e904-4886-a922-6fd4b5350c75', 'month', 129,     '2025-12-14', '2025-12-10 09:00:00+01'),
  (2,  'Spotify Premium Family Plan with Six Accounts',   'e5eb4564-e904-4886-a922-6fd4b5350c75', 'month', 179,     '2026-01-16', '2026-01-05 09:00:00+01'),
  (3,  'Fitness World',                                   '65a602cb-9383-406e-b546-2c02eec775f3', 'week',  69,      '2026-09-17', '2026-09-15 09:00:00+02'),
  (4,  'Ørsted Electricity',                              'e51eda7a-0282-43df-8e78-e774144608ac', 'month', 450.50,  '2026-01-20', '2026-01-05 09:00:00+01'),
  (5,  'Photon Cloud Backup',                             'e51eda7a-0282-43df-8e78-e774144608ac', 'month', 39,      '2026-04-15', '2026-04-10 09:00:00+02'),
  (6,  'DSB Commuter Pass',                               'c9a35299-a72b-4f3d-87f1-ea93cd4b1a33', 'month', 1250,    '2026-01-31', '2026-01-20 09:00:00+01'),
  (7,  'Duolingo Super',                                  'ae20f079-171d-460d-b360-ec65ee22a456', 'year',  599,     '2025-10-27', '2025-10-20 09:00:00+02'),
  (8,  'Podcast Supporter Club',                          'e5eb4564-e904-4886-a922-6fd4b5350c75', 'month', 25,      '2026-08-13', '2026-08-01 09:00:00+02'),
  (9,  'Accountant Retainer',                             '7e21ee74-242a-4bd0-9c22-4fd6ec6aa8da', 'month', 2500,    '2026-02-05', '2026-02-01 09:00:00+01'),
  (10, 'Claude Pro',                                      'e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'month', 160,     '2026-03-09', '2026-03-01 09:00:00+01'),
  (11, 'Neighbourhood Allotment Garden Association Annual Membership Fee', null,                    'year',  350,     '2026-03-01', '2026-02-20 09:00:00+01'),
  (12, 'Adobe Creative Cloud',                            'e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'year',  4299.50, '2026-01-25', '2026-01-25 09:00:00+01');

create temporary table parity_rows on commit drop as
select format('%s-0000-4000-b000-%s', lpad(p.no::text, 8, '0'), lpad(s.n::text, 12, '0'))::uuid as id,
       p.id as user_id, s.name, s.price, s."interval",
       -- Stored like the app stores a picked day: noon in Copenhagen (apps/web/src/lib/price.ts toBilledAt).
       (s.anchor + time '12:00') at time zone 'Europe/Copenhagen' as billed_at,
       s.category_id, s.created
  from parity_users p cross join parity_subscriptions s
 where p.populated;

insert into public.subscriptions (id, user_id, name, price, "interval", billed_at, category_id, created_at, description)
select id, user_id, name, price, "interval", billed_at, category_id, created, null from parity_rows
on conflict (id) do update
   set user_id = excluded.user_id, name = excluded.name, price = excluded.price, "interval" = excluded."interval",
       billed_at = excluded.billed_at, category_id = excluded.category_id, created_at = excluded.created_at,
       description = excluded.description
 where (subscriptions.user_id, subscriptions.name, subscriptions.price, subscriptions."interval", subscriptions.billed_at,
        subscriptions.category_id, subscriptions.created_at, subscriptions.description)
       is distinct from
       (excluded.user_id, excluded.name, excluded.price, excluded."interval", excluded.billed_at,
        excluded.category_id, excluded.created_at, excluded.description);

-- Rows a flow added (or anything else these users own) go; the empty user ends up with none.
delete from public.subscriptions s
 using parity_users p
 where s.user_id = p.id
   and s.id not in (select id from parity_rows);

commit;
