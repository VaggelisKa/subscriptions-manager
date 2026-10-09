-- Phase 1a (spec §4.3): the same three conditions as the guard in
-- 20261009083122_hardening.sql, re-checked on every `supabase test db` run so later
-- migrations can't reintroduce a violation.
-- Phase 1b (spec §4.3 guard v2, §14.1): private.hardening_violations() is empty, default
-- privileges grant nothing to client roles, and negative tests prove each check fires.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(28);

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

-- Default privileges for postgres in public grant nothing to client roles (tables, sequences, functions)
select is_empty($$
  select d.defaclobjtype, a.grantee::regrole
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where d.defaclrole = 'postgres'::regrole and n.nspname = 'public'
    and a.grantee in ('anon'::regrole, 'authenticated'::regrole) $$,
  'postgres default privileges in public: nothing for anon/authenticated');

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
select ok(to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)') is null
          or not has_function_privilege('anon', 'graphql_public.graphql(text,text,jsonb,jsonb)', 'EXECUTE'),
          'graphql_public.graphql not executable by anon');
select function_privs_are('private','hardening_violations', array[]::text[], 'anon', array[]::text[]);
select function_privs_are('private','assert_hardening', array[]::text[], 'authenticated', array[]::text[]);

select * from finish();
rollback;
