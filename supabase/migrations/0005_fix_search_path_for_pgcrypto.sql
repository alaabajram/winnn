-- =====================================================================
-- WINNN — 0005_fix_search_path_for_pgcrypto.sql
--
-- On Supabase, pgcrypto is installed into the `extensions` schema, not
-- `public`. Functions with a pinned search_path therefore cannot see
-- gen_random_bytes() unless `extensions` is on the path. (gen_random_uuid
-- is a core builtin since PG13 and is unaffected.)
-- =====================================================================

alter function fn_generate_offline_batch(uuid, uuid, integer)
  set search_path = public, extensions, pg_temp;
alter function fn_store_checkout(jsonb, jsonb)
  set search_path = public, extensions, pg_temp;
