-- =====================================================================
-- WINNN — 0004_function_grants_lockdown.sql
--
-- CRITICAL. Supabase grants EXECUTE on public-schema functions to the
-- `anon` and `authenticated` roles by default, which means a plain
-- `revoke ... from public` is NOT sufficient. Without this migration,
-- anyone holding the anon key can call fn_wallet_apply over
-- /rest/v1/rpc and credit themselves unlimited Winnn.
--
-- Revoke everything, then grant back deliberately.
-- =====================================================================

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Needed by RLS policies, which evaluate as the querying role.
grant execute on function fn_is_admin() to anon, authenticated;
grant execute on function fn_campaign_is_public(campaign_status) to anon, authenticated;

-- Customer-callable RPCs.
grant execute on function fn_redeem_offline_ticket(text, text) to authenticated;
grant execute on function fn_claim_winning_ticket(text, text)  to authenticated;
grant execute on function fn_store_checkout(jsonb, jsonb)      to authenticated;

-- Admin RPCs: signed-in only. Each re-checks membership of `admins`
-- internally via fn_require_admin(). Never granted to anon.
grant execute on function fn_generate_offline_batch(uuid, uuid, integer) to authenticated;
grant execute on function fn_admin_set_batch_status(uuid, batch_status, integer) to authenticated;
grant execute on function fn_admin_cancel_batch(uuid, text)   to authenticated;
grant execute on function fn_admin_cancel_ticket(uuid, text)  to authenticated;
grant execute on function fn_admin_adjust_wallet(uuid, bigint, text) to authenticated;
grant execute on function fn_admin_refund_order(uuid, text)   to authenticated;
grant execute on function fn_close_campaign_sales(uuid)       to authenticated;
grant execute on function fn_record_draw_pull(uuid, integer, text) to authenticated;
grant execute on function fn_confirm_draw(uuid)               to authenticated;
grant execute on function fn_publish_draw(uuid, text)         to authenticated;

-- Service-role only, deliberately ungranted:
--   fn_wallet_apply, fn_allocate_online_tickets, fn_confirm_payment,
--   fn_audit, fn_require_admin, fn_handle_new_user, fn_norm_*
-- fn_confirm_payment must NEVER be reachable from a browser.

alter function fn_block_mutation() set search_path = public, pg_temp;
alter function fn_campaign_is_public(campaign_status) set search_path = public, pg_temp;
alter function fn_norm_code(text)   set search_path = public, pg_temp;
alter function fn_norm_serial(text) set search_path = public, pg_temp;
