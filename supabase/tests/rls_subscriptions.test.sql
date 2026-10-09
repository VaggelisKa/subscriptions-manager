-- Phase 1b (spec §14.1 rls_subscriptions.test.sql): owner DML with the 1b column grants,
-- user_id default, constraints on new rows. DML runs via lives_ok/throws_ok; state is re-read as the owner.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(11);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000a1', 'alice@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000b2', 'bob@test.local',   'authenticated', 'authenticated');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true),
         set_config('role', 'anon', true);
$$;
-- 1b: functions created by postgres no longer get PUBLIC EXECUTE (global default privilege),
-- so the helpers must be granted explicitly to the roles that call them.
grant execute on function pg_temp.login(uuid), pg_temp.logout() to anon, authenticated;

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.subscriptions (name, price, interval, billed_at)
                   values ('Netflix', 79, 'month', now()) $$, 'owner inserts (user_id defaulted)');
select throws_ok($$ insert into public.subscriptions (user_id, name, price, interval, billed_at)
                    values ('00000000-0000-0000-0000-0000000000b2','x',1,'month',now()) $$,
                 '42501', null, 'cannot insert for another user');
select throws_ok($$ insert into public.subscriptions (id, name, price, interval, billed_at)
                   values (gen_random_uuid(),'x',1,'month',now()) $$, '42501', null, 'client cannot set id');

select pg_temp.login('00000000-0000-0000-0000-0000000000b2');
select is_empty($$ select 1 from public.subscriptions $$, 'bob sees nothing');
select lives_ok($$ update public.subscriptions set price = 0 $$, 'bob update runs (affects 0 rows)');
select lives_ok($$ delete from public.subscriptions $$,          'bob delete runs (affects 0 rows)');

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select results_eq($$ select price, user_id from public.subscriptions where name = 'Netflix' $$,
                  $$ values (79::numeric(12,2), '00000000-0000-0000-0000-0000000000a1'::uuid) $$,
                  'alice row untouched by bob; user_id came from auth.uid()');
select throws_ok($$ update public.subscriptions set created_at = now() $$, '42501', null, 'created_at not updatable');
select throws_ok($$ insert into public.subscriptions (name, price, interval, billed_at) values ('  ',1,'month',now()) $$,
                 '23514', null, 'blank name rejected');
select throws_ok($$ insert into public.subscriptions (name, price, interval, billed_at) values ('x',-1,'month',now()) $$,
                 '23514', null, 'negative price rejected');

select pg_temp.logout();
select throws_ok($$ select * from public.subscriptions $$, '42501', null, 'anon denied');

select * from finish();
rollback;
