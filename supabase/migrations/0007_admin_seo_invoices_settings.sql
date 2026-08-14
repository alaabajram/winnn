-- Admin surface: SEO fields, merchant invoices, site settings.
-- Writes go through SECURITY DEFINER functions guarded by fn_require_admin().

alter table campaigns
  add column if not exists meta_title       text,
  add column if not exists meta_description text,
  add column if not exists og_image_url     text,
  add column if not exists keywords         text[] not null default '{}',
  add column if not exists ai_summary       text,
  add column if not exists faq              jsonb  not null default '[]'::jsonb,
  add column if not exists noindex          boolean not null default false;

alter table products
  add column if not exists meta_title       text,
  add column if not exists meta_description text;

create table if not exists site_settings (
  id                  boolean primary key default true check (id),
  site_name           text not null default 'Winnn',
  tagline             text not null default 'Buy Credits. Get Tickets. Win.',
  description         text not null default 'Lucky draw campaigns with local Lebanese businesses.',
  logo_url            text,
  favicon_url         text,
  brand_primary       text not null default '#0d1c32',
  brand_accent        text not null default '#fed65b',
  support_email       text,
  support_phone       text,
  whatsapp            text,
  address             text,
  instagram_url       text,
  facebook_url        text,
  tiktok_url          text,
  default_meta_title       text,
  default_meta_description text,
  default_og_image_url     text,
  google_verification      text,
  ga_measurement_id        text,
  ai_site_summary          text,
  terms_content       text,
  privacy_content     text,
  about_content       text,
  how_it_works_content text,
  store_enabled       boolean not null default true,
  signup_enabled      boolean not null default true,
  maintenance_mode    boolean not null default false,
  maintenance_message text,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references admins(id)
);
insert into site_settings(id) values (true) on conflict (id) do nothing;

do $$ begin
  create type invoice_status as enum ('DRAFT','SENT','PAID','VOID','OVERDUE');
exception when duplicate_object then null; end $$;

create table if not exists merchant_invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_no     text not null unique,
  merchant_id    uuid not null references merchants(id),
  campaign_id    uuid references campaigns(id),
  status         invoice_status not null default 'DRAFT',
  currency       char(3) not null default 'USD',
  subtotal_cents bigint not null default 0,
  tax_percent    numeric(5,2) not null default 0,
  tax_cents      bigint not null default 0,
  total_cents    bigint not null default 0,
  notes          text,
  issued_at      date not null default current_date,
  due_at         date,
  paid_at        timestamptz,
  created_by     uuid references admins(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists merchant_invoices_merchant_idx on merchant_invoices (merchant_id, issued_at desc);
create index if not exists merchant_invoices_status_idx on merchant_invoices (status);

create table if not exists merchant_invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references merchant_invoices(id) on delete cascade,
  position     integer not null default 1,
  description  text not null,
  quantity     numeric(12,2) not null default 1 check (quantity > 0),
  unit_cents   bigint not null check (unit_cents >= 0),
  line_cents   bigint not null check (line_cents >= 0)
);
create index if not exists merchant_invoice_items_invoice_idx on merchant_invoice_items (invoice_id);

alter table site_settings          enable row level security;
alter table merchant_invoices      enable row level security;
alter table merchant_invoice_items enable row level security;

-- Settings are read on every page render, including for signed-out visitors.
create policy site_settings_public_read on site_settings for select using (true);
create policy merchant_invoices_admin on merchant_invoices for select using (fn_is_admin());
create policy merchant_invoice_items_admin on merchant_invoice_items for select using (fn_is_admin());
