-- =====================================================================
-- WINNN — 0002_rls.sql
--
-- GOVERNING RULE: customers get SELECT policies only. There is not a
-- single INSERT/UPDATE/DELETE policy for the `authenticated` role in
-- this file. Every state change goes through a SECURITY DEFINER
-- function in 0003_functions.sql. If you find yourself wanting to add
-- a write policy here, the logic belongs in a function instead.
--
-- ticket_secrets has RLS enabled and ZERO policies — deny-all by
-- default for every role except the function owner and service_role.
-- =====================================================================

-- Admin check. SECURITY DEFINER so it does not recurse into admins' RLS.
create or replace function fn_is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from admins a where a.id = auth.uid());
$$;

-- Is this campaign visible to the public?
create or replace function fn_campaign_is_public(p_status campaign_status)
returns boolean language sql immutable as $$
  select p_status in ('LIVE','PAUSED','SALES_CLOSED','ENDED','DRAWN','COMPLETED');
$$;

alter table profiles            enable row level security;
alter table admins              enable row level security;
alter table merchants           enable row level security;
alter table campaigns           enable row level security;
alter table campaign_prizes     enable row level security;
alter table campaign_merchants  enable row level security;
alter table ticket_batches      enable row level security;
alter table tickets             enable row level security;
alter table ticket_secrets      enable row level security;
alter table wallets             enable row level security;
alter table wallet_transactions enable row level security;
alter table payments            enable row level security;
alter table payment_events      enable row level security;
alter table product_categories  enable row level security;
alter table products            enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table draws               enable row level security;
alter table draw_pool_entries   enable row level security;
alter table draw_pulls          enable row level security;
alter table draw_winners        enable row level security;
alter table notifications       enable row level security;
alter table audit_logs          enable row level security;

-- ---------------------------------------------------------------------
-- IDENTITY
-- ---------------------------------------------------------------------
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or fn_is_admin());

create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy admins_select_self on admins
  for select using (id = auth.uid());

-- ---------------------------------------------------------------------
-- PUBLIC CATALOGUE
-- ---------------------------------------------------------------------
create policy merchants_public_read on merchants
  for select using (status = 'ACTIVE' or fn_is_admin());

create policy campaigns_public_read on campaigns
  for select using (fn_campaign_is_public(status) or fn_is_admin());

create policy prizes_public_read on campaign_prizes
  for select using (exists (
    select 1 from campaigns c where c.id = campaign_id
      and (fn_campaign_is_public(c.status) or fn_is_admin())));

create policy campaign_merchants_public_read on campaign_merchants
  for select using (exists (
    select 1 from campaigns c where c.id = campaign_id
      and (fn_campaign_is_public(c.status) or fn_is_admin())));

create policy categories_public_read on product_categories
  for select using (is_active or fn_is_admin());

create policy products_public_read on products
  for select using (status = 'ACTIVE' or fn_is_admin());

-- ---------------------------------------------------------------------
-- TICKETS
-- A customer may only ever see tickets they own. UNASSIGNED offline
-- stock is invisible to everyone but the admin — this is what stops
-- serial enumeration from harvesting unclaimed vouchers.
-- ---------------------------------------------------------------------
create policy tickets_select_own on tickets
  for select using (
    (customer_id = auth.uid() and status <> 'UNASSIGNED')
    or fn_is_admin());

-- ticket_secrets: intentionally NO policy. Deny-all.

create policy ticket_batches_admin on ticket_batches
  for select using (fn_is_admin());

-- ---------------------------------------------------------------------
-- WALLET
-- ---------------------------------------------------------------------
create policy wallets_select_own on wallets
  for select using (customer_id = auth.uid() or fn_is_admin());

create policy wallet_txn_select_own on wallet_transactions
  for select using (
    exists (select 1 from wallets w
             where w.id = wallet_id
               and (w.customer_id = auth.uid() or fn_is_admin())));

create policy payments_select_own on payments
  for select using (customer_id = auth.uid() or fn_is_admin());

create policy payment_events_admin on payment_events
  for select using (fn_is_admin());

-- ---------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------
create policy orders_select_own on orders
  for select using (customer_id = auth.uid() or fn_is_admin());

create policy order_items_select_own on order_items
  for select using (
    exists (select 1 from orders o
             where o.id = order_id
               and (o.customer_id = auth.uid() or fn_is_admin())));

-- ---------------------------------------------------------------------
-- DRAWS — published results are public; the pool and pulls are not
-- ---------------------------------------------------------------------
create policy draws_public_read on draws
  for select using (status = 'PUBLISHED' or fn_is_admin());

create policy draw_winners_public_read on draw_winners
  for select using (is_published or fn_is_admin());

create policy draw_pool_admin on draw_pool_entries
  for select using (fn_is_admin());

create policy draw_pulls_admin on draw_pulls
  for select using (fn_is_admin());

-- ---------------------------------------------------------------------
-- NOTIFICATIONS / AUDIT
-- ---------------------------------------------------------------------
create policy notifications_select_own on notifications
  for select using (customer_id = auth.uid());

create policy notifications_update_own on notifications
  for update using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy audit_logs_admin on audit_logs
  for select using (fn_is_admin());
