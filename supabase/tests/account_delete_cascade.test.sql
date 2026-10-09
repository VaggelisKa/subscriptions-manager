-- Phase 2 (spec §7, §14.1): the delete-account Edge Function only deletes the auth user and relies
-- on the subscriptions → auth.users ON DELETE CASCADE FK. Deleting one user removes exactly their rows.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(5);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000e5', 'erin@test.local',  'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000f6', 'frank@test.local', 'authenticated', 'authenticated');

insert into public.subscriptions (user_id, name, price, interval, billed_at)
values ('00000000-0000-0000-0000-0000000000e5', 'Erin one',  5,  'month', now()),
       ('00000000-0000-0000-0000-0000000000e5', 'Erin two',  60, 'year',  now()),
       ('00000000-0000-0000-0000-0000000000f6', 'Frank one', 9,  'month', now()),
       ('00000000-0000-0000-0000-0000000000f6', 'Frank two', 12, 'month', now());

create temp table frank_before on commit drop as
  select id, name, price, interval, billed_at, category_id, created_at
  from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000f6';

select lives_ok($$ delete from auth.users where id = '00000000-0000-0000-0000-0000000000e5' $$,
                'deleting a user with subscriptions succeeds');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000e5'), 0,
          'the user is gone');
select is((select count(*)::int from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000e5'), 0,
          'their subscriptions are gone via cascade');
select is((select count(*)::int from public.subscriptions where name like 'Erin %'), 0,
          'no orphaned rows left behind');
select set_eq($$ select id, name, price, interval, billed_at, category_id, created_at
                 from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000f6' $$,
              $$ select * from frank_before $$,
              'another user''s rows are untouched');

select * from finish();
rollback;
