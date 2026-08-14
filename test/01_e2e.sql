-- End-to-end exercise of every critical path. Any failed assertion aborts.
\set ON_ERROR_STOP on
create table if not exists _t(k text primary key, v text);
create or replace function _set(k text, v text) returns void language sql as
$$ insert into _t values(k,v) on conflict (k) do update set v=excluded.v; $$;
create or replace function _get(k text) returns text language sql stable as
$$ select v from _t where _t.k=$1; $$;
create or replace function _assert(cond boolean, msg text) returns void
language plpgsql as $$ begin
  if not cond then raise exception 'ASSERT FAILED: %', msg; end if;
end $$;

\echo '--- setup: users, merchant, campaign'
do $$
declare v_admin uuid; v_a uuid; v_b uuid; v_m uuid; v_c uuid;
begin
  insert into auth.users(email) values ('admin@winnn.test') returning id into v_admin;
  insert into auth.users(email) values ('a@test.com')       returning id into v_a;
  insert into auth.users(email) values ('b@test.com')       returning id into v_b;
  insert into admins(id) values (v_admin);

  insert into merchants(name, slug) values ('ABC Restaurant','abc') returning id into v_m;

  insert into campaigns(name, slug, type, status, ticket_price_cents, serial_prefix,
                        offline_serial_start, offline_serial_end, offline_serial_next,
                        online_serial_start, online_serial_next,
                        starts_at, sales_close_at, draw_date, owner_merchant_id,
                        max_online_per_customer)
  values ('Summer Draw','summer','HYBRID','LIVE',10000,'SUM26',
          1,499999,1,500001,500001,
          now()-interval '1 day', now()+interval '30 days', now()+interval '31 days',
          v_m, 50)
  returning id into v_c;

  insert into campaign_prizes(campaign_id, position, title, value_cents)
  values (v_c,1,'Grand Prize',10000000),(v_c,2,'Second Prize',1000000);

  perform _set('admin',v_admin::text), _set('a',v_a::text), _set('b',v_b::text),
          _set('m',v_m::text), _set('c',v_c::text);
end $$;

\echo '--- offline batch generation (admin)'
do $$
declare v_res jsonb;
begin
  perform set_config('app.uid', _get('admin'), true);
  v_res := fn_generate_offline_batch(_get('c')::uuid, _get('m')::uuid, 100);
  perform _set('batch', v_res->>'batch_id');
  perform _assert((v_res->>'serial_from')::bigint = 1, 'batch starts at serial 1');
  perform _assert((select count(*) from tickets where batch_id=(v_res->>'batch_id')::uuid)=100,
                  '100 offline tickets created');
  perform _assert((select count(*) from ticket_secrets s
                   join tickets t on t.id=s.ticket_id
                   where t.batch_id=(v_res->>'batch_id')::uuid)=100,
                  'every offline ticket has a secret');
  perform fn_admin_set_batch_status((v_res->>'batch_id')::uuid,'DISTRIBUTED',100);
end $$;

\echo '--- non-admin cannot generate a batch'
do $$
begin
  perform set_config('app.uid', _get('a'), true);
  begin
    perform fn_generate_offline_batch(_get('c')::uuid, _get('m')::uuid, 10);
    raise exception 'ASSERT FAILED: customer generated a batch';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'ERR_NOT_AUTHORIZED' then raise; end if;
  end;
end $$;

\echo '--- online purchase: 5 tickets @ 100 Winnn'
do $$
declare v_pay uuid; v_res jsonb;
begin
  insert into payments(customer_id, campaign_id, ticket_count, provider, provider_ref,
                       amount_minor, currency, fx_rate, winnn_cents)
  values (_get('a')::uuid, _get('c')::uuid, 5, 'areeba', 'AREEBA-REF-1',
          50000, 'USD', 1, 50000)
  returning id into v_pay;

  v_res := fn_confirm_payment('areeba','AREEBA-REF-1','evt_1','{}'::jsonb);
  perform _assert(v_res->>'status'='confirmed', 'payment confirmed');
  perform _assert((v_res->>'tickets_created')::int = 5, '5 tickets minted');

  -- same webhook replayed
  v_res := fn_confirm_payment('areeba','AREEBA-REF-1','evt_1','{}'::jsonb);
  perform _assert(v_res->>'status'='duplicate_event', 'replayed event is a no-op');

  -- different event id, already-confirmed payment
  v_res := fn_confirm_payment('areeba','AREEBA-REF-1','evt_2','{}'::jsonb);
  perform _assert(v_res->>'status'='already_confirmed', 'double confirm blocked');

  perform _assert((select balance_cents from wallets where customer_id=_get('a')::uuid)=50000,
                  'wallet credited exactly once');
  perform _assert((select count(*) from tickets
                    where customer_id=_get('a')::uuid and source='ONLINE')=5,
                  'exactly 5 online tickets exist');
  perform _assert((select count(*) from wallet_transactions w
                    join wallets wa on wa.id=w.wallet_id
                    where wa.customer_id=_get('a')::uuid)=1, 'one ledger entry');
end $$;

\echo '--- store purchase: 300 Winnn, tickets must survive'
do $$
declare v_cat uuid; v_p uuid; v_res jsonb;
begin
  insert into product_categories(name,slug) values ('Electronics','electronics') returning id into v_cat;
  insert into products(category_id,name,slug,price_cents,stock,status)
  values (v_cat,'Headphones','headphones',30000,10,'ACTIVE') returning id into v_p;
  perform _set('product', v_p::text);

  perform set_config('app.uid', _get('a'), true);
  v_res := fn_store_checkout(jsonb_build_array(
             jsonb_build_object('product_id',v_p,'quantity',1)), null);

  perform _assert((v_res->>'total_cents')::bigint = 30000, 'server computed total');
  perform _assert((select balance_cents from wallets where customer_id=_get('a')::uuid)=20000,
                  'wallet debited to 200 Winnn');
  perform _assert((select stock from products where id=v_p)=9, 'stock decremented');
  perform _assert((select count(*) from tickets
                    where customer_id=_get('a')::uuid and status='ELIGIBLE')=5,
                  'tickets unaffected by spending credits');
end $$;

\echo '--- overspend is refused and leaves no trace'
do $$
declare v_before bigint; v_orders int;
begin
  select balance_cents into v_before from wallets where customer_id=_get('a')::uuid;
  select count(*) into v_orders from orders where customer_id=_get('a')::uuid;
  perform set_config('app.uid', _get('a'), true);
  begin
    perform fn_store_checkout(jsonb_build_array(
      jsonb_build_object('product_id',_get('product')::uuid,'quantity',5)), null);
    raise exception 'ASSERT FAILED: overspend allowed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'ERR_INSUFFICIENT_CREDITS' then raise; end if;
  end;
  perform _assert((select balance_cents from wallets where customer_id=_get('a')::uuid)=v_before,
                  'balance untouched after failed checkout');
  perform _assert((select count(*) from orders where customer_id=_get('a')::uuid)=v_orders,
                  'no order created');
end $$;

\echo '--- offline redemption'
do $$
declare v_serial text; v_code text; v_res jsonb;
begin
  select t.serial, s.code into v_serial, v_code
    from tickets t join ticket_secrets s on s.ticket_id=t.id
   where t.batch_id=_get('batch')::uuid order by t.serial_no limit 1;
  perform _set('redeemed_serial', v_serial), _set('redeemed_code', v_code);

  perform set_config('app.uid', _get('b'), true);

  -- wrong code must fail with the generic error
  begin
    perform fn_redeem_offline_ticket(v_serial, 'DEADBEEFDEADBEEF');
    raise exception 'ASSERT FAILED: wrong code accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'ERR_INVALID_TICKET' then raise; end if;
  end;

  -- lower case + dashes must normalise
  v_res := fn_redeem_offline_ticket(lower(v_serial),
             lower(substr(v_code,1,4)||'-'||substr(v_code,5)));
  perform _assert(v_res->>'status'='ELIGIBLE', 'ticket redeemed');
  perform _assert(v_res->>'merchant'='ABC Restaurant', 'merchant attributed');

  -- second attempt on the same voucher
  begin
    perform fn_redeem_offline_ticket(v_serial, v_code);
    raise exception 'ASSERT FAILED: double redemption allowed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'ERR_TICKET_ALREADY_REDEEMED' then raise; end if;
  end;
end $$;

\echo '--- RLS: customer cannot read secrets or unassigned stock'
set role authenticated;
select set_config('app.uid', (select v from _t where k='b'), false);
do $$
declare v_n int;
begin
  begin
    select count(*) into v_n from ticket_secrets;
    perform _assert(v_n=0, 'ticket_secrets must be unreadable');
  exception when insufficient_privilege then
    null; -- permission denied is an equally good outcome
  end;
  select count(*) into v_n from tickets where status='UNASSIGNED';
  perform _assert(v_n=0, 'unassigned offline stock is invisible to customers');
  select count(*) into v_n from tickets;
  perform _assert(v_n=1, 'customer B sees only their own single ticket');
  select count(*) into v_n from wallets;
  perform _assert(v_n=1, 'customer B sees only their own wallet');
end $$;
reset role;

\echo '--- close sales and freeze the pool'
do $$
declare v_res jsonb;
begin
  perform set_config('app.uid', _get('admin'), true);
  v_res := fn_close_campaign_sales(_get('c')::uuid);
  perform _set('draw', v_res->>'draw_id');
  perform _assert((v_res->>'online')::int = 5,   '5 online in drum');
  perform _assert((v_res->>'offline')::int = 100,'100 offline in drum');
  perform _assert((v_res->>'total')::int = 105,  'unified pool total');
end $$;

\echo '--- record physical pulls'
do $$
declare v_res jsonb; v_serial text; v_off text;
begin
  perform set_config('app.uid', _get('admin'), true);

  -- bogus serial: recorded as INVALID, not raised
  v_res := fn_record_draw_pull(_get('draw')::uuid, 1, 'SUM26-999999');
  perform _assert(v_res->>'result'='INVALID' and v_res->>'reason'='NOT_IN_POOL',
                  'serial outside the pool rejected');

  -- winner: one of customer A's online tickets
  select serial into v_serial from tickets
   where customer_id=_get('a')::uuid and source='ONLINE' order by serial_no limit 1;
  v_res := fn_record_draw_pull(_get('draw')::uuid, 1, v_serial);
  perform _assert(v_res->>'result'='VALID', 'online ticket wins');
  perform _assert(v_res->>'claim_status'='CONFIRMED', 'owner already known');
  perform _set('winner1', v_serial);

  -- the same ticket pulled again
  v_res := fn_record_draw_pull(_get('draw')::uuid, 1, v_serial);
  perform _assert(v_res->>'reason'='ALREADY_WON', 'a ticket cannot win twice');

  -- a different, valid ticket pulled for a prize already awarded
  select serial into v_serial from tickets
   where customer_id=_get('a')::uuid and source='ONLINE' and status='ELIGIBLE'
   order by serial_no limit 1;
  v_res := fn_record_draw_pull(_get('draw')::uuid, 1, v_serial);
  perform _assert(v_res->>'reason'='PRIZE_ALREADY_AWARDED', 'prize cannot be re-awarded');

  -- second prize: an offline ticket nobody ever scanned
  select t.serial into v_off from tickets t
   where t.batch_id=_get('batch')::uuid and t.status='UNASSIGNED'
   order by t.serial_no limit 1;
  v_res := fn_record_draw_pull(_get('draw')::uuid, 2, v_off);
  perform _assert(v_res->>'claim_status'='AWAITING_CLAIM', 'unscanned winner awaits claim');
  perform _set('winner2', v_off);

  perform _assert((select count(*) from draw_pulls where draw_id=_get('draw')::uuid)=5,
                  'all five pulls recorded, valid and invalid');
end $$;

\echo '--- confirm and publish'
do $$
declare v_res jsonb;
begin
  perform set_config('app.uid', _get('admin'), true);
  perform fn_confirm_draw(_get('draw')::uuid);
  v_res := fn_publish_draw(_get('draw')::uuid, 'dQw4w9WgXcQ');
  perform _assert((v_res->>'tickets_retired')::int = 103, '103 losers retired');

  perform _assert((select status from tickets where serial=_get('winner1'))='WINNER',
                  'winning ticket kept');
  perform _assert((select status from tickets where serial=_get('winner2'))='AWAITING_CLAIM',
                  'unclaimed winner not retired');
  perform _assert((select count(*) from tickets
                    where campaign_id=_get('c')::uuid and status='NOT_WON')=103,
                  'losers are NOT_WON, never deleted');
  perform _assert((select count(*) from tickets where campaign_id=_get('c')::uuid)=105,
                  'no ticket row was ever destroyed');
  perform _assert((select status from campaigns where id=_get('c')::uuid)='COMPLETED',
                  'campaign completed');
end $$;

\echo '--- claim the unscanned winning voucher'
do $$
declare v_code text; v_res jsonb;
begin
  select s.code into v_code from ticket_secrets s
    join tickets t on t.id=s.ticket_id where t.serial=_get('winner2');
  perform set_config('app.uid', _get('b'), true);
  v_res := fn_claim_winning_ticket(_get('winner2'), v_code);
  perform _assert(v_res->>'status'='WINNER', 'paper holder claimed the prize');
  perform _assert((select customer_id from draw_winners
                   where ticket_id=(v_res->>'ticket_id')::uuid)=_get('b')::uuid,
                  'winner record attributed');
end $$;

\echo '--- ledger is append-only'
do $$
begin
  begin
    update wallet_transactions set amount_cents = 999999;
    raise exception 'ASSERT FAILED: ledger was mutable';
  exception when sqlstate '42501' then null;
  end;
  begin
    delete from audit_logs;
    raise exception 'ASSERT FAILED: audit log was deletable';
  exception when sqlstate '42501' then null;
  end;
end $$;

\echo ''
\echo '======== ALL ASSERTIONS PASSED ========'
select (select count(*) from tickets) as tickets,
       (select count(*) from draw_pool_entries) as in_drum,
       (select count(*) from wallet_transactions) as ledger_entries,
       (select count(*) from audit_logs) as audit_entries,
       (select balance_cents from wallets w join profiles p on p.id=w.customer_id
         where p.email='a@test.com') as customer_a_balance;
