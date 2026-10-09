-- Pre-1b security hotfix: anon is locked out, users can only touch their own rows,
-- categories are read-only for signed-in users.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(28);

-- fixtures (as postgres)
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000a1', 'alice@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000b2', 'bob@test.local',   'authenticated', 'authenticated');
-- own category fixture, so nothing here depends on seed.sql
insert into public.categories (id, name, color_hex, type)
values ('00000000-0000-0000-0000-0000000000c1', 'Fixture category', '#123456', 'utilities');
insert into public.subscriptions (id, user_id, name, price, interval, billed_at)
values ('00000000-0000-0000-0000-00000000b0b0', '00000000-0000-0000-0000-0000000000b2', 'Bob sub', 50, 'month', now());

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true),
         set_config('role', 'anon', true);
$$;

-- ── privileges ──
select ok(not has_table_privilege('anon', 'public.subscriptions', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), 'anon has no privilege on subscriptions');
select ok(not has_table_privilege('anon', 'public.categories',    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), 'anon has no privilege on categories');
select ok(not has_table_privilege('authenticated', 'public.subscriptions', 'TRUNCATE,REFERENCES,TRIGGER'), 'authenticated: no TRUNCATE/REFERENCES/TRIGGER on subscriptions');
select ok(not has_table_privilege('authenticated', 'public.categories',    'TRUNCATE,REFERENCES,TRIGGER'), 'authenticated: no TRUNCATE/REFERENCES/TRIGGER on categories');
select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), 'RLS enabled on categories');
select ok(not has_table_privilege('authenticated', 'public.categories', 'INSERT,UPDATE,DELETE'), 'authenticated: categories is read-only (no INSERT/UPDATE/DELETE privilege)');
select policies_are('public', 'subscriptions',
  array['subscriptions_select_own','subscriptions_insert_own','subscriptions_update_own','subscriptions_delete_own'],
  'subscriptions has exactly the four owner policies');
select policies_are('public', 'categories', array['categories_read'], 'categories has only the read policy');

-- ── anon ──
select pg_temp.logout();
select throws_ok($$ insert into public.categories (name, color_hex, type) values ('x', '#000000', 'business') $$, '42501', null, 'anon cannot insert categories');
select throws_ok($$ update public.categories set name = 'x' $$,  '42501', null, 'anon cannot update categories');
select throws_ok($$ delete from public.categories $$,            '42501', null, 'anon cannot delete categories');
select throws_ok($$ select * from public.categories $$,          '42501', null, 'anon cannot read categories');
select throws_ok($$ insert into public.subscriptions (user_id, name, price, interval, billed_at)
                    values ('00000000-0000-0000-0000-0000000000b2', 'x', 1, 'month', now()) $$, '42501', null, 'anon cannot insert subscriptions');
select throws_ok($$ update public.subscriptions set price = 0 $$, '42501', null, 'anon cannot update subscriptions');
select throws_ok($$ delete from public.subscriptions $$,          '42501', null, 'anon cannot delete subscriptions');

-- ── alice (authenticated) ──
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select ok(exists (select 1 from public.categories where id = '00000000-0000-0000-0000-0000000000c1'), 'authenticated can read categories (fixture row)');
select throws_ok($$ insert into public.categories (name, color_hex, type) values ('x', '#000000', 'business') $$, '42501', null, 'authenticated cannot insert categories');
select throws_ok($$ update public.categories set name = 'hacked' $$, '42501', null, 'authenticated cannot update categories');
select throws_ok($$ delete from public.categories where id = '00000000-0000-0000-0000-0000000000c1' $$, '42501', null, 'authenticated cannot delete categories');

select lives_ok($$ insert into public.subscriptions (id, user_id, name, price, interval, billed_at)
                   values ('00000000-0000-0000-0000-00000000a1a1', '00000000-0000-0000-0000-0000000000a1', 'Netflix', 79, 'month', now()) $$,
                'alice inserts her own row');
select throws_ok($$ insert into public.subscriptions (user_id, name, price, interval, billed_at)
                    values ('00000000-0000-0000-0000-0000000000b2', 'spam', 1, 'month', now()) $$,
                 '42501', null, 'alice cannot insert a row for bob (cross-user insert)');
select results_eq($$ select id from public.subscriptions $$,
                  $$ values ('00000000-0000-0000-0000-00000000a1a1'::uuid) $$, 'alice sees only her own row');
select lives_ok($$ update public.subscriptions set price = 99 where id = '00000000-0000-0000-0000-00000000a1a1' $$, 'alice updates her own row');
select is_empty($$ update public.subscriptions set price = 0 where id = '00000000-0000-0000-0000-00000000b0b0' returning id $$,
                'alice cannot update bob''s row (cross-user update touches nothing)');
select throws_ok($$ update public.subscriptions set user_id = '00000000-0000-0000-0000-0000000000b2' where id = '00000000-0000-0000-0000-00000000a1a1' $$,
                 '42501', null, 'alice cannot hand her row to bob');
select is_empty($$ delete from public.subscriptions where id = '00000000-0000-0000-0000-00000000b0b0' returning id $$,
                'alice cannot delete bob''s row');
select lives_ok($$ delete from public.subscriptions where id = '00000000-0000-0000-0000-00000000a1a1' $$, 'alice deletes her own row');

-- ── state re-read as the owner ──
reset role;
select results_eq($$ select price from public.subscriptions where id = '00000000-0000-0000-0000-00000000b0b0' $$,
                  $$ values (50::numeric) $$, 'bob''s row untouched');

select * from finish();
rollback;
