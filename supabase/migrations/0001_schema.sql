-- =====================================================================
-- WINNN — 0001_schema.sql
-- Core tables, enums, constraints, indexes, immutability triggers.
--
-- MONEY RULE: all monetary values are BIGINT minor units of Winnn.
--   1 Winnn = 1 USD = 100 "cents".  Never use float/numeric for money.
--
-- TICKET RULE: online and offline tickets live in ONE table with one
--   per-campaign serial space. Offline rows are pre-allocated with
--   customer_id NULL; online rows are created at purchase time.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type merchant_status  as enum ('ACTIVE','DISABLED','ARCHIVED');

create type campaign_type    as enum ('ONLINE','OFFLINE','HYBRID');

create type campaign_status  as enum (
  'DRAFT','SCHEDULED','LIVE','PAUSED','SALES_CLOSED','ENDED',
  'DRAWN','COMPLETED','ARCHIVED');

create type batch_status     as enum ('GENERATED','PRINTED','DISTRIBUTED','CANCELLED');

create type ticket_source    as enum ('ONLINE','OFFLINE');

-- UNASSIGNED  : offline stock, printed, not yet scanned by a customer
-- ELIGIBLE    : in the draw pool, owner known
-- AWAITING_CLAIM : drawn as a winner but never scanned; holder must claim
-- WINNER / NOT_WON : terminal post-draw states
create type ticket_status    as enum (
  'UNASSIGNED','ELIGIBLE','AWAITING_CLAIM','WINNER','NOT_WON',
  'CANCELLED','EXPIRED');

create type payment_status   as enum ('PENDING','CONFIRMED','FAILED','EXPIRED','REVERSED');

create type wallet_txn_type  as enum ('TOP_UP','PURCHASE','REFUND','ADJUSTMENT','REVERSAL');

create type order_status     as enum (
  'PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','CANCELLED','REFUNDED');

create type product_status   as enum ('DRAFT','ACTIVE','ARCHIVED');

create type draw_status      as enum ('PENDING','IN_PROGRESS','RECORDED','CONFIRMED','PUBLISHED');

create type pull_result      as enum ('VALID','INVALID');

create type claim_status     as enum ('CONFIRMED','AWAITING_CLAIM','VOIDED');

-- ---------------------------------------------------------------------
-- IDENTITY
-- ---------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text,
  mobile       text,
  avatar_url   text,
  is_disabled  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'ADMIN'
             check (role in ('SUPER_ADMIN','ADMIN','OPERATOR')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- MERCHANTS  (records only — no merchant login exists)
-- ---------------------------------------------------------------------
create table merchants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  logo_url      text,
  cover_url     text,
  category      text,
  description   text,
  address       text,
  latitude      double precision,
  longitude     double precision,
  website       text,
  contact_name  text,
  contact_phone text,
  contact_email text,
  status        merchant_status not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CAMPAIGNS
-- ---------------------------------------------------------------------
create table campaigns (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  description         text,
  hero_image_url      text,
  thumbnail_url       text,
  banner_url          text,          -- ticket artwork banner
  sponsor_logo_url    text,          -- ticket artwork sponsor logo
  brand_color         text,
  owner_merchant_id   uuid references merchants(id),
  type                campaign_type not null,
  status              campaign_status not null default 'DRAFT',

  -- online entry price, in Winnn minor units, per ticket
  ticket_price_cents  bigint not null check (ticket_price_cents > 0),

  -- caps (NULL = uncapped)
  max_tickets_total          integer check (max_tickets_total  > 0),
  max_online_per_customer    integer check (max_online_per_customer  > 0),
  max_offline_per_customer   integer check (max_offline_per_customer > 0),

  -- serial space. Offline block is pre-allocated; online grows on demand.
  serial_prefix        text   not null unique
                       check (serial_prefix ~ '^[A-Z0-9]{3,12}$'),
  offline_serial_start bigint not null default 1,
  offline_serial_end   bigint not null default 499999,
  offline_serial_next  bigint not null default 1,
  online_serial_start  bigint not null default 500001,
  online_serial_next   bigint not null default 500001,

  starts_at       timestamptz,
  sales_close_at  timestamptz,
  ends_at         timestamptz,
  draw_date       timestamptz,

  terms           text,
  published_at    timestamptz,
  created_by      uuid references admins(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint campaign_serial_blocks_sane
    check (offline_serial_start <= offline_serial_end
           and offline_serial_end < online_serial_start
           and offline_serial_next between offline_serial_start and offline_serial_end + 1
           and online_serial_next >= online_serial_start),
  constraint campaign_dates_sane
    check (sales_close_at is null or draw_date is null or sales_close_at <= draw_date)
);

create index on campaigns (status);
create index on campaigns (draw_date);

create table campaign_prizes (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  position     integer not null check (position > 0),   -- 1 = grand prize
  title        text not null,
  value_cents  bigint check (value_cents >= 0),
  image_url    text,
  unique (campaign_id, position)
);

-- participating businesses for offline/hybrid campaigns
create table campaign_merchants (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  merchant_id    uuid not null references merchants(id),
  -- merchant decides its own issuance rule; stored as display text only
  issuance_note  text,
  allocated_qty  integer not null default 0 check (allocated_qty >= 0),
  unique (campaign_id, merchant_id)
);

-- ---------------------------------------------------------------------
-- TICKETS  (unified pool)
-- ---------------------------------------------------------------------
create table ticket_batches (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references campaigns(id) on delete cascade,
  merchant_id           uuid references merchants(id),
  quantity              integer not null check (quantity > 0),
  serial_from           bigint not null,
  serial_to             bigint not null,
  status                batch_status not null default 'GENERATED',
  store_copies_received integer not null default 0 check (store_copies_received >= 0),
  printed_at            timestamptz,
  distributed_at        timestamptz,
  cancelled_at          timestamptz,
  created_by            uuid references admins(id),
  created_at            timestamptz not null default now(),
  check (serial_from <= serial_to)
);
create index on ticket_batches (campaign_id, status);

create table tickets (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  batch_id     uuid references ticket_batches(id),
  merchant_id  uuid references merchants(id),

  serial_no    bigint not null,                 -- numeric position in serial space
  serial       text   not null,                 -- printed form, e.g. SUM26-004821
  source       ticket_source not null,
  status       ticket_status not null default 'UNASSIGNED',

  customer_id  uuid references profiles(id),
  payment_id   uuid,                            -- FK added after payments table
  wallet_transaction_id uuid,

  redeemed_at   timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,
  created_at    timestamptz not null default now(),

  unique (serial),                              -- globally unique (prefix is unique)
  unique (campaign_id, serial_no),

  -- an online ticket always has an owner from the moment it exists
  constraint online_ticket_has_owner
    check (source <> 'ONLINE' or customer_id is not null),
  -- unassigned stock must be ownerless offline stock
  constraint unassigned_is_ownerless_offline
    check (status <> 'UNASSIGNED' or (customer_id is null and source = 'OFFLINE'))
);

create index on tickets (campaign_id, status);
create index on tickets (customer_id, campaign_id);
create index on tickets (batch_id);

-- Redemption secrets live in their own table with NO RLS policy at all.
-- Nothing client-side may ever read this; only SECURITY DEFINER functions.
create table ticket_secrets (
  ticket_id uuid primary key references tickets(id) on delete cascade,
  code      text not null unique
);

-- ---------------------------------------------------------------------
-- WALLET  (ledger-first; balance is a cached projection)
-- ---------------------------------------------------------------------
create table wallets (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null unique references profiles(id) on delete cascade,
  balance_cents bigint not null default 0,   -- may go negative on REVERSAL only
  updated_at    timestamptz not null default now()
);

create table wallet_transactions (
  id                  uuid primary key default gen_random_uuid(),
  wallet_id           uuid not null references wallets(id) on delete cascade,
  type                wallet_txn_type not null,
  amount_cents        bigint not null,          -- signed: +credit / -debit
  balance_after_cents bigint not null,
  reference_type      text,                     -- 'payment' | 'order' | 'admin'
  reference_id        uuid,
  description         text,
  created_by          uuid,                     -- admin id for manual entries
  created_at          timestamptz not null default now(),
  check (amount_cents <> 0)
);
create index on wallet_transactions (wallet_id, created_at desc);

-- ---------------------------------------------------------------------
-- PAYMENTS  (provider-agnostic; Areeba is just one row value)
-- ---------------------------------------------------------------------
create table payments (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references profiles(id),
  campaign_id   uuid references campaigns(id),   -- chosen before checkout
  ticket_count  integer not null default 0 check (ticket_count >= 0),

  provider      text not null,                   -- 'areeba' | 'whish' | 'omt' | ...
  provider_ref  text not null,                   -- provider order/session id
  status        payment_status not null default 'PENDING',

  amount_minor  bigint not null check (amount_minor > 0), -- as actually charged
  currency      char(3) not null,                -- 'USD' | 'LBP'
  fx_rate       numeric(18,6) not null default 1,-- minor units -> Winnn cents
  winnn_cents   bigint not null check (winnn_cents > 0),

  expires_at    timestamptz,                     -- hold expiry for OMT/Whish
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index on payments (customer_id, created_at desc);

alter table tickets
  add constraint tickets_payment_fk
  foreign key (payment_id) references payments(id);
alter table tickets
  add constraint tickets_wallet_txn_fk
  foreign key (wallet_transaction_id) references wallet_transactions(id);

-- Webhook idempotency: the DB rejects duplicates, not the app.
create table payment_events (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid references payments(id),
  provider           text not null,
  provider_event_id  text not null,
  payload            jsonb,
  received_at        timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- ---------------------------------------------------------------------
-- STORE
-- ---------------------------------------------------------------------
create table product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references product_categories(id),
  name         text not null,
  slug         text not null unique,
  description  text,
  images       jsonb not null default '[]'::jsonb,
  price_cents  bigint not null check (price_cents > 0),
  stock        integer not null default 0 check (stock >= 0),
  sku          text unique,
  status       product_status not null default 'DRAFT',
  is_featured  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on products (status, is_featured);

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  order_no              text not null unique,
  customer_id           uuid not null references profiles(id),
  total_cents           bigint not null check (total_cents > 0),
  status                order_status not null default 'CONFIRMED',
  shipping              jsonb,
  wallet_transaction_id uuid references wallet_transactions(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on orders (customer_id, created_at desc);

create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       uuid not null references products(id),
  name_snapshot    text not null,
  unit_price_cents bigint not null check (unit_price_cents > 0),
  quantity         integer not null check (quantity > 0),
  line_total_cents bigint not null check (line_total_cents > 0)
);
create index on order_items (order_id);

-- ---------------------------------------------------------------------
-- DRAWS  (physical drum; the server RECORDS, it does not randomise)
-- ---------------------------------------------------------------------
create table draws (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null unique references campaigns(id) on delete cascade,
  status                draw_status not null default 'PENDING',

  -- frozen reconciliation figures, published for transparency
  pool_online_count     integer not null default 0,
  pool_offline_count    integer not null default 0,
  pool_total_count      integer not null default 0,
  store_copies_received integer not null default 0,

  sales_closed_at  timestamptz,
  recorded_at      timestamptz,
  confirmed_at     timestamptz,
  published_at     timestamptz,
  youtube_video_id text,                 -- ID only; app parses the URL
  run_by           uuid references admins(id),
  confirmed_by     uuid references admins(id)
);

-- immutable snapshot of what physically went into the drum
create table draw_pool_entries (
  draw_id   uuid not null references draws(id) on delete cascade,
  ticket_id uuid not null references tickets(id),
  serial    text not null,
  source    ticket_source not null,
  primary key (draw_id, ticket_id)
);
create index on draw_pool_entries (draw_id, serial);

-- every physical pull, including invalid ones — this is the audit trail
create table draw_pulls (
  id             uuid primary key default gen_random_uuid(),
  draw_id        uuid not null references draws(id) on delete cascade,
  attempt_no     integer not null,
  prize_position integer not null,
  serial_entered text not null,
  result         pull_result not null,
  ticket_id      uuid references tickets(id),
  reason         text,
  pulled_at      timestamptz not null default now(),
  recorded_by    uuid references admins(id),
  unique (draw_id, attempt_no)
);

create table draw_winners (
  id           uuid primary key default gen_random_uuid(),
  draw_id      uuid not null references draws(id) on delete cascade,
  prize_id     uuid references campaign_prizes(id),
  position     integer not null,
  ticket_id    uuid not null unique references tickets(id),
  customer_id  uuid references profiles(id),
  claim_status claim_status not null default 'CONFIRMED',
  claimed_at   timestamptz,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (draw_id, position)
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS / AUDIT
-- ---------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on notifications (customer_id, created_at desc);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references admins(id),
  action      text not null,
  module      text not null,
  entity      text,
  entity_id   uuid,
  description text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_logs (created_at desc);
create index on audit_logs (module, action);

-- ---------------------------------------------------------------------
-- IMMUTABILITY
-- Ledger, audit and draw-pull rows are append-only at the DB level.
-- ---------------------------------------------------------------------
create or replace function fn_block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'Table % is append-only; % is not permitted',
    tg_table_name, tg_op using errcode = '42501';
end;
$$;

create trigger no_update_wallet_transactions
  before update or delete on wallet_transactions
  for each row execute function fn_block_mutation();

create trigger no_update_audit_logs
  before update or delete on audit_logs
  for each row execute function fn_block_mutation();

create trigger no_update_draw_pulls
  before update or delete on draw_pulls
  for each row execute function fn_block_mutation();

create trigger no_update_draw_pool_entries
  before update or delete on draw_pool_entries
  for each row execute function fn_block_mutation();

create trigger no_update_payment_events
  before update or delete on payment_events
  for each row execute function fn_block_mutation();
