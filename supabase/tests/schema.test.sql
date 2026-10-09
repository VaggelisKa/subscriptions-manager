-- Phase 1b (spec §5.2 file 3, §14.1 schema.test.sql): category data, constraints, FK actions,
-- column-level grants and cascade behaviour. (The "categories not in Realtime" check is 1c.)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(31);

-- ── FKs ──
select is((select count(*)::int from pg_constraint
           where conrelid = 'public.subscriptions'::regclass and contype = 'f'
             and confrelid = 'auth.users'::regclass), 1, 'exactly one FK subscriptions → auth.users');
select is((select confdeltype::text from pg_constraint
           where conrelid = 'public.subscriptions'::regclass and contype = 'f'
             and confrelid = 'auth.users'::regclass), 'c', 'that FK is ON DELETE CASCADE');
select is((select confupdtype::text from pg_constraint
           where conname = 'subscriptions_user_id_fkey' and conrelid = 'public.subscriptions'::regclass),
          'c', 'user FK keeps ON UPDATE CASCADE');
select is((select confdeltype::text || confupdtype::text from pg_constraint
           where conname = 'subscriptions_category_id_fkey' and conrelid = 'public.subscriptions'::regclass),
          'na', 'category FK: ON DELETE SET NULL, ON UPDATE NO ACTION kept');

-- ── category data (seeded locally; inserted/fixed by the migration on prod) ──
select is((select count(*)::int from public.categories where type = 'transport'), 1, 'transport row exists');
select is((select type::text || '|' || name || '|' || color_hex from public.categories
           where id = 'c9a35299-a72b-4f3d-87f1-ea93cd4b1a33'),
          'transport|Transport|#F59E0B', 'Transport has the fixed id used by the migration and seed');
select is((select count(*)::int from public.categories where type = 'productivity'), 1, 'single productivity row');
select is((select type::text || '|' || name from public.categories where id = 'ae20f079-171d-460d-b360-ec65ee22a456'),
          'education|Education', 'Education kept (same id and name), key fixed to education');
select is((select count(*)::int from public.categories), 7, '6 audited rows + Transport');
select enum_has_labels('public','subscription_category',
  array['entertainment','utilities','productivity','health_and_fitness','transport','business','education']);

-- ── categories constraints ──
select has_index('public','categories','categories_name_lower_key', 'unique index on lower(name)');
select throws_ok($$ insert into public.categories (name, color_hex, type) values ('transport', '#000000', 'transport') $$,
                 '23505', null, 'category names are unique case-insensitively');
select col_not_null('public','categories','name', 'categories.name is NOT NULL');
select col_type_is('public','categories','name','character varying', 'categories.name stays varchar');
select is((select count(*)::int from pg_constraint
           where conrelid = 'public.categories'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%color_hex%'), 1, 'exactly one color_hex check (replaced, not duplicated)');
select throws_ok($$ insert into public.categories (name, color_hex, type) values ('Bad colour', 'red', 'utilities') $$,
                 '23514', null, 'colour must be #RRGGBB');
select throws_ok($$ insert into public.categories (name, color_hex, type) values ('', '#000000', 'utilities') $$,
                 '23514', null, 'empty category name rejected (categories_name_len)');

-- ── subscriptions columns, constraints, indexes ──
select col_type_is('public','subscriptions','price','numeric(12,2)', 'price is numeric(12,2)');
select col_default_is('public','subscriptions','user_id','auth.uid()', 'user_id defaults to auth.uid()');
select is((select count(*)::int from pg_constraint
           where conrelid = 'public.subscriptions'::regclass
             and conname in ('subscriptions_name_not_blank','subscriptions_price_valid') and not convalidated),
          2, 'subscriptions CHECKs exist, NOT VALID until 1d');
select has_index('public','subscriptions','subscriptions_user_id_idx', 'index on user_id');
select has_index('public','subscriptions','subscriptions_category_id_idx', 'index on category_id');

-- ── column-level grants ──
select ok(not has_column_privilege('authenticated','public.subscriptions','created_at','INSERT'), 'created_at not insertable');
select ok(not has_column_privilege('authenticated','public.subscriptions','id','INSERT'), 'id not insertable');
select ok(not has_column_privilege('authenticated','public.subscriptions','description','INSERT')
          and not has_column_privilege('authenticated','public.subscriptions','description','UPDATE'), 'description not writable');
select ok(not has_column_privilege('authenticated','public.subscriptions','user_id','UPDATE'), 'user_id not updatable');
select ok(has_column_privilege('authenticated','public.subscriptions','name','INSERT')
          and has_column_privilege('authenticated','public.subscriptions','name','UPDATE'), 'user columns writable');
select ok(not has_table_privilege('authenticated','public.subscriptions','TRUNCATE')
          and not has_table_privilege('anon','public.subscriptions','TRUNCATE'), 'no TRUNCATE (bypasses RLS)');
select ok(not has_any_column_privilege('authenticated','public.categories','INSERT,UPDATE'),
          'no column-level write grants on categories');

-- ── cascade behaviour ──
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000c3', 'carol@test.local', 'authenticated', 'authenticated');
insert into public.subscriptions (user_id, name, price, interval, billed_at, category_id)
values ('00000000-0000-0000-0000-0000000000c3', 'Carol sub', 1, 'month', now(), 'c9a35299-a72b-4f3d-87f1-ea93cd4b1a33');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c3';
select is((select count(*)::int from public.subscriptions where name = 'Carol sub'), 0, 'rows cascade with the user');

-- category delete → category_id set null (ON DELETE SET NULL)
insert into public.categories (id, name, color_hex, type)
values ('00000000-0000-0000-0000-0000000000c9', 'Doomed category', '#ABCDEF', 'utilities');
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000d4', 'dave@test.local', 'authenticated', 'authenticated');
insert into public.subscriptions (user_id, name, price, interval, billed_at, category_id)
values ('00000000-0000-0000-0000-0000000000d4', 'Dave sub', 1, 'month', now(), '00000000-0000-0000-0000-0000000000c9');
delete from public.categories where id = '00000000-0000-0000-0000-0000000000c9';
select is((select category_id from public.subscriptions where name = 'Dave sub'), null::uuid,
          'deleting a category nulls category_id instead of failing');

select * from finish();
rollback;
