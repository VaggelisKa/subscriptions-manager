-- Guard function rules (Architect's final ruling on PR #58):
--  1. the guard functions live in `private` (not an exposed API schema) and no client role
--     (PUBLIC/anon/authenticated) can execute them;
--  2. hardening_violations() and assert_hardening() exist only in their zero-arg form: the exclusion list
--     is the internal constant private.hardening_exclusions(); no overload takes a list. (Tests that need
--     a custom list generate a pg_temp copy inside their own transaction: hardening.test.sql.)
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(13);

-- ── 1. privileges ──
select ok(not has_schema_privilege('anon', 'private', 'USAGE')
          and not has_schema_privilege('authenticated', 'private', 'USAGE')
          and not has_schema_privilege('public', 'private', 'USAGE'), 'schema private: no USAGE for PUBLIC/anon/authenticated');
select ok(not has_function_privilege('public',        'private.hardening_violations()', 'EXECUTE'), 'hardening_violations: PUBLIC cannot execute');
select ok(not has_function_privilege('anon',          'private.hardening_violations()', 'EXECUTE'), 'hardening_violations: anon cannot execute');
select ok(not has_function_privilege('authenticated', 'private.hardening_violations()', 'EXECUTE'), 'hardening_violations: authenticated cannot execute');
select ok(not has_function_privilege('public',        'private.assert_hardening()', 'EXECUTE'), 'assert_hardening: PUBLIC cannot execute');
select ok(not has_function_privilege('anon',          'private.assert_hardening()', 'EXECUTE'), 'assert_hardening: anon cannot execute');
select ok(not has_function_privilege('authenticated', 'private.assert_hardening()', 'EXECUTE'), 'assert_hardening: authenticated cannot execute');
select ok(not has_function_privilege('public',        'private.hardening_exclusions()', 'EXECUTE'), 'hardening_exclusions: PUBLIC cannot execute');
select ok(not has_function_privilege('anon',          'private.hardening_exclusions()', 'EXECUTE'), 'hardening_exclusions: anon cannot execute');
select ok(not has_function_privilege('authenticated', 'private.hardening_exclusions()', 'EXECUTE'), 'hardening_exclusions: authenticated cannot execute');
select is_empty($$
  select p.oid::regprocedure from pg_proc p
  where p.oid in ('private.hardening_violations()'::regprocedure, 'private.assert_hardening()'::regprocedure,
                  'private.hardening_exclusions()'::regprocedure)
    and (p.proacl is null                                   -- NULL ACL = built-in PUBLIC EXECUTE
         or exists (select 1 from aclexplode(p.proacl) a
                    where a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole))) $$,
  'guard functions: explicit ACL with no PUBLIC/anon/authenticated entry');

-- ── 2. zero-arg only, no list-taking variant ──
select is_empty($$ select p.oid::regprocedure from pg_proc p
                   where p.pronamespace = 'private'::regnamespace
                     and p.proname in ('hardening_violations', 'assert_hardening', 'hardening_exclusions')
                     and p.pronargs > 0 $$,
                'no variant with arguments exists for hardening_violations / assert_hardening / hardening_exclusions');
select is((select count(*)::int from pg_proc p
           where p.pronamespace = 'private'::regnamespace
             and p.proname in ('hardening_violations', 'assert_hardening', 'hardening_exclusions')), 3,
          'exactly the three zero-arg guard functions exist');

select * from finish();
rollback;
