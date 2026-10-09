-- Baseline of the prod `public` schema (project ktjftjohrpyjvvlezeki, Postgres 15.14),
-- captured 2026-10-09.
--
-- HOW THIS FILE WAS PRODUCED: `supabase db dump --schema public` could not run on the
-- machine that prepared Phase 1a (no Docker, no DB password). Per the architect's
-- ruling it was reconstructed by hand from read-only catalog queries
-- (pg_class, pg_attribute, pg_attrdef, pg_constraint, pg_indexes, pg_proc, pg_trigger,
-- pg_policies, pg_publication_tables, pg_extension, pg_namespace/pg_class ACLs,
-- pg_default_acl), laid out in `supabase db dump` (pg_dump) style.
-- Formatting aligned with a real `supabase db dump --local --schema public` of a database
-- reset from this file (CLI 2.120, supabase/postgres 15.19). Still to be diffed against a
-- real dump of PROD before the one-time `migration repair` (spec §4.4). Do not edit to fix
-- things; fixes go in later migrations.
--
-- Catalog facts with no DDL here (all empty in prod's public schema): functions,
-- procedures, triggers, views, materialized views, sequences, rules, comments.
-- Extensions in use (platform-managed, created outside `public`, not part of this dump):
--   pg_cron 1.6.4 (pg_catalog, no jobs), pg_stat_statements 1.10, pgcrypto 1.3,
--   pgjwt 0.2.0, uuid-ossp 1.1 (extensions), pgsodium 3.1.8, supabase_vault 0.3.1, plpgsql.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


CREATE TYPE "public"."interval" AS ENUM (
    'week',
    'month',
    'year'
);


ALTER TYPE "public"."interval" OWNER TO "postgres";


CREATE TYPE "public"."interval_enum" AS ENUM (
    'week',
    'month',
    'year'
);


ALTER TYPE "public"."interval_enum" OWNER TO "postgres";


CREATE TYPE "public"."subscription_category" AS ENUM (
    'entertainment',
    'utilities',
    'productivity',
    'health_and_fitness',
    'transport',
    'business'
);


ALTER TYPE "public"."subscription_category" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "name" character varying,
    "color_hex" character varying NOT NULL,
    "type" "public"."subscription_category" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "categories_color_hex_check" CHECK ((("color_hex")::"text" ~ '^#([0-9A-Fa-f]{6})$'::"text"))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billed_at" timestamp with time zone NOT NULL,
    "price" numeric NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "user_id" "uuid" NOT NULL,
    "interval" "public"."interval_enum" DEFAULT 'month'::"public"."interval_enum" NOT NULL,
    "category_id" "uuid"
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Authenticated users should delete their subscriptions" ON "public"."subscriptions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Only Authenticated users should view their subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Only authenticated users should be able to add a subscription" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users should be allowed to update their subscriptions only" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


-- NOT emitted by `supabase db dump --schema public` (pg_dump skips publication membership
-- when only a schema is dumped), but present on prod and needed by Realtime. Kept on purpose.
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."categories";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."subscriptions";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";



-- Prod also has the same three default-privilege sets FOR ROLE "supabase_admin"
-- (platform-managed, pre-created on every project; omitted because the migration role
-- can't alter another role's default privileges).

