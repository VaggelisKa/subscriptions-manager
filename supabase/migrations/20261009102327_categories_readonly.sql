-- Follow-up to the pre-1b security hotfix (PR 56 review, non-blocking): categories are a
-- global, read-only lookup table (spec Q4), so signed-in users get SELECT only. RLS already
-- blocks writes (there's no write policy); this removes the privileges as well, so a missing
-- or mistaken policy later can't reopen writes. No client writes categories (checked in PR 56).
revoke insert, update, delete on public.categories from authenticated;
