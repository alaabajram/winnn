# Winnn

Lucky-draw and rewards PWA for the Lebanese market, plus a full admin console.
Next.js 15 + Supabase.

**Supabase project:** `hryebohnzyyokidxsczl` (eu-central-1)

## Setup

```bash
npm install
cp .env.example .env.local     # fill in values
npm run dev
```

Apply `supabase/migrations/` in order. Read `FOUNDATION.md` first.

## Customer app

Four sections and no more: **Home, Store, Wallet, Profile.**

Auth is email + password with a confirmation link, plus Google OAuth. Password
rules live in `lib/password.ts` and **must mirror** the server-side rules in
Supabase (Authentication > Policies). Client validation is UX only.

## Admin console at `/admin`

Gated by `lib/admin.ts`, which redirects non-admins to `/admin/denied`. Grant
access by inserting into `admins`:

```sql
insert into admins (id, role)
select id, 'SUPER_ADMIN' from auth.users where email = 'you@example.com';
```

| Tab | What it does |
|---|---|
| Dashboard | KPIs, ticket mix, upcoming draws, activity |
| Campaigns | Full editor: prizes, dates, caps, merchants, media, terms, SEO |
| Vouchers | Generate batches, printed/distributed, store-copy counts |
| Draws | Close entries, record physical pulls, confirm, publish |
| Store | Products priced in Winnn, categories, orders |
| Merchants | Profiles, contacts, images, status |
| Invoices | Bill merchants with custom line items and tax |
| Customers | Search, wallet adjustments with mandatory reason |
| SEO | Site defaults, AI summary, per-campaign coverage |
| Settings | Branding, contact, page content, feature switches |

## Invariants

Money is `bigint` minor units of Winnn (1 Winnn = 1 USD = 100). Never floats.

Every state change goes through a `SECURITY DEFINER` Postgres function.
Customers hold SELECT policies only — there is not one client-side write policy
in the schema. Need a new write path? Write a function, don't add a policy.

`ticket_secrets` has RLS enabled and zero policies. Deliberate: a readable
secrets table means every unclaimed voucher in the country is free.

The draw is **physical**. `fn_record_draw_pull` records what the drum produced.
There is no RNG in this codebase and there must never be one.

## SEO / AI

- `/sitemap.xml` and `/robots.txt` are generated from live campaign data.
- `/llms.txt` serves a plain-text brief for AI crawlers, built from the site
  summary and every live campaign. Edit it in Admin > SEO.
- Per campaign: meta title/description, share image, keywords, an AI summary,
  and FAQ pairs.

## Known state

`next.config.mjs` sets `typescript.ignoreBuildErrors` and
`eslint.ignoreDuringBuilds`. Added to get past an opaque deploy failure; **not**
a good permanent state. Run `npx tsc --noEmit`, fix what it reports, turn both
off.

Source is deliberately ASCII-only and avoids `?.` / `??` in components. Same
debugging reason. Safe to relax once the pipeline is proven.

`supabase/migrations/0008` is a stub — see the README beside it.

## Not built yet

- Areeba payment adapter and the `fn_confirm_payment` webhook route
- Customer cart and checkout UI (`fn_store_checkout` exists and is tested)
- Voucher artwork renderer and the batch PDF job
- QR camera scanning (manual entry works)
- Reports and audit-log viewer

Cash on delivery must never be enabled for credit purchases — there is no
delivery event. Physical store orders only.
