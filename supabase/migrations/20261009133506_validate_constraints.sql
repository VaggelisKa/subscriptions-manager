-- Validate the CHECK constraints added as NOT VALID in 20261009103104_constraints.sql.
-- Existing rows have been audited clean; the counts below stop the migration with a clear
-- message (instead of a bare check violation) if any row would fail.
do $$
declare
  bad_sub_names  int;
  bad_sub_prices int;
  bad_cat_names  int;
begin
  select count(*) into bad_sub_names  from public.subscriptions where not (char_length(btrim(name)) between 1 and 120);
  select count(*) into bad_sub_prices from public.subscriptions
    where not (price >= 0 and price < 10000000 and price = round(price, 2));
  select count(*) into bad_cat_names  from public.categories where not (char_length(name) between 1 and 40);
  if bad_sub_names + bad_sub_prices + bad_cat_names > 0 then
    raise exception 'cannot validate constraints: % subscription name(s), % subscription price(s), % category name(s) out of range',
      bad_sub_names, bad_sub_prices, bad_cat_names;
  end if;
end $$;

alter table public.subscriptions validate constraint subscriptions_name_not_blank;
alter table public.subscriptions validate constraint subscriptions_price_valid;
alter table public.categories    validate constraint categories_name_len;

select private.assert_hardening();
