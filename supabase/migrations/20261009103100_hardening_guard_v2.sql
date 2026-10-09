-- Phase 1b, file 1 of 3 (spec §4.3 guard v2, §5.2 file 1; rulings rev 6–7).
-- Guard v2: one definition of the hardening checks (A)–(E3) as functions, so later
-- migrations end with `select private.assert_hardening();` and pgTAP calls the same code.
-- Scope: same as the 1a guard in 20261009083122_hardening.sql; the only extra schema exclusion is `net`.
-- Object exclusions: private.hardening_exclusions() (owner-gated, Architect ruling on PR #58).
-- KEEP IN SYNC: scope predicate also in 20261009083122_hardening.sql and supabase/tests/hardening.test.sql.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ── Guard exclusions (Architect ruling on PR #58, option (b)): the single named constant list ──
-- Each entry names ONE object by its exact identity (regclass / regprocedure text, search_path '')
-- AND the role that must own it. An entry only applies while that owner still matches, so an owner
-- change trips the guard again; anything not listed (a sibling table, an overload) is never excluded.
-- New entries need: the concrete tripping object, a comment here, and the Architect's OK (spec §4.3).
-- KEEP IN SYNC: copy of this list in supabase/tests/hardening.test.sql (asserted equal).
create or replace function private.hardening_exclusions()
returns jsonb
language sql
immutable
set search_path = ''
as $fn$
  select $list$[
    {"kind": "function", "object": "graphql_public.graphql(text,text,jsonb,jsonb)", "owner": "supabase_admin",
     "why": "platform-owned placeholder (issue_graphql_placeholder); pg_graphql not installed on prod; graphql_public removed from exposed schemas in 1b"},
    {"kind": "relation", "object": "_realtime.extensions",        "owner": "supabase_admin", "why": "local image only (Realtime tenant tables), not on prod"},
    {"kind": "relation", "object": "_realtime.feature_flags",     "owner": "supabase_admin", "why": "local image only (Realtime tenant tables), not on prod"},
    {"kind": "relation", "object": "_realtime.schema_migrations", "owner": "supabase_admin", "why": "local image only (Realtime tenant tables), not on prod"},
    {"kind": "relation", "object": "_realtime.tenants",           "owner": "supabase_admin", "why": "local image only (Realtime tenant tables), not on prod"}
  ]$list$::jsonb
$fn$;

revoke all on function private.hardening_exclusions() from public, anon, authenticated;

-- `exclusions` defaults to private.hardening_exclusions(); pgTAP passes other lists to prove the owner gate.
create or replace function private.hardening_violations(exclusions jsonb default null)
returns setof text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  -- KEEP IN SYNC with supabase/tests/hardening.test.sql and spec §4.3
  scope constant text := $s$
    n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\' $s$;
  -- exclusion predicates: exact identity AND matching owner ($1 = exclusion list)
  rel_excluded constant text := $s$
    not exists (select 1 from jsonb_to_recordset($1) x(kind text, object text, owner text)
                where x.kind = 'relation' and x.object = c.oid::regclass::text
                  and x.owner = c.relowner::regrole::text) $s$;
  fn_excluded constant text := $s$
    not exists (select 1 from jsonb_to_recordset($1) x(kind text, object text, owner text)
                where x.kind = 'function' and x.object = p.oid::regprocedure::text
                  and x.owner = p.proowner::regrole::text) $s$;
begin
  return query execute format($q$
    -- (A) views without security_invoker
    select format('view %%I.%%I lacks security_invoker', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v' and %1$s and %2$s
      and not exists (select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o
                      where lower(btrim(split_part(o,'=',1))) = 'security_invoker'
                        and lower(btrim(split_part(o,'=',2))) in ('true','on','1','yes'))
    union all
    -- (B) matviews readable by client roles
    select format('matview %%I.%%I is selectable by anon/authenticated', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'm' and %1$s and %2$s
      and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))
    union all
    -- (C) security definer functions executable by PUBLIC/anon/authenticated
    select format('security definer %%I.%%I(%%s) executable by public/anon/authenticated',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef and %1$s and %3$s
      and (exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                   where a.grantee = 0 and a.privilege_type = 'EXECUTE')
           or has_function_privilege('anon', p.oid, 'EXECUTE')
           or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    union all
    -- (D) tables with RLS disabled
    select format('table %%I.%%I has row level security disabled', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p') and %1$s and %2$s and not c.relrowsecurity
    union all
    -- (E1) any table/view/matview/foreign-table privilege (table- or column-level) held by anon
    select format('relation %%I.%%I grants privileges to anon', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p','v','m','f') and %1$s and %2$s
      and (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           or has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'))
    union all
    -- (E2) any sequence privilege held by anon
    select format('sequence %%I.%%I grants privileges to anon', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and %1$s and %2$s
      and case when c.relkind = 'S'   -- CASE: has_sequence_privilege errors on non-sequences if evaluated first
               then has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE') end
    union all
    -- (E3) any function executable by anon, or with EXECUTE granted to PUBLIC
    --      (explicit PUBLIC entry, or a NULL proacl = built-in default PUBLIC EXECUTE)
    select format('function %%I.%%I(%%s) executable by anon or PUBLIC',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where %1$s and %3$s
      and (   has_function_privilege('anon', p.oid, 'EXECUTE')
           or p.proacl is null
           or exists (select 1 from aclexplode(p.proacl) a
                      where a.grantee = 0 and a.privilege_type = 'EXECUTE'))
  $q$, scope, rel_excluded, fn_excluded) using coalesce(exclusions, private.hardening_exclusions());
end
$fn$;

revoke all on function private.hardening_violations(jsonb) from public, anon, authenticated;

create or replace function private.assert_hardening(exclusions jsonb default null)
returns void
language plpgsql
set search_path = ''
as $fn$
declare v text[];
begin
  select coalesce(array_agg(x), '{}') into v from private.hardening_violations(exclusions) as x;
  if cardinality(v) > 0 then
    raise exception 'hardening guard: % violation(s): %', cardinality(v), array_to_string(v, '; ');
  end if;
end
$fn$;

revoke all on function private.assert_hardening(jsonb) from public, anon, authenticated;

-- Global (all schemas): functions created by postgres no longer get EXECUTE for PUBLIC (ruling, revision 7).
-- The explicit-revoke rule and guard (E3) remain the backstop.
alter default privileges for role postgres revoke execute on functions from public;

-- pg_graphql off (ruling, revision 7). PRECONDITION (checked in the 1b PR):
--   rg -n -i 'graphql|/graphql/v1' apps/web apps/native apps/ng-native packages   → zero hits
drop extension if exists pg_graphql;
-- Supabase's issue_graphql_placeholder event trigger recreates graphql_public.graphql(...) as a
-- "pg_graphql extension is not enabled" stub. Try to take EXECUTE away from clients. On the Supabase image
-- the stub is owned by supabase_admin, so as postgres this is a no-op (WARNING "no privileges could be
-- revoked"); the stub is then covered by the owner-gated entry in private.hardening_exclusions()
-- (Architect ruling on PR #58). If its owner ever changes, the guard trips again.
do $$ begin
  if to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)') is not null then
    revoke all on function graphql_public.graphql(text, text, jsonb, jsonb) from public, anon, authenticated;
  end if;
end $$;

select private.assert_hardening();
