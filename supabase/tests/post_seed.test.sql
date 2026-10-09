-- Post-seed checks (Architect ruling on PR #58). Migration 20261009103104_constraints.sql skips its
-- category-row preconditions when `categories` is empty (fresh DB: seed.sql runs after migrations),
-- so `supabase test db` runs them here once against the seeded rows, together with the guard.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(9);

select ok((select count(*) from public.categories) > 0, 'seed has run (categories not empty)');
select is_empty($$ select * from private.hardening_violations() $$, 'guard: no violations after seed');
select lives_ok($$ select private.assert_hardening() $$, 'assert_hardening() passes after seed');

-- KEEP IN SYNC: verbatim copy of precondition (0) in supabase/migrations/20261009103104_constraints.sql,
-- here always taking the non-empty branch.
select lives_ok($pre$
do $$ begin
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
$pre$, '1b preconditions hold on the seeded rows');

-- the precondition really looks at rows: break one and it must fail
update public.categories set type = 'productivity' where id = '65a602cb-9383-406e-b546-2c02eec775f3';
select throws_ok($pre$
do $$ begin
  if exists (select 1 from public.categories where type = 'productivity'
               and id not in ('e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'ae20f079-171d-460d-b360-ec65ee22a456')) then
    raise exception '1b precondition: Productivity/Education rows differ from the 1a audit; re-run the audit';
  end if;
end $$;
$pre$, 'P0001', null, 'precondition trips on an extra productivity row');
update public.categories set type = 'health_and_fitness' where id = '65a602cb-9383-406e-b546-2c02eec775f3';

-- post-1b category state on the seeded rows
select is((select type::text from public.categories where id = 'ae20f079-171d-460d-b360-ec65ee22a456'), 'education', 'seeded Education has the fixed key');
select is((select count(*)::int from public.categories where type = 'transport'), 1, 'exactly one Transport row');
select is((select count(distinct lower(name))::int from public.categories), (select count(*)::int from public.categories),
          'category names unique case-insensitively');
select is_empty($$ select 1 from public.categories where color_hex !~ '^#[0-9A-Fa-f]{6}$' or name is null
                   or char_length(name) not between 1 and 40 $$, 'seeded rows satisfy the new category constraints');

select * from finish();
rollback;
