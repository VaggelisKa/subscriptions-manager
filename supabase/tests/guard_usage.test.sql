-- Guard usage rules (Architect conditions on PR #58 for the injectable exclusion list):
--  1. the guard functions live in `private` and no client role (PUBLIC/anon/authenticated) can execute them;
--  2. assert_hardening() takes no arguments, and hardening_violations (the only form that accepts a list)
--     is mentioned nowhere outside supabase/tests except at allowlisted locations (see section 2);
--  3. the default (null) form uses the constant list private.hardening_exclusions().
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(26);

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

-- ── 2. hardening_violations is mentioned ONLY at known locations (PR #58 review) ──
-- No argument parsing. Every source is normalised (/* */ and -- comments removed only OUTSIDE string
-- literals; /* */ also removed inside strings; all double quotes removed), then ANY case-insensitive
-- mention of `hardening_violations` is flagged unless the exact source is on the allowlist below.
-- Sources: every statement recorded in supabase_migrations.schema_migrations (what `db reset` /
-- `db push` applied, in the CLI's statement split) and every function body (prosrc).
-- The name inside a string (format()/EXECUTE dynamic SQL) counts as a mention. Not covered: a name
-- assembled at runtime from fragments (e.g. 'hardening_' || 'violations'); review catches that.
-- Normaliser: removes /* */ comments (nested) and -- comments OUTSIDE string literals ('…', E'…', $tag$…$tag$),
-- keeps string contents (minus /* */ and double quotes), then removes all double quotes.
create function pg_temp.guard_normalise(src text) returns text language plpgsql immutable as $n$
declare
  out text := ''; i int := 1; n int := length(coalesce(src, '')); c text; nx text;
  tag text; j int; depth int; esc boolean; seg text;
begin
  while i <= n loop
    c := substr(src, i, 1); nx := substr(src, i + 1, 1);
    if c = '-' and nx = '-' then                                   -- line comment
      j := strpos(substr(src, i), E'\n');
      if j = 0 then exit; end if;
      i := i + j - 1;                                              -- keep the newline
    elsif c = '/' and nx = '*' then                                -- block comment (nested)
      depth := 1; i := i + 2;
      while i <= n and depth > 0 loop
        if substr(src, i, 2) = '/*' then depth := depth + 1; i := i + 2;
        elsif substr(src, i, 2) = '*/' then depth := depth - 1; i := i + 2;
        else i := i + 1; end if;
      end loop;
      -- removed without a space (more conservative: joins split names)
    elsif c = '''' then                                            -- '…' or E'…'
      esc := i > 1 and lower(substr(src, i - 1, 1)) = 'e'
             and (i = 2 or substr(src, i - 2, 1) !~ '[A-Za-z0-9_$]');
      j := i + 1;
      loop
        exit when j > n;
        if esc and substr(src, j, 1) = '\' then j := j + 2;
        elsif substr(src, j, 1) = '''' and substr(src, j + 1, 1) = '''' then j := j + 2;
        elsif substr(src, j, 1) = '''' then exit;
        else j := j + 1; end if;
      end loop;
      seg := substr(src, i, j - i + 1);
      out := out || regexp_replace(seg, '/\*.*?\*/', '', 'g');
      i := j + 1;
    elsif c = '$' and (i = 1 or substr(src, i - 1, 1) !~ '[A-Za-z0-9_]')
          and substr(src, i) ~ '^\$([A-Za-z_][A-Za-z0-9_]*)?\$' then -- $tag$…$tag$
      tag := substring(substr(src, i) from '^(\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$)');
      j := strpos(substr(src, i + length(tag)), tag);
      if j = 0 then seg := substr(src, i); i := n + 1;
      else seg := substr(src, i, length(tag) + j - 1 + length(tag)); i := i + length(seg); end if;
      -- dollar-quoted bodies are usually code: normalise their inside the same way
      out := out || tag || pg_temp.guard_normalise(substr(seg, length(tag) + 1, length(seg) - 2 * length(tag))) || tag;
    else
      -- copy the run of ordinary characters up to the next possible special character in one step
      j := regexp_instr(src, '[-/''$]', i + 1);
      if j = 0 then j := n + 1; end if;
      out := out || substr(src, i, j - i); i := j;
    end if;
  end loop;
  return replace(out, '"', '');
end $n$;

-- KEEP IN SYNC: the allowlist = exact normalised sources (md5) at their exact location.
-- Migration 20261009103100 is immutable once pushed, so these hashes don't drift.
create temporary table guard_mention_allowlist (origin text, md5 text, what text);
insert into guard_mention_allowlist values
  ('migration 20261009103100', '3fae4875da8a98b00e75e7df1c4f9890', 'create function private.hardening_violations (v2 definition)'),
  ('migration 20261009103100', '94ddc3cd120abd72fae93f294eeb7e5b', 'revoke all on function private.hardening_violations(jsonb)'),
  ('migration 20261009103100', 'c4ce8395436aa7a4e9f2fa6b6ec43095', 'create function private.assert_hardening() (calls the zero-arg form)'),
  ('function private.assert_hardening()', '506fb231fe92753c53122ec8dbbe5065', 'assert_hardening() body');

create temporary view guard_sources as
select 'migration ' || m.version as origin, m.name as detail, s as raw
from supabase_migrations.schema_migrations m, unnest(m.statements) s
union all
select format('function %I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), null, p.prosrc
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  -- functions installed by an extension script (pgtap, pgcrypto, …) come from the image; skipped for
  -- speed. Any function a migration creates is covered twice: here and by its CREATE statement in the
  -- migration history above.
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid
                  and d.deptype = 'e');

-- cache of normalised sources (keyed by md5 of the raw text); sources added later (self-tests) are
-- normalised on the fly
create temporary table guard_norm_cache as
select distinct md5(raw) as k, pg_temp.guard_normalise(raw) as norm from guard_sources;

create temporary view guard_mentions as
select origin, detail, md5(x.norm) as md5, x.norm
from guard_sources g
left join guard_norm_cache c on c.k = md5(g.raw),
lateral (select coalesce(c.norm, pg_temp.guard_normalise(g.raw)) as norm) x
where x.norm ~* 'hardening_violations';

create temporary view guard_mentions_flagged as
select m.origin, m.detail, m.md5 from guard_mentions m
where not exists (select 1 from guard_mention_allowlist a where a.origin = m.origin and a.md5 = m.md5);

select ok((select count(*) from supabase_migrations.schema_migrations where version = '20261009103100') = 1,
          'migration history includes the guard v2 migration (scan has sources)');
select results_eq($$ select origin collate "C", md5 collate "C" from guard_mentions order by 1, 2 $$,
                  $$ select origin collate "C", md5 collate "C" from guard_mention_allowlist order by 1, 2 $$,
                  'every allowlisted location is present and is the only place hardening_violations is mentioned');
select is_empty($$ select * from guard_mentions_flagged $$,
                'no migration statement or function body mentions hardening_violations outside the allowlist');

-- detector self-tests (all rolled back): each evasion form is caught
insert into supabase_migrations.schema_migrations (version, name, statements) values
  ('99999999999901', 'quoted_identifier',  array[$t$select * from private."hardening_violations"('[]')$t$]),
  ('99999999999902', 'quoted_uppercase',   array[$t$select * from "private"."HARDENING_VIOLATIONS"('[]')$t$]),
  ('99999999999903', 'block_comment',      array[$t$select * from private.hardening_violations/**/('[]')$t$]),
  ('99999999999904', 'comment_in_name',    array[$t$select * from private.hardening_/* x */violations('[]')$t$]),
  ('99999999999905', 'dashdash_in_string', array[$t$select '--', private.hardening_violations('[{"why": "a -- b"}]')$t$]),
  ('99999999999906', 'block_in_strings',   array[$t$select '/*'; select private.hardening_violations('[]'); select '*/'$t$]),
  ('99999999999907', 'e_string_escape',    array[$t$select E'\'--', private.hardening_violations('[]')$t$]),
  ('99999999999908', 'allowlisted_text_wrong_version',
     array[(select s from supabase_migrations.schema_migrations m, unnest(m.statements) s
            where m.version = '20261009103100' and pg_temp.guard_normalise(s) ~* 'revoke all on function private.hardening_violations')]),
  ('99999999999909', 'allowlisted_text_plus_call',
     array[(select s from supabase_migrations.schema_migrations m, unnest(m.statements) s
            where m.version = '20261009103100' and pg_temp.guard_normalise(s) ~* 'revoke all on function private.hardening_violations')
           || $t$; select private.hardening_violations('[]')$t$]);
select set_eq($$ select detail from guard_mentions_flagged where origin like 'migration 999999999999%' $$,
              $$ values ('quoted_identifier'), ('quoted_uppercase'), ('block_comment'), ('comment_in_name'),
                        ('dashdash_in_string'), ('block_in_strings'), ('e_string_escape'),
                        ('allowlisted_text_wrong_version'), ('allowlisted_text_plus_call') $$,
              'detector: quoted, block-comment, -- inside a string, string-hidden comment, E-string, and altered/misplaced allowlisted text are all flagged');
create function public.__bad_format() returns void language plpgsql as
  $b$ begin execute format('select * from private.hardening_violations(%L)', '[]'); end $b$;
create function public.__bad_format_arg() returns void language plpgsql as
  $b$ begin execute format('select * from private.%s(%L)', 'hardening_violations', '[]'); end $b$;
create function public.__bad_jsonb_var() returns void language plpgsql as
  $b$ declare jsonb jsonb := '[]'; begin perform private.hardening_violations(jsonb); end $b$;
create function public.__bad_dollar_comment() returns void language plpgsql as
  $b$ begin execute $q$select 1 --$q$; perform private.hardening_violations('[]'); end $b$;
select ok(exists (select 1 from guard_mentions_flagged where origin = 'function public.__bad_format()'),
          'detector: name inside a format() string (dynamic SQL) is flagged');
select ok(exists (select 1 from guard_mentions_flagged where origin = 'function public.__bad_format_arg()'),
          'detector: name passed as a format() argument is flagged');
select ok(exists (select 1 from guard_mentions_flagged where origin = 'function public.__bad_jsonb_var()'),
          'detector: call with a PL/pgSQL variable named jsonb is flagged');
select ok(exists (select 1 from guard_mentions_flagged where origin = 'function public.__bad_dollar_comment()'),
          'detector: -- inside a dollar-quoted string does not hide a later call');
create or replace function private.assert_hardening() returns void language plpgsql set search_path = '' as
  $b$ begin perform private.hardening_violations('[]'); end $b$;
select ok(exists (select 1 from guard_mentions_flagged where origin = 'function private.assert_hardening()'),
          'detector: a changed assert_hardening() body is flagged (identity alone is not enough)');
select ok(not pg_temp.guard_normalise('-- hardening_violations in a comment' || E'\n' || 'select 1 /* hardening_violations */')
              ~* 'hardening_violations',
          'comments outside strings are not mentions');

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
