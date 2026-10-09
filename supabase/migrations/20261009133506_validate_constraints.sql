-- Validate the CHECK constraints added as NOT VALID in 20261009103104_constraints.sql.
-- Existing rows have been audited clean. The precondition counts the rows that would fail each
-- constraint, using the constraint's own expression from the catalog (`conbin`) (so it can't drift from the
-- CHECK), and stops with a readable message instead of a bare check violation.
do $$
declare
  r       record;
  found   int := 0;
  bad     bigint;
  report  text := '';
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, pg_get_expr(c.conbin, c.conrelid) as expr
    from pg_constraint c
    where (c.conrelid, c.conname) in (('public.subscriptions'::regclass, 'subscriptions_name_not_blank'),
                                      ('public.subscriptions'::regclass, 'subscriptions_price_valid'),
                                      ('public.categories'::regclass,    'categories_name_len'))
      and c.contype = 'c'
    order by 1, 2
  loop
    found := found + 1;
    -- A CHECK passes when its expression is true or NULL, so only `false` counts as a failure.
    execute format('select count(*) from %s where (%s) is false', r.tbl, r.expr) into bad;
    if bad > 0 then
      report := report || format(' %s.%s: %s row(s);', r.tbl, r.conname, bad);
    end if;
  end loop;
  if found <> 3 then
    raise exception 'cannot validate constraints: expected CHECK constraints subscriptions_name_not_blank, subscriptions_price_valid and categories_name_len, found %', found;
  end if;
  if report <> '' then
    raise exception 'cannot validate constraints, rows out of range:%', report;
  end if;
end $$;

-- check (char_length(btrim(name)) between 1 and 120)
alter table public.subscriptions validate constraint subscriptions_name_not_blank;
-- check (price >= 0 and price < 10000000 and price = round(price, 2))
alter table public.subscriptions validate constraint subscriptions_price_valid;
-- check (char_length(name) between 1 and 40)
alter table public.categories    validate constraint categories_name_len;

select private.assert_hardening();
