-- Pre-1b security hotfix (stacked on PR 55). Closes the two holes found by the Phase 1a audit:
--   1. public.categories had RLS disabled while anon/authenticated held INSERT/UPDATE/DELETE.
--   2. The subscriptions INSERT policy was WITH CHECK (true): any signed-in user could insert
--      rows under someone else's user_id.
-- Also removes every client-role privilege that RLS can't police (anon: all; authenticated:
-- TRUNCATE, REFERENCES, TRIGGER).
--
-- The CLI applies each migration file in a single transaction, so all of this lands
-- atomically (verified locally: a failure at the end leaves no partial state).
-- Policy names match spec §6.1 so 1c's drop-all loop and policies_are() tests line up.
-- `(select auth.uid())` is the same check as `auth.uid()`, evaluated once per statement
-- (fixes the auth_rls_initplan advisor warning).

-- ── categories: global, read-only for signed-in users ──
-- Policy first, then RLS, in the same transaction: there's never a moment where RLS is on
-- with no SELECT policy (which would empty the category list for live clients).
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select to authenticated using (true);
alter table public.categories enable row level security;

-- ── subscriptions: owner-only ──
-- Drop EVERY existing policy (names come from the catalog, not guesses).
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.subscriptions enable row level security;  -- already on in prod; idempotent

create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using ( (select auth.uid()) = user_id );
create policy subscriptions_insert_own on public.subscriptions
  for insert to authenticated with check ( (select auth.uid()) = user_id );
create policy subscriptions_update_own on public.subscriptions
  for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy subscriptions_delete_own on public.subscriptions
  for delete to authenticated using ( (select auth.uid()) = user_id );

-- ── privileges ──
-- anon: nothing on either table (no client reads or writes them signed out).
revoke all on public.subscriptions from anon;
revoke all on public.categories    from anon;
-- authenticated: keep SELECT/INSERT/UPDATE/DELETE (RLS restricts rows); drop what RLS can't
-- police. TRUNCATE bypasses RLS entirely. Column-level grants come in 1b (spec §5.2(d)).
revoke truncate, references, trigger on public.subscriptions from authenticated;
revoke truncate, references, trigger on public.categories    from authenticated;
