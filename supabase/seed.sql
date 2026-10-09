-- Global category lookup rows (spec §5.1, Q4: global and seeded). Local + staging only.
-- Copied from prod on 2026-10-09 (same ids, so fixtures can reference them).
-- Phase 1b: Education's key fixed to `education` (same id/name/colour) and the Transport row added
-- (same fixed id as 20261009103104_constraints.sql, which inserts it on prod).
insert into public.categories (id, name, color_hex, type) values
  ('e5eb4564-e904-4886-a922-6fd4b5350c75', 'Entertainment',      '#FF5733', 'entertainment'),
  ('e51eda7a-0282-43df-8e78-e774144608ac', 'Utilities',          '#2ECC71', 'utilities'),
  ('e3e913bd-f54e-4523-a9fd-d3ac7e73777d', 'Productivity',       '#3498DB', 'productivity'),
  ('ae20f079-171d-460d-b360-ec65ee22a456', 'Education',          '#9B59B6', 'education'),
  ('65a602cb-9383-406e-b546-2c02eec775f3', 'Health and Fitness', '#FFD700', 'health_and_fitness'),
  ('7e21ee74-242a-4bd0-9c22-4fd6ec6aa8da', 'Business expenses',  '#800020', 'business'),
  ('c9a35299-a72b-4f3d-87f1-ea93cd4b1a33', 'Transport',          '#F59E0B', 'transport')
on conflict (id) do nothing;
