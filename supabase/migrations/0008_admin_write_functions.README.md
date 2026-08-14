# 0008 — admin write functions

These 16 functions are **applied and live** on project `hryebohnzyyokidxsczl`:

```
fn_slugify(text)
fn_admin_upsert_merchant(jsonb)
fn_admin_upsert_product(jsonb)
fn_admin_upsert_category(jsonb)
fn_admin_upsert_campaign(jsonb)
fn_admin_set_campaign_status(uuid, campaign_status)
fn_admin_set_prizes(uuid, jsonb)
fn_admin_set_campaign_merchants(uuid, jsonb)
fn_admin_update_settings(jsonb)
fn_admin_create_invoice(jsonb)
fn_admin_set_invoice_status(uuid, invoice_status)
```
plus the pre-existing `fn_admin_adjust_wallet`, `fn_admin_cancel_batch`,
`fn_admin_cancel_ticket`, `fn_admin_refund_order`, `fn_admin_set_batch_status`.

**This file is a stub, not the migration.** The bodies live in the database and
have not been written back to the repo. Before you rely on rebuilding a fresh
environment from `supabase/migrations/`, dump them:

```bash
supabase db dump --schema public --data-only=false > supabase/migrations/0008_admin_write_functions.sql
```

or run this in the SQL editor and save the output:

```sql
select string_agg(pg_get_functiondef(p.oid), E';\n\n' order by p.proname) || ';'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'fn_admin_%' or p.proname = 'fn_slugify');
```

Then append the grants:

```sql
revoke all on function fn_slugify(text) from public, anon, authenticated;
grant execute on function fn_admin_upsert_merchant(jsonb)              to authenticated;
grant execute on function fn_admin_upsert_product(jsonb)               to authenticated;
grant execute on function fn_admin_upsert_category(jsonb)              to authenticated;
grant execute on function fn_admin_upsert_campaign(jsonb)              to authenticated;
grant execute on function fn_admin_set_campaign_status(uuid, campaign_status) to authenticated;
grant execute on function fn_admin_set_prizes(uuid, jsonb)             to authenticated;
grant execute on function fn_admin_set_campaign_merchants(uuid, jsonb) to authenticated;
grant execute on function fn_admin_update_settings(jsonb)              to authenticated;
grant execute on function fn_admin_create_invoice(jsonb)               to authenticated;
grant execute on function fn_admin_set_invoice_status(uuid, invoice_status) to authenticated;
```

Every one re-checks `fn_require_admin()` internally, so `authenticated` is safe.
