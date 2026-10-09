-- Guard usage rules (Architect conditions on PR #58 for the injectable exclusion list):
--  1. the guard functions live in `private` and no client role (PUBLIC/anon/authenticated) can execute them;
--  2. assert_hardening() takes no arguments; migrations (and any function body) call only the zero-arg
--     form of hardening_violations() too: a non-null `exclusions` argument
--     is allowed in supabase/tests only. Scanned sources: every statement recorded in
--     supabase_migrations.schema_migrations (what `db reset` / `db push` applied) and every function body;
--  3. the default (null) form uses the constant list private.hardening_exclusions().
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(22);

-- ── 1. privileges ──
select ok(not has_schema_privilege('anon', 'private', 'USAGE')
          and not has_schema_privilege('authenticated', 'private', 'USAGE')
          and not has_schema_privilege('public', 'private', 'USAGE'), 'schema private: no USAGE for PUBLIC/anon/authenticated');
select ok(not has_function_privilege('public',        'private.hardening_violations(jsonb)', 'EXECUTE'), 'hardening_violations: PUBLIC cannot execute');
select ok(not has_function_privilege('anon',          'private.hardening_violations(jsonb)', 'EXECUTE'), 'hardening_violations: anon cannot execute');
select ok(not has_function_privilege('authenticated', 'private.hardening_violations(jsonb)', 'EXECUTE'), 'hardening_violations: authenticated cannot execute');
select ok(not has_function_privilege('public',        'private.assert_hardening()', 'EXECUTE'), 'assert_hardening: PUBLIC cannot execute');
select is_empty($$ select 1 from pg_proc where proname = 'assert_hardening' and pronamespace = 'private'::regnamespace and pronargs > 0 $$,
                'assert_hardening has only the zero-arg form');
select ok(not has_function_privilege('anon',          'private.assert_hardening()', 'EXECUTE'), 'assert_hardening: anon cannot execute');
select ok(not has_function_privilege('authenticated', 'private.assert_hardening()', 'EXECUTE'), 'assert_hardening: authenticated cannot execute');
select ok(not has_function_privilege('public',        'private.hardening_exclusions()', 'EXECUTE'), 'hardening_exclusions: PUBLIC cannot execute');
select ok(not has_function_privilege('anon',          'private.hardening_exclusions()', 'EXECUTE'), 'hardening_exclusions: anon cannot execute');
select ok(not has_function_privilege('authenticated', 'private.hardening_exclusions()', 'EXECUTE'), 'hardening_exclusions: authenticated cannot execute');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
  where p.oid in ('private.hardening_violations(jsonb)'::regprocedure, 'private.assert_hardening()'::regprocedure,
                  'private.hardening_exclusions()'::regprocedure)
    and (p.proacl is null                                   -- NULL ACL = built-in PUBLIC EXECUTE
         or exists (select 1 from aclexplode(p.proacl) a
                    where a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole))) $$,
  'guard functions: explicit ACL with no PUBLIC/anon/authenticated entry');

-- ── 2. zero-arg form only outside supabase/tests ──
create temporary view guard_calls as
with src as (
  select 'migration ' || m.version || '_' || coalesce(m.name, '') as origin,
         regexp_replace(s, '--[^\n]*', '', 'g') as body             -- comments are not calls
  from supabase_migrations.schema_migrations m, unnest(m.statements) s
  union all
  select format('function %I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), p.prosrc
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
)
select src.origin, src.body, lower(x[1]) as fn, btrim(x[2]) as args
from src, regexp_matches(src.body, '(hardening_violations|assert_hardening)\s*\(([^)]*)\)', 'gi') x;

create temporary view guard_calls_with_exclusions as
select origin, fn, args from guard_calls
where lower(args) not in ('', 'null', 'jsonb')                    -- zero-arg, explicit null, signature in GRANT/REVOKE
  and lower(args) !~ '^exclusions\s+jsonb';                        -- the parameter declaration itself

select ok((select count(*) from supabase_migrations.schema_migrations where version = '20261009103100') = 1,
          'migration history includes the guard v2 migration (scan has sources)');
select ok((select count(*) from guard_calls where origin like 'migration %' and fn = 'assert_hardening' and args = '') >= 3,
          'scan finds the zero-arg assert_hardening() calls in the 1b migrations');
select is_empty($$ select * from guard_calls_with_exclusions $$,
                'no migration or function body passes a non-null exclusions argument');

-- the detector really fires (all rolled back)
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('99999999999999', 'bad_guard_call', array['select private.assert_hardening(''[]''::jsonb)']);
select ok(exists (select 1 from guard_calls_with_exclusions where origin = 'migration 99999999999999_bad_guard_call'),
          'detector: migration passing a list to assert_hardening is flagged');
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('99999999999998', 'bad_guard_call_2',
        array['select * from private.hardening_violations( (select private.hardening_exclusions()) )']);
select ok(exists (select 1 from guard_calls_with_exclusions where origin = 'migration 99999999999998_bad_guard_call_2'),
          'detector: migration passing a subquery to hardening_violations is flagged');
create function public.__bad_guard_call() returns void language plpgsql as
  $b$ begin perform private.assert_hardening('[]'); end $b$;
select ok(exists (select 1 from guard_calls_with_exclusions where origin = 'function public.__bad_guard_call()'),
          'detector: function body passing a list is flagged');
drop function public.__bad_guard_call();

-- ── 3. default (null) form = the constant list ──
create table public.__probe_default (id int);   -- RLS off → (D) violation, so the compared sets are non-empty
select set_eq($$ select * from private.hardening_violations() $$,
              $$ select * from private.hardening_violations(private.hardening_exclusions()) $$,
              'hardening_violations() = hardening_violations(hardening_exclusions())');
select set_eq($$ select * from private.hardening_violations(null) $$,
              $$ select * from private.hardening_violations(private.hardening_exclusions()) $$,
              'hardening_violations(null) = hardening_violations(hardening_exclusions())');
select ok(exists (select 1 from private.hardening_violations('[]'::jsonb) v where v like 'function graphql_public.graphql(%')
          and not exists (select 1 from private.hardening_violations() v where v like 'function graphql_public.graphql(%'),
          'default form applies the list: the stub is reported with an empty list but not by default');
select ok(exists (select 1 from private.hardening_violations() v where v like 'table public.__probe_default%'),
          'default form still reports unlisted objects');
drop table public.__probe_default;

select * from finish();
rollback;
