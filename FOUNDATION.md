# WINNN — Data Foundation

Read this before writing any application code. The three migrations in
`supabase/migrations/` are the contract. They have been executed against
PostgreSQL 16 and pass the suite in `test/01_e2e.sql`, including a
12-way concurrent double-spend test.

---

## Non-negotiable invariants

1. **The service-role key never reaches the browser.** Route handlers and
   server actions only.
2. **Customers have SELECT policies and nothing else.** There is no
   INSERT/UPDATE/DELETE policy for `authenticated` anywhere. Every state
   change goes through a `SECURITY DEFINER` function. If you need a new
   write path, write a function — do not add a policy.
3. **`ticket_secrets` has RLS enabled and zero policies.** Deny-all. If a
   customer can read that table, every unclaimed voucher in Lebanon is
   free. Never join it into a client-visible view.
4. **Money is `bigint` minor units of Winnn.** 1 Winnn = 1 USD = 100.
   No floats, ever. Format for display only at the edge.
5. **Nothing is deleted.** Losing tickets become `NOT_WON`; the wallet UI
   filters them out and the Profile activity feed reads the same rows.
   The ledger, audit log, draw pool and pull history are append-only,
   enforced by triggers.
6. **The drum decides the winner, not the server.** `fn_record_draw_pull`
   validates and records a physical result. There is no RNG anywhere and
   there must never be one.
7. **Never trust a client total.** `fn_store_checkout` recomputes from
   `products`. It takes wallet and product row locks and debits before
   touching stock.

---

## The unified ticket model

`tickets` is one table for both sources, with one serial space per
campaign:

| | offline | online |
|---|---|---|
| created | at batch generation | at payment confirmation |
| serial block | `offline_serial_start … offline_serial_end` | `online_serial_start …` upward |
| initial status | `UNASSIGNED` (no owner) | `ELIGIBLE` (owner known) |
| secret code | yes, in `ticket_secrets` | none — bound to a customer already |

Serial is public (`SUM26-004821`) and printed large for reading aloud.
The secret is 64 bits of `gen_random_bytes`, printed small and encoded in
the QR. **Redemption requires both.** Serials are sequential and
therefore enumerable — that is intentional and safe only because the
secret is what redeems.

An offline ticket that is never scanned still goes in the drum, so it can
win with no owner on record. That produces `AWAITING_CLAIM`, and the
holder of the paper claims it with `fn_claim_winning_ticket`. **Your T&C
needs a claim window.**

---

## Function reference

| Function | Caller | Purpose |
|---|---|---|
| `fn_confirm_payment` | server only | Idempotent webhook entry. Credits wallet, mints online tickets. |
| `fn_redeem_offline_ticket` | authenticated | Scan/type a voucher. |
| `fn_claim_winning_ticket` | authenticated | Claim an unscanned winner. |
| `fn_store_checkout` | authenticated | Buy with Winnn. |
| `fn_generate_offline_batch` | admin | Allocate serials + secrets. |
| `fn_admin_set_batch_status` | admin | PRINTED / DISTRIBUTED, store-copy count. |
| `fn_close_campaign_sales` | admin | Freeze the pool. **Run before the print job.** |
| `fn_record_draw_pull` | admin | Record one physical pull. |
| `fn_confirm_draw` / `fn_publish_draw` | admin | Two-step publication. |
| `fn_admin_adjust_wallet` / `fn_admin_refund_order` | admin | Ledger corrections. |

`fn_record_draw_pull` **returns** invalid results rather than raising, so
the failed pull persists. Raising would roll the record back. Do not
"improve" this into an exception.

### Error codes to map in the UI

`ERR_INSUFFICIENT_CREDITS`, `ERR_OUT_OF_STOCK`, `ERR_PRODUCT_UNAVAILABLE`,
`ERR_INVALID_TICKET`, `ERR_TICKET_ALREADY_REDEEMED`, `ERR_TICKET_CANCELLED`,
`ERR_TICKET_EXPIRED`, `ERR_TICKET_NOT_CLAIMABLE`, `ERR_CAMPAIGN_NOT_LIVE`,
`ERR_SALES_CLOSED`, `ERR_CUSTOMER_TICKET_CAP`, `ERR_CAMPAIGN_TICKET_CAP`,
`ERR_NOT_AUTHORIZED`, `ERR_NOT_AUTHENTICATED`.

`ERR_INVALID_TICKET` is deliberately generic — it covers both a bad
serial and a bad code so the API cannot be used to confirm which serials
exist. Keep it that way, and rate-limit redemption per account.

---

## Draw-day sequence

```
1. fn_close_campaign_sales(campaign)   → pool frozen, counts recorded
2. generate drum-slip PDF for online serials from draw_pool_entries
3. print, cut, add to drum with the collected store copies
4. physical draw on camera
5. fn_record_draw_pull(draw, position, serial) per prize
6. fn_confirm_draw(draw)
7. fn_publish_draw(draw, youtube_video_id)   → losers become NOT_WON
```

`draws` stores `pool_online_count`, `pool_offline_count` and
`store_copies_received`. Publish those three numbers on the results page.
For a physical draw, that reconciliation *is* the fairness argument.

---

## What still needs building

**Application layer**
- Payment adapter interface with an Areeba implementation. Keep the
  provider behind a narrow interface: `createSession`, `verifyWebhook`,
  `parseEvent`. Everything downstream calls `fn_confirm_payment`.
- Reference-payment reconciliation screen for Whish/OMT, where
  confirmation arrives late. `payments.expires_at` is the hold expiry.
- **Cash on delivery must be disabled for credit purchases.** It has no
  delivery event. Physical store orders only.
- Ticket artwork renderer: one slot-based template (sponsor logo, banner,
  prize text, two brand colours), two outputs — the two-part customer
  voucher and the minimal drum slip, 24 to an A4 sheet.
- Batch PDF generation as a **background job**, 500 vouchers per file, to
  Supabase Storage with a pollable status. 100k in a serverless request
  will time out.
- YouTube URL parsing (watch / youtu.be / embed → video ID) in the app;
  the column stores the ID only.

**Auth note.** SMS OTP deliverability in Lebanon is inconsistent and
metered. Email OTP as primary with WhatsApp as the fallback channel is
likely to cost less and work better; test before committing.

**iOS caveat.** Camera access for QR scanning inside an installed PWA on
iOS has been historically unreliable. Manual code entry is the primary
path until you have tested on a real device.

---

## Still undecided

1. **Do Winnn expire?** Currently no. If yes, the ledger needs FIFO
   consumption by batch rather than a single balance — significantly more
   work. Recommend: no expiry in V1, stated in the T&C.
2. **Chargeback outcome.** T&C cannot stop a card chargeback. Decide now:
   `REVERSAL` ledger entry (may drive the balance negative — permitted by
   the schema), account frozen, and the T&C must already say a win is
   void if the underlying payment is reversed. Whish and OMT payments are
   largely irrevocable, so exposure is limited to the card share.
3. **Unclaimed prize window.** Needed for `AWAITING_CLAIM`.
4. **Prize payout and withholding.** The national lottery pays large
   prizes by cheque net of tax; expect a comparable question and a
   winner-KYC step. Not a code problem, but it belongs in the T&C.
5. **Legality of paid entry.** Unresolved and load-bearing. Get Lebanese
   counsel before launch, and get your acquirer's written position on the
   business category before integrating Areeba.

---

## Suggested build order

Each phase should be verifiable before the next begins.

1. Apply migrations, wire Supabase Auth, confirm the new-user trigger
   creates a profile and wallet.
2. Admin: merchants, campaign creation wizard, publish validation.
3. Online purchase end to end against Areeba sandbox → tickets in wallet.
4. Offline: batch generation, PDF job, scan/redeem.
5. Store, cart, checkout, orders.
6. Draw: close, record, confirm, publish, results page with video.
7. PWA shell, manifest, service worker, install prompts.
8. Demo data (5 merchants, 5 campaigns, 20 customers, 20 products, 100
   vouchers, 20 orders, past winners).

Reports and notifications are the right things to cut from V1. Neither
test flow touches them.

---

## Deployed project

| | |
|---|---|
| Project | `winnn` — `hryebohnzyyokidxsczl` |
| Region | eu-central-1 (Frankfurt) |
| URL | `https://hryebohnzyyokidxsczl.supabase.co` |
| Migrations applied | 0001–0005 |

All five migrations are live and the full flow has been executed against
it end to end. The database is empty of test data.

**Two production-only fixes are in 0004 and 0005 — do not drop them:**

- **0004** is a security fix. Supabase grants `EXECUTE` on public-schema
  functions to `anon` and `authenticated` by default, so the `revoke ...
  from public` in 0003 was not enough. Without 0004, anyone holding the
  anon key can call `fn_wallet_apply` over `/rest/v1/rpc` and credit
  themselves unlimited Winnn. Verify the grant matrix after any new
  function is added.
- **0005** puts `extensions` on the pinned `search_path` of the two
  functions that call `gen_random_bytes`, since pgcrypto lives in
  `extensions` on Supabase rather than `public`. Any new function using
  pgcrypto needs the same treatment.

Run `get_advisors` after every schema change. The one remaining INFO
notice — `ticket_secrets` has RLS enabled with no policy — is intentional
and must stay that way.

## Running the tests

```bash
psql -d winnn -f test/00_auth_stub.sql        # LOCAL ONLY — never deploy
psql -d winnn -f supabase/migrations/0001_schema.sql
psql -d winnn -f supabase/migrations/0002_rls.sql
psql -d winnn -f supabase/migrations/0003_functions.sql
psql -d winnn -f test/01_e2e.sql
```

`00_auth_stub.sql` fakes `auth.users` and `auth.uid()` for local runs.
Supabase provides both. Do not include it in a deployed migration set.
