-- Read-only prod verification for the 1b runbook (step 2), PR #58 review.
-- The guard's catalog logic (checks A–E3 of private.hardening_violations() in
-- supabase/migrations/20261009103100_hardening_guard_v2.sql) as a plain query, because the function
-- does not exist on prod before push B. NO exclusion list is applied, so every hit is shown.
-- KEEP IN SYNC with hardening_violations(); generated from it, verified locally to return exactly
-- `select * from private.hardening_violations('[]')`.
-- Expected on prod: exactly ONE row, the graphql placeholder:
--   function graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) executable by anon or PUBLIC
-- Anything else: stop and report (do not push).
begin transaction read only;
    -- (A) views without security_invoker
    select format('view %I.%I lacks security_invoker', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v' and (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\')
      and not exists (select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o
                      where lower(btrim(split_part(o,'=',1))) = 'security_invoker'
                        and lower(btrim(split_part(o,'=',2))) in ('true','on','1','yes'))
    union all
    -- (B) matviews readable by client roles
    select format('matview %I.%I is selectable by anon/authenticated', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'm' and (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\')
      and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))
    union all
    -- (C) security definer functions executable by PUBLIC/anon/authenticated
    select format('security definer %I.%I(%s) executable by public/anon/authenticated',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef and (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\')
      and (exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                   where a.grantee = 0 and a.privilege_type = 'EXECUTE')
           or has_function_privilege('anon', p.oid, 'EXECUTE')
           or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    union all
    -- (D) tables with RLS disabled
    select format('table %I.%I has row level security disabled', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p') and (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\') and not c.relrowsecurity
    union all
    -- (E1) any table/view/matview/foreign-table privilege (table- or column-level) held by anon
    select format('relation %I.%I grants privileges to anon', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p','v','m','f') and (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\')
      and (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           or has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'))
    union all
    -- (E2) any sequence privilege held by anon
    select format('sequence %I.%I grants privileges to anon', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\')
      and case when c.relkind = 'S'   -- CASE: has_sequence_privilege errors on non-sequences if evaluated first
               then has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE') end
    union all
    -- (E3) any function executable by anon, or with EXECUTE granted to PUBLIC
    --      (explicit PUBLIC entry, or a NULL proacl = built-in default PUBLIC EXECUTE)
    select format('function %I.%I(%s) executable by anon or PUBLIC',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime',
                      'extensions','graphql','vault','cron','pgsodium','pg_toast',
                      'net')  -- net: pg_net's http_get/http_post are SECURITY DEFINER + client-executable (verified, PR #55)
    and n.nspname not like 'supabase\_%'      escape '\'
    and n.nspname not like 'pg\_temp%'        escape '\'
    and n.nspname not like 'pg\_toast\_temp%' escape '\')
      and (   has_function_privilege('anon', p.oid, 'EXECUTE')
           or p.proacl is null
           or exists (select 1 from aclexplode(p.proacl) a
                      where a.grantee = 0 and a.privilege_type = 'EXECUTE'))
order by 1;
rollback;
