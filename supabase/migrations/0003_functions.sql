-- =====================================================================
-- WINNN — 0003_functions.sql
--
-- All state changes live here. Every function is SECURITY DEFINER with
-- a locked search_path, so it bypasses RLS deliberately and is the only
-- sanctioned write path.
--
-- Errors are raised as ERR_* strings; the app maps them to user copy.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------
create or replace function fn_require_admin() returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  select id into v_id from admins where id = auth.uid();
  if v_id is null then raise exception 'ERR_NOT_AUTHORIZED'; end if;
  return v_id;
end $$;

create or replace function fn_audit(
  p_admin uuid, p_action text, p_module text,
  p_entity text default null, p_entity_id uuid default null,
  p_description text default null, p_meta jsonb default null)
returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into audit_logs(admin_id, action, module, entity, entity_id, description, meta)
  values (p_admin, p_action, p_module, p_entity, p_entity_id, p_description, p_meta);
$$;

-- normalise a scanned/typed secret code: strip everything non-alphanumeric
create or replace function fn_norm_code(p_code text) returns text
language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function fn_norm_serial(p_serial text) returns text
language sql immutable as $$
  select upper(trim(coalesce(p_serial,'')));
$$;

-- ---------------------------------------------------------------------
-- NEW USER BOOTSTRAP
-- ---------------------------------------------------------------------
create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles(id, email, mobile, full_name)
  values (new.id, new.email, new.phone,
          coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  insert into wallets(customer_id) values (new.id) on conflict (customer_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();

-- ---------------------------------------------------------------------
-- WALLET LEDGER
-- The ONLY way the balance may change. Takes a row lock, writes the
-- ledger entry and the projected balance in the same transaction.
-- ---------------------------------------------------------------------
create or replace function fn_wallet_apply(
  p_customer_id     uuid,
  p_type            wallet_txn_type,
  p_amount_cents    bigint,          -- signed
  p_reference_type  text default null,
  p_reference_id    uuid default null,
  p_description     text default null,
  p_created_by      uuid default null,
  p_allow_negative  boolean default false)
returns wallet_transactions
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_wallet wallets; v_new bigint; v_txn wallet_transactions;
begin
  if p_amount_cents = 0 then raise exception 'ERR_ZERO_AMOUNT'; end if;

  insert into wallets(customer_id) values (p_customer_id)
    on conflict (customer_id) do nothing;
  select * into v_wallet from wallets where customer_id = p_customer_id for update;

  v_new := v_wallet.balance_cents + p_amount_cents;
  if v_new < 0 and not p_allow_negative then
    raise exception 'ERR_INSUFFICIENT_CREDITS';
  end if;

  update wallets set balance_cents = v_new, updated_at = now() where id = v_wallet.id;

  insert into wallet_transactions(
    wallet_id, type, amount_cents, balance_after_cents,
    reference_type, reference_id, description, created_by)
  values (v_wallet.id, p_type, p_amount_cents, v_new,
          p_reference_type, p_reference_id, p_description, p_created_by)
  returning * into v_txn;

  return v_txn;
end $$;

-- ---------------------------------------------------------------------
-- ONLINE TICKET ALLOCATION  (internal — called by fn_confirm_payment)
-- ---------------------------------------------------------------------
create or replace function fn_allocate_online_tickets(
  p_campaign_id uuid, p_customer_id uuid, p_count integer,
  p_payment_id uuid, p_wallet_txn_id uuid)
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_c campaigns; v_start bigint; v_n integer;
begin
  if p_count <= 0 then return 0; end if;

  select * into v_c from campaigns where id = p_campaign_id for update;
  if not found then raise exception 'ERR_CAMPAIGN_NOT_FOUND'; end if;
  if v_c.status <> 'LIVE' then raise exception 'ERR_CAMPAIGN_NOT_LIVE'; end if;
  if v_c.sales_close_at is not null and now() >= v_c.sales_close_at then
    raise exception 'ERR_SALES_CLOSED';
  end if;
  if v_c.type = 'OFFLINE' then raise exception 'ERR_CAMPAIGN_NOT_ONLINE'; end if;

  if v_c.max_tickets_total is not null then
    select count(*) into v_n from tickets
      where campaign_id = p_campaign_id and status <> 'CANCELLED';
    if v_n + p_count > v_c.max_tickets_total then
      raise exception 'ERR_CAMPAIGN_TICKET_CAP';
    end if;
  end if;

  if v_c.max_online_per_customer is not null then
    select count(*) into v_n from tickets
      where campaign_id = p_campaign_id and customer_id = p_customer_id
        and source = 'ONLINE' and status <> 'CANCELLED';
    if v_n + p_count > v_c.max_online_per_customer then
      raise exception 'ERR_CUSTOMER_TICKET_CAP';
    end if;
  end if;

  v_start := v_c.online_serial_next;

  insert into tickets(campaign_id, serial_no, serial, source, status,
                      customer_id, payment_id, wallet_transaction_id, redeemed_at)
  select p_campaign_id,
         v_start + g,
         v_c.serial_prefix || '-' || lpad((v_start + g)::text, 6, '0'),
         'ONLINE', 'ELIGIBLE',
         p_customer_id, p_payment_id, p_wallet_txn_id, now()
  from generate_series(0, p_count - 1) g;

  update campaigns set online_serial_next = v_start + p_count
   where id = p_campaign_id;

  return p_count;
end $$;

-- ---------------------------------------------------------------------
-- PAYMENT CONFIRMATION  (webhook / reconciliation entry point)
-- Idempotent twice over: the payment_events unique index and the
-- payment status check.
-- ---------------------------------------------------------------------
create or replace function fn_confirm_payment(
  p_provider text, p_provider_ref text,
  p_provider_event_id text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_p payments; v_txn wallet_transactions; v_rows integer; v_tickets integer := 0;
begin
  select * into v_p from payments
    where provider = p_provider and provider_ref = p_provider_ref
    for update;
  if not found then raise exception 'ERR_PAYMENT_NOT_FOUND'; end if;

  insert into payment_events(payment_id, provider, provider_event_id, payload)
  values (v_p.id, p_provider, p_provider_event_id, p_payload)
  on conflict (provider, provider_event_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('status','duplicate_event','payment_id',v_p.id);
  end if;

  if v_p.status = 'CONFIRMED' then
    return jsonb_build_object('status','already_confirmed','payment_id',v_p.id);
  end if;
  if v_p.status in ('FAILED','EXPIRED','REVERSED') then
    raise exception 'ERR_PAYMENT_NOT_PENDING';
  end if;

  update payments set status = 'CONFIRMED', confirmed_at = now() where id = v_p.id;

  v_txn := fn_wallet_apply(
    v_p.customer_id, 'TOP_UP', v_p.winnn_cents,
    'payment', v_p.id, 'Wallet top-up');

  if v_p.campaign_id is not null and v_p.ticket_count > 0 then
    v_tickets := fn_allocate_online_tickets(
      v_p.campaign_id, v_p.customer_id, v_p.ticket_count, v_p.id, v_txn.id);
  end if;

  return jsonb_build_object(
    'status','confirmed', 'payment_id', v_p.id,
    'winnn_cents', v_p.winnn_cents, 'tickets_created', v_tickets,
    'wallet_transaction_id', v_txn.id);
end $$;

-- ---------------------------------------------------------------------
-- OFFLINE BATCH GENERATION  (admin)
-- Allocates a contiguous serial block and a cryptographic secret per
-- ticket. The secret is what redeems; the serial is public.
-- ---------------------------------------------------------------------
create or replace function fn_generate_offline_batch(
  p_campaign_id uuid, p_merchant_id uuid, p_quantity integer)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_c campaigns; v_from bigint; v_to bigint; v_batch ticket_batches;
begin
  v_admin := fn_require_admin();
  if p_quantity <= 0 then raise exception 'ERR_INVALID_QUANTITY'; end if;

  select * into v_c from campaigns where id = p_campaign_id for update;
  if not found then raise exception 'ERR_CAMPAIGN_NOT_FOUND'; end if;
  if v_c.type = 'ONLINE' then raise exception 'ERR_CAMPAIGN_NOT_OFFLINE'; end if;

  v_from := v_c.offline_serial_next;
  v_to   := v_from + p_quantity - 1;
  if v_to > v_c.offline_serial_end then
    raise exception 'ERR_OFFLINE_SERIAL_BLOCK_EXHAUSTED';
  end if;

  insert into ticket_batches(campaign_id, merchant_id, quantity,
                             serial_from, serial_to, created_by)
  values (p_campaign_id, p_merchant_id, p_quantity, v_from, v_to, v_admin)
  returning * into v_batch;

  insert into tickets(campaign_id, batch_id, merchant_id, serial_no, serial,
                      source, status)
  select p_campaign_id, v_batch.id, p_merchant_id, s,
         v_c.serial_prefix || '-' || lpad(s::text, 6, '0'),
         'OFFLINE', 'UNASSIGNED'
  from generate_series(v_from, v_to) s;

  insert into ticket_secrets(ticket_id, code)
  select id, upper(encode(gen_random_bytes(8), 'hex'))
  from tickets where batch_id = v_batch.id;

  update campaigns set offline_serial_next = v_to + 1 where id = p_campaign_id;

  perform fn_audit(v_admin, 'VOUCHER_BATCH_GENERATED', 'VOUCHERS',
                   'ticket_batch', v_batch.id,
                   format('Generated %s offline tickets (%s..%s)',
                          p_quantity, v_from, v_to));

  return jsonb_build_object('batch_id', v_batch.id, 'quantity', p_quantity,
                            'serial_from', v_from, 'serial_to', v_to);
end $$;

-- ---------------------------------------------------------------------
-- OFFLINE REDEMPTION  (customer scans QR or types the code)
-- ---------------------------------------------------------------------
create or replace function fn_redeem_offline_ticket(p_serial text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid; v_t tickets; v_c campaigns; v_n integer; v_m text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'ERR_NOT_AUTHENTICATED'; end if;

  select t.* into v_t
    from tickets t
    join ticket_secrets s on s.ticket_id = t.id
   where t.serial = fn_norm_serial(p_serial)
     and s.code   = fn_norm_code(p_code)
   for update of t;

  -- deliberately generic: never reveal whether the serial exists
  if not found then raise exception 'ERR_INVALID_TICKET'; end if;

  if v_t.status = 'CANCELLED' then raise exception 'ERR_TICKET_CANCELLED'; end if;
  if v_t.status = 'EXPIRED'   then raise exception 'ERR_TICKET_EXPIRED';   end if;
  if v_t.status <> 'UNASSIGNED' then raise exception 'ERR_TICKET_ALREADY_REDEEMED'; end if;

  select * into v_c from campaigns where id = v_t.campaign_id;
  if v_c.status not in ('LIVE','PAUSED') then raise exception 'ERR_CAMPAIGN_NOT_LIVE'; end if;
  if v_c.sales_close_at is not null and now() >= v_c.sales_close_at then
    raise exception 'ERR_SALES_CLOSED';
  end if;

  if v_c.max_offline_per_customer is not null then
    select count(*) into v_n from tickets
      where campaign_id = v_t.campaign_id and customer_id = v_uid
        and source = 'OFFLINE' and status <> 'CANCELLED';
    if v_n + 1 > v_c.max_offline_per_customer then
      raise exception 'ERR_CUSTOMER_TICKET_CAP';
    end if;
  end if;

  update tickets
     set customer_id = v_uid, status = 'ELIGIBLE', redeemed_at = now()
   where id = v_t.id;

  select name into v_m from merchants where id = v_t.merchant_id;

  return jsonb_build_object(
    'ticket_id', v_t.id, 'serial', v_t.serial, 'source', 'OFFLINE',
    'campaign_id', v_c.id, 'campaign_name', v_c.name,
    'merchant', v_m, 'status', 'ELIGIBLE', 'draw_date', v_c.draw_date);
end $$;

-- ---------------------------------------------------------------------
-- STORE CHECKOUT
-- Server recomputes price and total from the products table. Client
-- totals are ignored entirely.
-- ---------------------------------------------------------------------
create or replace function fn_store_checkout(
  p_items jsonb, p_shipping jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid; v_item jsonb; v_pid uuid; v_qty integer;
  v_prod products; v_total bigint := 0; v_order orders; v_txn wallet_transactions;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'ERR_NOT_AUTHENTICATED'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'ERR_EMPTY_CART';
  end if;

  -- deterministic lock order prevents deadlocks between concurrent carts
  perform id from products
   where id in (select (i->>'product_id')::uuid from jsonb_array_elements(p_items) i)
   order by id
   for update;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'ERR_INVALID_QUANTITY'; end if;

    select * into v_prod from products where id = v_pid;
    if not found then raise exception 'ERR_PRODUCT_NOT_FOUND'; end if;
    if v_prod.status <> 'ACTIVE' then raise exception 'ERR_PRODUCT_UNAVAILABLE'; end if;
    if v_prod.stock < v_qty then raise exception 'ERR_OUT_OF_STOCK'; end if;

    v_total := v_total + (v_prod.price_cents * v_qty);
  end loop;

  -- debit first: this raises ERR_INSUFFICIENT_CREDITS before any stock moves
  v_txn := fn_wallet_apply(v_uid, 'PURCHASE', -v_total, 'order', null, 'Store purchase');

  insert into orders(order_no, customer_id, total_cents, status, shipping,
                     wallet_transaction_id)
  values ('ORD-' || to_char(now(),'YYMMDD') || '-' ||
          upper(encode(gen_random_bytes(3),'hex')),
          v_uid, v_total, 'CONFIRMED', p_shipping, v_txn.id)
  returning * into v_order;

  insert into order_items(order_id, product_id, name_snapshot,
                          unit_price_cents, quantity, line_total_cents)
  select v_order.id, p.id, p.name, p.price_cents, c.qty, p.price_cents * c.qty
    from (select (i->>'product_id')::uuid pid, (i->>'quantity')::integer qty
            from jsonb_array_elements(p_items) i) c
    join products p on p.id = c.pid;

  update products p set stock = p.stock - c.qty
    from (select (i->>'product_id')::uuid pid, (i->>'quantity')::integer qty
            from jsonb_array_elements(p_items) i) c
   where p.id = c.pid;

  return jsonb_build_object(
    'order_id', v_order.id, 'order_no', v_order.order_no,
    'total_cents', v_total, 'wallet_transaction_id', v_txn.id);
end $$;

-- ---------------------------------------------------------------------
-- SALES CLOSE + POOL FREEZE
-- Runs BEFORE the online print job. Nothing may enter the pool after.
-- ---------------------------------------------------------------------
create or replace function fn_close_campaign_sales(p_campaign_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_c campaigns; v_draw draws;
        v_online integer; v_offline integer; v_copies integer;
begin
  v_admin := fn_require_admin();

  select * into v_c from campaigns where id = p_campaign_id for update;
  if not found then raise exception 'ERR_CAMPAIGN_NOT_FOUND'; end if;
  if v_c.status not in ('LIVE','PAUSED') then raise exception 'ERR_CAMPAIGN_NOT_LIVE'; end if;

  update campaigns set status = 'SALES_CLOSED' where id = p_campaign_id;

  insert into draws(campaign_id, status, sales_closed_at, run_by)
  values (p_campaign_id, 'IN_PROGRESS', now(), v_admin)
  on conflict (campaign_id) do nothing;
  select * into v_draw from draws where campaign_id = p_campaign_id for update;

  -- Online: only tickets actually owned. Offline: every non-cancelled
  -- ticket from a DISTRIBUTED batch, redeemed or not — the store copy is
  -- physically in the drum whether or not the customer ever scanned it.
  insert into draw_pool_entries(draw_id, ticket_id, serial, source)
  select v_draw.id, t.id, t.serial, t.source
    from tickets t
    left join ticket_batches b on b.id = t.batch_id
   where t.campaign_id = p_campaign_id
     and t.status <> 'CANCELLED'
     and (
       (t.source = 'ONLINE'  and t.status = 'ELIGIBLE')
       or
       (t.source = 'OFFLINE' and t.status in ('UNASSIGNED','ELIGIBLE')
        and b.status = 'DISTRIBUTED')
     )
  on conflict do nothing;

  select count(*) filter (where source = 'ONLINE'),
         count(*) filter (where source = 'OFFLINE')
    into v_online, v_offline
    from draw_pool_entries where draw_id = v_draw.id;

  select coalesce(sum(store_copies_received),0) into v_copies
    from ticket_batches where campaign_id = p_campaign_id and status = 'DISTRIBUTED';

  update draws
     set pool_online_count = v_online,
         pool_offline_count = v_offline,
         pool_total_count = v_online + v_offline,
         store_copies_received = v_copies
   where id = v_draw.id;

  perform fn_audit(v_admin, 'SALES_CLOSED', 'DRAWS', 'campaign', p_campaign_id,
                   format('Pool frozen: %s online + %s offline', v_online, v_offline));

  return jsonb_build_object('draw_id', v_draw.id, 'online', v_online,
                            'offline', v_offline, 'total', v_online + v_offline,
                            'store_copies_received', v_copies);
end $$;

-- ---------------------------------------------------------------------
-- RECORD A PHYSICAL PULL
-- The drum decides the winner. This validates and records it.
-- Invalid pulls RETURN (they must persist) rather than raise.
-- ---------------------------------------------------------------------
create or replace function fn_record_draw_pull(
  p_draw_id uuid, p_prize_position integer, p_serial text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_draw draws; v_serial text; v_attempt integer;
        v_ticket tickets; v_prize uuid; v_reason text; v_claim claim_status;
begin
  v_admin  := fn_require_admin();
  v_serial := fn_norm_serial(p_serial);

  select * into v_draw from draws where id = p_draw_id for update;
  if not found then raise exception 'ERR_DRAW_NOT_FOUND'; end if;
  if v_draw.status not in ('IN_PROGRESS','RECORDED') then
    raise exception 'ERR_DRAW_NOT_OPEN';
  end if;

  select coalesce(max(attempt_no),0) + 1 into v_attempt
    from draw_pulls where draw_id = p_draw_id;

  select t.* into v_ticket
    from draw_pool_entries e join tickets t on t.id = e.ticket_id
   where e.draw_id = p_draw_id and e.serial = v_serial
   for update of t;

  if not found then
    v_reason := 'NOT_IN_POOL';
  elsif v_ticket.status = 'CANCELLED' then
    v_reason := 'TICKET_CANCELLED';
  elsif exists (select 1 from draw_winners w where w.ticket_id = v_ticket.id) then
    v_reason := 'ALREADY_WON';
  elsif exists (select 1 from draw_winners w
                 where w.draw_id = p_draw_id and w.position = p_prize_position) then
    v_reason := 'PRIZE_ALREADY_AWARDED';
  end if;

  if v_reason is not null then
    insert into draw_pulls(draw_id, attempt_no, prize_position, serial_entered,
                           result, ticket_id, reason, recorded_by)
    values (p_draw_id, v_attempt, p_prize_position, v_serial, 'INVALID',
            v_ticket.id, v_reason, v_admin);
    return jsonb_build_object('result','INVALID','reason',v_reason,
                              'attempt_no',v_attempt);
  end if;

  select id into v_prize from campaign_prizes
   where campaign_id = v_draw.campaign_id and position = p_prize_position;

  -- An unscanned offline ticket can win. The holder of the paper copy
  -- claims it afterwards.
  v_claim := case when v_ticket.customer_id is null
                  then 'AWAITING_CLAIM'::claim_status
                  else 'CONFIRMED'::claim_status end;

  insert into draw_winners(draw_id, prize_id, position, ticket_id,
                           customer_id, claim_status, claimed_at)
  values (p_draw_id, v_prize, p_prize_position, v_ticket.id,
          v_ticket.customer_id, v_claim,
          case when v_claim = 'CONFIRMED' then now() end);

  update tickets
     set status = case when v_claim = 'CONFIRMED' then 'WINNER'::ticket_status
                       else 'AWAITING_CLAIM'::ticket_status end
   where id = v_ticket.id;

  insert into draw_pulls(draw_id, attempt_no, prize_position, serial_entered,
                         result, ticket_id, recorded_by)
  values (p_draw_id, v_attempt, p_prize_position, v_serial, 'VALID',
          v_ticket.id, v_admin);

  update draws set status = 'RECORDED', recorded_at = now() where id = p_draw_id;

  perform fn_audit(v_admin, 'DRAW_PULL_RECORDED', 'DRAWS', 'ticket', v_ticket.id,
                   format('Position %s -> %s', p_prize_position, v_serial));

  return jsonb_build_object('result','VALID','attempt_no',v_attempt,
                            'ticket_id',v_ticket.id, 'serial', v_serial,
                            'source', v_ticket.source,
                            'claim_status', v_claim,
                            'customer_id', v_ticket.customer_id);
end $$;

-- ---------------------------------------------------------------------
-- CLAIM AN UNSCANNED WINNING TICKET
-- ---------------------------------------------------------------------
create or replace function fn_claim_winning_ticket(p_serial text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid; v_t tickets;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'ERR_NOT_AUTHENTICATED'; end if;

  select t.* into v_t from tickets t
    join ticket_secrets s on s.ticket_id = t.id
   where t.serial = fn_norm_serial(p_serial)
     and s.code   = fn_norm_code(p_code)
   for update of t;
  if not found then raise exception 'ERR_INVALID_TICKET'; end if;
  if v_t.status <> 'AWAITING_CLAIM' then raise exception 'ERR_TICKET_NOT_CLAIMABLE'; end if;

  update tickets set customer_id = v_uid, status = 'WINNER', redeemed_at = now()
   where id = v_t.id;
  update draw_winners set customer_id = v_uid, claim_status = 'CONFIRMED',
                          claimed_at = now()
   where ticket_id = v_t.id;

  return jsonb_build_object('ticket_id', v_t.id, 'serial', v_t.serial,
                            'status','WINNER');
end $$;

-- ---------------------------------------------------------------------
-- CONFIRM + PUBLISH
-- Publishing retires every losing ticket. Rows are NEVER deleted; the
-- wallet UI simply filters on status.
-- ---------------------------------------------------------------------
create or replace function fn_confirm_draw(p_draw_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_draw draws;
begin
  v_admin := fn_require_admin();
  select * into v_draw from draws where id = p_draw_id for update;
  if not found then raise exception 'ERR_DRAW_NOT_FOUND'; end if;
  if v_draw.status <> 'RECORDED' then raise exception 'ERR_DRAW_NOT_RECORDED'; end if;
  if not exists (select 1 from draw_winners where draw_id = p_draw_id) then
    raise exception 'ERR_NO_WINNERS_RECORDED';
  end if;

  update draws set status = 'CONFIRMED', confirmed_at = now(), confirmed_by = v_admin
   where id = p_draw_id;
  perform fn_audit(v_admin, 'DRAW_CONFIRMED', 'DRAWS', 'draw', p_draw_id, null);
  return jsonb_build_object('draw_id', p_draw_id, 'status','CONFIRMED');
end $$;

create or replace function fn_publish_draw(
  p_draw_id uuid, p_youtube_video_id text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_draw draws; v_retired integer;
begin
  v_admin := fn_require_admin();
  select * into v_draw from draws where id = p_draw_id for update;
  if not found then raise exception 'ERR_DRAW_NOT_FOUND'; end if;
  if v_draw.status <> 'CONFIRMED' then raise exception 'ERR_DRAW_NOT_CONFIRMED'; end if;

  update tickets t
     set status = 'NOT_WON'
    from draw_pool_entries e
   where e.draw_id = p_draw_id
     and e.ticket_id = t.id
     and t.status in ('ELIGIBLE','UNASSIGNED');
  get diagnostics v_retired = row_count;

  update draw_winners set is_published = true where draw_id = p_draw_id;

  update draws
     set status = 'PUBLISHED', published_at = now(),
         youtube_video_id = coalesce(p_youtube_video_id, youtube_video_id)
   where id = p_draw_id;

  update campaigns set status = 'COMPLETED' where id = v_draw.campaign_id;

  perform fn_audit(v_admin, 'WINNER_PUBLISHED', 'DRAWS', 'draw', p_draw_id,
                   format('%s losing tickets retired', v_retired));

  return jsonb_build_object('draw_id', p_draw_id, 'status','PUBLISHED',
                            'tickets_retired', v_retired);
end $$;

-- ---------------------------------------------------------------------
-- ADMIN OPERATIONS
-- ---------------------------------------------------------------------
create or replace function fn_admin_adjust_wallet(
  p_customer_id uuid, p_amount_cents bigint, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_txn wallet_transactions;
begin
  v_admin := fn_require_admin();
  if coalesce(trim(p_reason),'') = '' then raise exception 'ERR_REASON_REQUIRED'; end if;

  v_txn := fn_wallet_apply(p_customer_id, 'ADJUSTMENT', p_amount_cents,
                           'admin', v_admin, p_reason, v_admin, true);

  perform fn_audit(v_admin, 'WALLET_ADJUSTED', 'WALLET', 'profile', p_customer_id,
                   p_reason, jsonb_build_object('amount_cents', p_amount_cents));
  return jsonb_build_object('transaction_id', v_txn.id,
                            'balance_after_cents', v_txn.balance_after_cents);
end $$;

create or replace function fn_admin_cancel_ticket(p_ticket_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_t tickets;
begin
  v_admin := fn_require_admin();
  select * into v_t from tickets where id = p_ticket_id for update;
  if not found then raise exception 'ERR_TICKET_NOT_FOUND'; end if;
  if v_t.status in ('WINNER','NOT_WON') then raise exception 'ERR_TICKET_FINALISED'; end if;

  update tickets set status = 'CANCELLED', cancelled_at = now(),
                     cancel_reason = p_reason
   where id = p_ticket_id;
  perform fn_audit(v_admin, 'TICKET_CANCELLED', 'TICKETS', 'ticket', p_ticket_id, p_reason);
  return jsonb_build_object('ticket_id', p_ticket_id, 'status','CANCELLED');
end $$;

create or replace function fn_admin_cancel_batch(p_batch_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_n integer;
begin
  v_admin := fn_require_admin();
  update tickets set status = 'CANCELLED', cancelled_at = now(), cancel_reason = p_reason
   where batch_id = p_batch_id and status = 'UNASSIGNED';
  get diagnostics v_n = row_count;
  update ticket_batches set status = 'CANCELLED', cancelled_at = now() where id = p_batch_id;
  perform fn_audit(v_admin, 'VOUCHER_BATCH_CANCELLED', 'VOUCHERS', 'ticket_batch',
                   p_batch_id, p_reason, jsonb_build_object('cancelled', v_n));
  return jsonb_build_object('batch_id', p_batch_id, 'tickets_cancelled', v_n);
end $$;

create or replace function fn_admin_set_batch_status(
  p_batch_id uuid, p_status batch_status, p_store_copies_received integer default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid;
begin
  v_admin := fn_require_admin();
  update ticket_batches
     set status = p_status,
         printed_at = case when p_status='PRINTED' then now() else printed_at end,
         distributed_at = case when p_status='DISTRIBUTED' then now() else distributed_at end,
         store_copies_received = coalesce(p_store_copies_received, store_copies_received)
   where id = p_batch_id;
  perform fn_audit(v_admin, 'BATCH_STATUS_CHANGED', 'VOUCHERS', 'ticket_batch',
                   p_batch_id, p_status::text);
  return jsonb_build_object('batch_id', p_batch_id, 'status', p_status);
end $$;

-- Refunds return value to the wallet as Winnn only — never to cash.
create or replace function fn_admin_refund_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_admin uuid; v_o orders; v_txn wallet_transactions;
begin
  v_admin := fn_require_admin();
  select * into v_o from orders where id = p_order_id for update;
  if not found then raise exception 'ERR_ORDER_NOT_FOUND'; end if;
  if v_o.status = 'REFUNDED' then raise exception 'ERR_ORDER_ALREADY_REFUNDED'; end if;

  v_txn := fn_wallet_apply(v_o.customer_id, 'REFUND', v_o.total_cents,
                           'order', v_o.id, coalesce(p_reason,'Order refund'), v_admin);

  update products p set stock = p.stock + oi.quantity
    from order_items oi where oi.order_id = p_order_id and p.id = oi.product_id;

  update orders set status = 'REFUNDED', updated_at = now() where id = p_order_id;

  perform fn_audit(v_admin, 'ORDER_REFUNDED', 'ORDERS', 'order', p_order_id, p_reason);
  return jsonb_build_object('order_id', p_order_id, 'refunded_cents', v_o.total_cents,
                            'transaction_id', v_txn.id);
end $$;

-- ---------------------------------------------------------------------
-- GRANTS — only these functions are callable by signed-in users.
-- ---------------------------------------------------------------------
revoke all on function fn_wallet_apply(uuid, wallet_txn_type, bigint, text, uuid, text, uuid, boolean) from public;
revoke all on function fn_allocate_online_tickets(uuid, uuid, integer, uuid, uuid) from public;
revoke all on function fn_confirm_payment(text, text, text, jsonb) from public;

grant execute on function fn_redeem_offline_ticket(text, text) to authenticated;
grant execute on function fn_claim_winning_ticket(text, text)  to authenticated;
grant execute on function fn_store_checkout(jsonb, jsonb)      to authenticated;
