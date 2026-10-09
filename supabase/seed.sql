-- Global category lookup rows (spec §5.1, Q4: global and seeded). Local + staging only.
-- Copied from prod on 2026-10-09 (same ids, so fixtures can reference them).
-- Note: there is no row for the `transport` enum value, and two rows share `productivity`.
insert into public.categories (id, name, color_hex, type) values
  ('e5eb4564-e904-4886-a922-6fd4b5350c75', 'Entertainment',      '#FF5733', 'entertainment'),
  ('e51eda7a-0282-43df-8e78-e774144608ac', 'Utilities',          '#2ECC71', 'utilities'),
  ('e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'Productivity',       '#3498DB', 'productivity'),
  ('ae20f079-171d-460d-b360-ec65ee22a456', 'Education',          '#9B59B6', 'productivity'),
  ('65a602cb-9383-406e-b546-2c02eec775f3', 'Health and Fitness', '#FFD700', 'health_and_fitness'),
  ('7e21ee74-242a-4bd0-9c22-4fd6ec6aa8da', 'Business expenses',  '#800020', 'business')
on conflict (id) do nothing;
