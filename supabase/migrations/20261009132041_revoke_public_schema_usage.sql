-- Remove the implicit USAGE that PUBLIC has on schema public.
--
-- The hosted project already has no PUBLIC USAGE on `public`; a fresh local stack still
-- carries the image default (`=U`). This aligns local resets with the hosted project.
-- Client roles keep their explicit USAGE grants from the baseline (anon, authenticated,
-- service_role, postgres), so nothing that works today stops working.
-- On the hosted project this is a no-op.
revoke usage on schema public from public;

select private.assert_hardening();
