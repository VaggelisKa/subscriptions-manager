-- Schema public: PUBLIC has no USAGE (matches the hosted project); the client roles keep
-- their explicit USAGE grants so the API keeps working.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(5);

select ok(not has_schema_privilege('public', 'public', 'USAGE'), 'schema public: no USAGE for PUBLIC');
select ok(not exists (
  select 1 from pg_namespace n, aclexplode(n.nspacl) a
  where n.nspname = 'public' and a.grantee = 0
), 'schema public: no ACL entry for PUBLIC');
select ok(has_schema_privilege('anon', 'public', 'USAGE'), 'schema public: anon keeps USAGE');
select ok(has_schema_privilege('authenticated', 'public', 'USAGE'), 'schema public: authenticated keeps USAGE');
select ok(has_schema_privilege('service_role', 'public', 'USAGE'), 'schema public: service_role keeps USAGE');

select * from finish();
rollback;
