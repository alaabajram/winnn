import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { winnn, dateFmt } from "@/lib/format";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/lib/status";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { sb } = await requireAdmin();

  const [
    campaignsLive, customers, ticketsAll, ticketsOnline, ticketsOffline,
    ordersCount, invoicesOpen,
  ] = await Promise.all([
    sb.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "LIVE"),
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("tickets").select("id", { count: "exact", head: true }),
    sb.from("tickets").select("id", { count: "exact", head: true }).eq("source", "ONLINE"),
    sb.from("tickets").select("id", { count: "exact", head: true }).eq("source", "OFFLINE"),
    sb.from("orders").select("id", { count: "exact", head: true }),
    sb.from("merchant_invoices").select("id", { count: "exact", head: true }).in("status", ["DRAFT", "SENT", "OVERDUE"]),
  ]);

  const { data: soldRows } = await sb
    .from("wallet_transactions").select("amount_cents").eq("type", "TOP_UP");
  const sold = ((soldRows as any[]) || []).reduce((a, r) => a + Number(r.amount_cents || 0), 0);

  const { data: heldRows } = await sb.from("wallets").select("balance_cents");
  const held = ((heldRows as any[]) || []).reduce((a, r) => a + Number(r.balance_cents || 0), 0);

  const { data: upcoming } = await sb
    .from("campaigns")
    .select("id,name,slug,status,draw_date,sales_close_at")
    .in("status", ["LIVE", "SALES_CLOSED"])
    .order("draw_date", { ascending: true })
    .limit(5);

  const { data: activity } = await sb
    .from("audit_logs").select("id,action,module,description,created_at")
    .order("created_at", { ascending: false }).limit(8);

  const kpis = [
    { label: "Live campaigns", value: campaignsLive.count || 0, icon: "campaign" },
    { label: "Customers", value: customers.count || 0, icon: "group" },
    { label: "Winnn sold", value: winnn(sold), icon: "payments" },
    { label: "Wallet liability", value: winnn(held), icon: "account_balance", warn: true },
    { label: "Tickets total", value: ticketsAll.count || 0, icon: "local_activity" },
    { label: "Orders", value: ordersCount.count || 0, icon: "shopping_bag" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Dashboard</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Platform overview. Wallet liability is Winnn customers hold and can still spend.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <span className="material-symbols-outlined absolute right-3 top-3 text-[28px] text-outline-variant/40">
              {k.icon}
            </span>
            <p className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              {k.label}
            </p>
            <p className="num mt-2 font-headline text-headline-md text-on-surface">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 font-headline text-headline-sm text-on-surface">Ticket mix</h2>
          <div className="mb-3 flex h-4 overflow-hidden rounded-full bg-surface-variant">
            <div
              className="bg-primary-container"
              style={{
                width:
                  (ticketsAll.count
                    ? ((ticketsOnline.count || 0) / ticketsAll.count) * 100
                    : 0) + "%",
              }}
            />
            <div
              className="bg-secondary-container"
              style={{
                width:
                  (ticketsAll.count
                    ? ((ticketsOffline.count || 0) / ticketsAll.count) * 100
                    : 0) + "%",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <span className="flex items-center gap-2 font-body text-body-md text-on-surface-variant">
              <span className="h-3 w-3 rounded-full bg-primary-container" /> Online{" "}
              <span className="num font-semibold text-on-surface">{ticketsOnline.count || 0}</span>
            </span>
            <span className="flex items-center gap-2 font-body text-body-md text-on-surface-variant">
              <span className="h-3 w-3 rounded-full bg-secondary-container" /> In store{" "}
              <span className="num font-semibold text-on-surface">{ticketsOffline.count || 0}</span>
            </span>
          </div>

          <h3 className="mb-4 mt-8 font-headline text-headline-sm text-on-surface">Upcoming draws</h3>
          <div className="space-y-2">
            {((upcoming as any[]) || []).map((c) => (
              <Link
                key={c.id}
                href={"/admin/draws?campaign=" + c.id}
                className="flex items-center justify-between rounded-xl bg-surface-container p-4 transition-colors hover:bg-surface-variant"
              >
                <div>
                  <p className="font-label text-label-bold text-on-surface">{c.name}</p>
                  <p className="font-body text-sm text-on-surface-variant">
                    Draw {dateFmt(c.draw_date)}
                  </p>
                </div>
                <Pill tone={statusTone(c.status)}>{c.status}</Pill>
              </Link>
            ))}
            {!((upcoming as any[]) || []).length ? (
              <p className="font-body text-body-md text-on-surface-variant">No draws scheduled.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="mb-5 font-headline text-headline-sm text-on-surface">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/campaigns/new", label: "New campaign", icon: "add_circle" },
              { href: "/admin/merchants", label: "Add merchant", icon: "storefront" },
              { href: "/admin/vouchers", label: "Generate vouchers", icon: "confirmation_number" },
              { href: "/admin/store", label: "Add product", icon: "inventory_2" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center gap-2 rounded-xl bg-primary-container p-4 text-center text-on-primary-container transition-transform hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-secondary-fixed">{a.icon}</span>
                <span className="font-label text-[11px] font-semibold uppercase tracking-widest">
                  {a.label}
                </span>
              </Link>
            ))}
          </div>

          {invoicesOpen.count ? (
            <Link
              href="/admin/invoices"
              className="mt-4 flex items-center gap-3 rounded-xl bg-secondary-container/30 p-4"
            >
              <span className="material-symbols-outlined text-on-secondary-container">receipt_long</span>
              <span className="font-body text-body-md text-on-surface">
                <span className="num font-semibold">{invoicesOpen.count}</span> unpaid invoice
                {invoicesOpen.count === 1 ? "" : "s"}
              </span>
            </Link>
          ) : null}

          <h3 className="mb-3 mt-8 font-headline text-headline-sm text-on-surface">Recent activity</h3>
          <ul className="space-y-3">
            {((activity as any[]) || []).map((a) => (
              <li key={a.id} className="border-b border-outline-variant/20 pb-3 last:border-0">
                <p className="font-label text-[12px] font-semibold text-on-surface">
                  {a.action.replace(/_/g, " ").toLowerCase()}
                </p>
                <p className="font-body text-sm text-on-surface-variant">
                  {a.description || a.module}
                </p>
              </li>
            ))}
            {!((activity as any[]) || []).length ? (
              <li className="font-body text-body-md text-on-surface-variant">Nothing yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
