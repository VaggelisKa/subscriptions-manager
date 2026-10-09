-- Phase 1a (spec §4.3): the same three conditions as the guard in
-- 20261009083122_hardening.sql, re-checked on every `supabase test db` run so later
-- migrations can't reintroduce a violation.
-- Phase 1b (spec §4.3 guard v2, §14.1): private.hardening_violations() is empty, default
-- privileges grant nothing to client roles, and negative tests prove each check fires.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(50);

-- KEEP IN SYNC: same scope predicate as the guard in
-- supabase/migrations/20261009083122_hardening.sql. Change both together.
create temporary view in_scope_ns as  -- dropped by the rollback below
select n.oid, n.nspname
from pg_namespace n
where n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      -- added after the real-image run (PR 55 review); only schemas that actually trip:
                      'net')            -- pg_net: http_get/http_post are SECURITY DEFINER + client-executable; trips (C) when pg_net is enabled
    and n.nspname not like 'supabase\_%'      escape '\'   -- supabase_functions, supabase_migrations, ...
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\';

select ok((select count(*) from in_scope_ns where nspname = 'public') = 1, 'public is in scope');
select ok((select count(*) from in_scope_ns where nspname = 'graphql_public') = 1, 'graphql_public (client-reachable) is in scope');
create schema hardening_test_new_app_schema;  -- rolled back below
select ok((select count(*) from in_scope_ns where nspname = 'hardening_test_new_app_schema') = 1, 'a newly created app schema is in scope');

select is_empty($$
  select n.nspname, c.relname
  from pg_class c join in_scope_ns n on n.oid = c.relnamespace
  where c.relkind = 'v'
    and not exists (select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o
                    where lower(btrim(split_part(o, '=', 1))) = 'security_invoker'
                      and lower(btrim(split_part(o, '=', 2))) in ('true','on','1','yes'))
$$, '(A) every view in scope has security_invoker');

select is_empty($$
  select n.nspname, c.relname
  from pg_class c join in_scope_ns n on n.oid = c.relnamespace
  where c.relkind = 'm'
    and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))
$$, '(B) no materialized view in scope is selectable by anon/authenticated');

select is_empty($$
  select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  from pg_proc p join in_scope_ns n on n.oid = p.pronamespace
  where p.prosecdef
    and (exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                 where a.grantee = 0 and a.privilege_type = 'EXECUTE')
         or has_function_privilege('anon', p.oid, 'EXECUTE')
         or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
$$, '(C) no SECURITY DEFINER function in scope is executable by PUBLIC/anon/authenticated');

-- ── Phase 1b: guard v2 ──
select is_empty($$ select * from private.hardening_violations() $$, 'no hardening violations (guard v2, checks A–E3)');

-- ── Parameterised test copy (Architect ruling on PR #58) ──
-- Production has only the zero-arg private.hardening_violations(). Tests that need a custom exclusion
-- list use pg_temp.hardening_violations_with(exclusions jsonb), generated here from the production
-- function's own definition (pg_get_functiondef), so there is no hand-maintained duplicate. It lives in
-- this session's pg_temp and disappears with the rolled-back transaction.
do $gen$
declare
  def text := pg_get_functiondef('private.hardening_violations()'::regprocedure);
  hdr constant text := 'CREATE OR REPLACE FUNCTION private.hardening_violations()';
  src constant text := 'using private.hardening_exclusions()';
  n int;
begin
  n := (length(def) - length(replace(def, src, ''))) / length(src);
  if strpos(def, hdr) <> 1 or n <> 1 then
    raise exception 'test copy generator: unexpected definition of private.hardening_violations() (header at %, % list reference(s))',
      strpos(def, hdr), n;
  end if;
  execute replace(replace(def, hdr, 'CREATE FUNCTION pg_temp.hardening_violations_with(exclusions jsonb)'),
                  src, 'using exclusions');
end $gen$;

-- Drift test: the copy, run with the constant list, returns exactly the production rows, on a
-- non-empty set (probe table with RLS off), so a logic change to one without the other fails.
create table public.__drift_probe (id int);
select ok((select count(*) from private.hardening_violations()) > 0, 'drift probe makes the compared set non-empty');
select set_eq($$ select * from pg_temp.hardening_violations_with(private.hardening_exclusions()) $$,
              $$ select * from private.hardening_violations() $$,
              'drift: test copy with the constant list = production hardening_violations()');
select ok(exists (select 1 from pg_temp.hardening_violations_with('[]'::jsonb) v where v like 'function graphql_public.graphql(%')
          and not exists (select 1 from private.hardening_violations() v where v like 'function graphql_public.graphql(%'),
          'the list is really applied: the stub appears with an empty list, not in production');
drop table public.__drift_probe;

-- ── Owner-gated exclusions (Architect ruling on PR #58) ──
-- KEEP IN SYNC: copy of private.hardening_exclusions() in
-- supabase/migrations/20261009103100_hardening_guard_v2.sql. Change both together.
select results_eq($$ select kind, object, owner, "check" from jsonb_to_recordset(private.hardening_exclusions())
                       x(kind text, object text, owner text, "check" text) order by kind, object $$,
                  $$ values ('function', 'graphql_public.graphql(text,text,jsonb,jsonb)', 'supabase_admin', 'E3'),
                            ('relation', '_realtime.extensions',        'supabase_admin', 'D'),
                            ('relation', '_realtime.feature_flags',     'supabase_admin', 'D'),
                            ('relation', '_realtime.schema_migrations', 'supabase_admin', 'D'),
                            ('relation', '_realtime.tenants',           'supabase_admin', 'D') $$,
                  'exclusion list is exactly the five owner-gated entries');

-- Owner change on the real excluded objects: the migration role can't ALTER ... OWNER on
-- supabase_admin's objects, so the changed owner is simulated by passing the same list with a different
-- expected owner (passed to the pg_temp test copy). Each object must then be reported again.
create temporary table owner_changed_list as
select jsonb_agg(e || jsonb_build_object('owner', 'postgres')) as l
from jsonb_array_elements(private.hardening_exclusions()) e;
select ok(exists (select 1 from pg_temp.hardening_violations_with((select l from owner_changed_list)) v
                  where v like 'function graphql_public.graphql(%executable by anon or PUBLIC'),
          'owner mismatch: graphql_public.graphql stub is reported again');
select ok((select count(*) from pg_temp.hardening_violations_with((select l from owner_changed_list)) v
           where v like 'table _realtime.% has row level security disabled') = 4,
          'owner mismatch: the four _realtime tables are reported again');
select is((select count(*)::int from pg_temp.hardening_violations_with((select l from owner_changed_list))), 5,
          'owner mismatch on the listed objects: exactly those 5 violations come back');

-- Real owner change, on an object the migration role owns: an entry stops applying once the owner changes.
create table hardening_test_new_app_schema.__owned (id int);           -- RLS off → (D)
create temporary table probe_list as
select private.hardening_exclusions()
       || '[{"kind": "relation", "object": "hardening_test_new_app_schema.__owned", "owner": "postgres", "check": "D"},
            {"kind": "function", "object": "hardening_test_new_app_schema.__fprobe()", "owner": "postgres", "check": "E3"}]'::jsonb as l;
select is_empty($$ select * from pg_temp.hardening_violations_with((select l from probe_list)) $$,
                'probe table excluded from (D) while owned by the listed owner');
-- a relation entry exempts (D) only: an anon grant on the same table still trips (E1)
grant select on hardening_test_new_app_schema.__owned to anon;
select ok(exists (select 1 from pg_temp.hardening_violations_with((select l from probe_list)) v
                  where v like 'relation hardening_test_new_app_schema.__owned grants privileges to anon%'),
          'relation entry does not exempt (E1)');
revoke select on hardening_test_new_app_schema.__owned from anon;
grant create, usage on schema hardening_test_new_app_schema to service_role;
alter table hardening_test_new_app_schema.__owned owner to service_role;
select ok(exists (select 1 from pg_temp.hardening_violations_with((select l from probe_list)) v
                  where v like 'table hardening_test_new_app_schema.__owned has row level security disabled%'),
          'same entry, owner changed → reported again');
drop table hardening_test_new_app_schema.__owned;

-- a function entry exempts (E3) only, and only while NOT security definer (PR #58 review)
create function hardening_test_new_app_schema.__fprobe() returns int language sql as 'select 1';
grant execute on function hardening_test_new_app_schema.__fprobe() to public;
select is_empty($$ select * from pg_temp.hardening_violations_with((select l from probe_list)) $$,
                'listed non-SECURITY-DEFINER function is exempt from (E3)');
alter function hardening_test_new_app_schema.__fprobe() security definer;
select ok(exists (select 1 from pg_temp.hardening_violations_with((select l from probe_list)) v
                  where v like 'security definer hardening_test_new_app_schema.__fprobe()%'),
          'SECURITY DEFINER flip of a listed function trips (C)');
select ok(exists (select 1 from pg_temp.hardening_violations_with((select l from probe_list)) v
                  where v like 'function hardening_test_new_app_schema.__fprobe()%executable by anon or PUBLIC'),
          'SECURITY DEFINER flip of a listed function also trips (E3)');
drop function hardening_test_new_app_schema.__fprobe();

-- New sibling objects are never covered by the list (exact identity only)
create table _realtime.__sibling (id int);                              -- same schema, RLS off
select throws_ok($$ select private.assert_hardening() $$, 'P0001', null,
                 'new table next to the excluded _realtime tables → assert_hardening() raises');
select ok(exists (select 1 from private.hardening_violations() v where v like 'table _realtime.__sibling has row level security disabled%'),
          'the _realtime sibling is reported');
drop table _realtime.__sibling;
create function public.graphql(text, text, jsonb, jsonb) returns jsonb language sql as 'select null::jsonb';
grant execute on function public.graphql(text, text, jsonb, jsonb) to public;   -- same name/signature, other schema
select throws_ok($$ select private.assert_hardening() $$, 'P0001', null,
                 'same-signature graphql() outside graphql_public → assert_hardening() raises');
drop function public.graphql(text, text, jsonb, jsonb);
select lives_ok($$ select private.assert_hardening() $$, 'clean again after dropping the probes');

-- Default privileges for postgres in public grant nothing to client roles (tables, sequences, functions)
select is_empty($$
  select d.defaclobjtype, a.grantee::regrole
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where d.defaclrole = 'postgres'::regrole and n.nspname = 'public'
    and a.grantee in ('anon'::regrole, 'authenticated'::regrole) $$,
  'postgres default privileges in public: nothing for anon/authenticated');
select is_empty($$
  select d.defaclobjtype, a.grantee::regrole
  from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
  where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0
    and a.grantee in ('anon'::regrole, 'authenticated'::regrole) $$,
  'postgres global default privileges: nothing for anon/authenticated');

-- Behavioural: new objects get no client privileges by default
create table public.__t_default(id int);
create sequence public.__s_default;
select table_privs_are('public','__t_default','anon', array[]::text[]);
select table_privs_are('public','__t_default','authenticated', array[]::text[]);
select sequence_privs_are('public','__s_default','anon', array[]::text[]);
select sequence_privs_are('public','__s_default','authenticated', array[]::text[]);

-- Negative: the guard reports each violation class (the test transaction rolls back)
select ok(exists (select 1 from private.hardening_violations() v where v like 'table public.__t_default has row level security disabled%'),
          'guard flags table without RLS (D)');
alter table public.__t_default enable row level security;
grant select (id) on public.__t_default to anon;
select ok(exists (select 1 from private.hardening_violations() v where v like 'relation public.__t_default grants privileges to anon%'),
          'guard flags column-level anon grant (E1)');
grant usage on sequence public.__s_default to anon;
select ok(exists (select 1 from private.hardening_violations() v where v like 'sequence public.__s_default%'),
          'guard flags anon sequence grant (E2)');
create view public.__v_default as select 1 as x;
select ok(exists (select 1 from private.hardening_violations() v where v like 'view public.__v_default lacks security_invoker%'),
          'guard flags view without security_invoker (A)');

-- Revision 7: global default → a function created by postgres has no PUBLIC EXECUTE
create function public.__f_new() returns int language sql as 'select 2';
select ok(not exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      where p.oid = 'public.__f_new()'::regprocedure and a.grantee = 0),
          'global default: no PUBLIC EXECUTE on new functions');
select function_privs_are('public','__f_new', array[]::text[], 'anon', array[]::text[], 'new function: anon has no EXECUTE');
select function_privs_are('public','__f_new', array[]::text[], 'authenticated', array[]::text[], 'new function: authenticated has no EXECUTE');
select is_empty($$ select 1 from pg_default_acl d, aclexplode(d.defaclacl) a
                   where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 0
                     and d.defaclobjtype = 'f' and a.grantee = 0 $$, 'global function default has no PUBLIC entry');
select ok(exists (select 1 from pg_default_acl d where d.defaclrole = 'postgres'::regrole
                  and d.defaclnamespace = 0 and d.defaclobjtype = 'f'), 'global function default is set');
grant execute on function public.__f_new() to authenticated;              -- allowed: explicit, authenticated only
select ok(not exists (select 1 from private.hardening_violations() v where v like 'function public.__f_new()%'),
          'explicit authenticated grant passes the guard');
grant execute on function public.__f_new() to public;
select ok(exists (select 1 from private.hardening_violations() v where v like 'function public.__f_new()%'),
          'guard flags explicit PUBLIC EXECUTE (E3)');
-- E3, NULL ACL (Postgres' built-in PUBLIC EXECUTE): restore the built-in default inside this
-- rolled-back transaction, so the next function is created with proacl = NULL.
-- (Spec §14.1's `__f_default` "PUBLIC execute by default" case no longer holds after file 1's global revoke.)
alter default privileges for role postgres grant execute on functions to public;
create function hardening_test_new_app_schema.__f_nullacl() returns int language sql as 'select 3';
select ok((select proacl is null from pg_proc where oid = 'hardening_test_new_app_schema.__f_nullacl()'::regprocedure)
          and exists (select 1 from private.hardening_violations() v
                      where v like 'function hardening_test_new_app_schema.__f_nullacl()%'),
          'guard flags a NULL-ACL function in a new app schema (E3)');
create function public.__f_secdef() returns int language sql security definer as 'select 4';
grant execute on function public.__f_secdef() to authenticated;
select ok(exists (select 1 from private.hardening_violations() v where v like 'security definer public.__f_secdef()%'),
          'guard flags client-executable SECURITY DEFINER function (C)');
select throws_ok($$ select private.assert_hardening() $$, 'P0001', null, 'assert_hardening() raises when violations exist');

-- Revision 7: pg_graphql gone, stub not client-executable
select is_empty($$ select 1 from pg_extension where extname = 'pg_graphql' $$, 'pg_graphql dropped');
-- (Ruling on PR #58: the platform-owned stub stays client-executable; postgres can't revoke it. It is
--  covered only by the owner-gated exclusion, and graphql_public is no longer an exposed API schema.)
select ok(to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)') is null
          or not has_function_privilege('anon', 'graphql_public.graphql(text,text,jsonb,jsonb)', 'EXECUTE')
          or (select proowner::regrole::text from pg_proc
              where oid = to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)')) = 'supabase_admin',
          'graphql_public.graphql: absent, not anon-executable, or the supabase_admin-owned stub covered by the exclusion');
select ok(to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)') is null
          or not (select prosecdef from pg_proc where oid = to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)')),
          'graphql_public.graphql stub is not SECURITY DEFINER');
select function_privs_are('private','hardening_violations', array[]::text[], 'anon', array[]::text[]);
select function_privs_are('private','hardening_exclusions', array[]::text[], 'anon', array[]::text[]);
select function_privs_are('private','assert_hardening', array[]::text[], 'authenticated', array[]::text[]);

select * from finish();
rollback;
