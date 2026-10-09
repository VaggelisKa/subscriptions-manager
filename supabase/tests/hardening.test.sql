-- Phase 1a (spec §4.3): the same three conditions as the guard in
-- 20261009083122_hardening.sql, re-checked on every `supabase test db` run so later
-- migrations can't reintroduce a violation.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(4);

-- KEEP IN SYNC: same scope predicate as the guard in
-- supabase/migrations/20261009083122_hardening.sql. Change both together.
create temporary view in_scope_ns as  -- dropped by the rollback below
select n.oid, n.nspname
from pg_namespace n
where n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      -- platform schemas added after the real-image run (PR 55 review):
                      'net',            -- pg_net: http_get/http_post are SECURITY DEFINER + client-executable; trips (C) when pg_net is enabled
                      'pgmq',           -- Supabase Queues extension internals (app-facing wrappers live in pgmq_public, which stays in scope)
                      '_realtime',      -- Realtime service's own schema (local image)
                      '_analytics',     -- Logflare/analytics service schema (local image with analytics on)
                      'pgsodium_masks', -- pgsodium-managed masking views (present on prod)
                      'pgbouncer',      -- pooler auth: get_auth() is SECURITY DEFINER, platform-owned
                      'graphql_public') -- pg_graphql entry point, platform-owned
    and n.nspname not like 'supabase\_%'      escape '\'   -- supabase_functions, supabase_migrations, ...
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\';

select ok((select count(*) from in_scope_ns where nspname = 'public') = 1, 'public is in scope');

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

select * from finish();
rollback;
