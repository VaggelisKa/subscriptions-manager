-- Phase 1a hardening (spec §4.3). Ships even when the audit is clean, and always ends
-- with the guard, which fails `db reset` / `db push` if anything in scope is in violation.
--
-- 1a audit against prod (2026-10-09): (A) views without security_invoker: none;
-- (B) client-readable materialized views: none; (C) SECURITY DEFINER functions executable
-- by PUBLIC/anon/authenticated: none (pgbouncer.get_auth is SECURITY DEFINER but has no
-- client EXECUTE; pgbouncer is now excluded anyway as a platform schema).
-- Verified on the real local image (supabase/postgres 15.19.0.004): `supabase db reset`
-- passes the guard; with pg_net enabled, `net` would trip (C), hence its exclusion.

-- ── part 1: explicit fixes from the 1a audit (may be empty) ──
-- (none: audit (A)–(C) found no violations)

-- ── part 2: guard (always present) ──
-- KEEP IN SYNC: the scope predicate below is duplicated in supabase/tests/hardening.test.sql
-- (view in_scope_ns). Change both together. `public` (and any app schema) is always in scope.
do $$
declare
  scope constant text := $s$
    n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
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
    and n.nspname not like 'pg\_toast\_temp%' escape '\' $s$;
  violations text[] := '{}';
  r record;
begin
  for r in execute format($q$
    select format('view %%I.%%I lacks security_invoker', n.nspname, c.relname) as msg
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v' and %1$s
      and not exists (select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o
                      where lower(btrim(split_part(o,'=',1))) = 'security_invoker'
                        and lower(btrim(split_part(o,'=',2))) in ('true','on','1','yes'))
    union all
    select format('matview %%I.%%I is selectable by anon/authenticated', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'm' and %1$s
      and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))
    union all
    select format('security definer %%I.%%I(%%s) executable by public/anon/authenticated',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef and %1$s
      and (exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                   where a.grantee = 0 and a.privilege_type = 'EXECUTE')
           or has_function_privilege('anon', p.oid, 'EXECUTE')
           or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  $q$, scope)
  loop
    violations := violations || r.msg;
  end loop;

  if cardinality(violations) > 0 then
    raise exception 'hardening guard: % violation(s): %', cardinality(violations), array_to_string(violations, '; ');
  end if;
end $$;
