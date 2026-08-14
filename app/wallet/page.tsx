import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn, dateFmt } from "@/lib/format";
import { artFor } from "@/lib/art";
import RedeemForm from "@/components/redeem-form";

export const dynamic = "force-dynamic";

const TXN: any = {
  TOP_UP: { label: "Top-up", icon: "arrow_upward", tone: "bg-tertiary-container text-on-tertiary-container" },
  PURCHASE: { label: "Store purchase", icon: "shopping_cart", tone: "bg-error-container text-on-error-container" },
  REFUND: { label: "Refund", icon: "undo", tone: "bg-tertiary-container text-on-tertiary-container" },
  ADJUSTMENT: { label: "Adjustment", icon: "tune", tone: "bg-secondary-container text-on-secondary-container" },
  REVERSAL: { label: "Reversal", icon: "block", tone: "bg-error-container text-on-error-container" },
};

export default async function Wallet() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth || !auth.user) redirect("/login?next=/wallet");

  const { data: wallet } = await sb.from("wallets").select("balance_cents").maybeSingle();
  const { data: ticketRows } = await sb
    .from("tickets")
    .select("id,serial,source,status,created_at,campaign_id,campaigns(name,slug,draw_date),merchants(name)")
    .in("status", ["ELIGIBLE", "WINNER", "AWAITING_CLAIM"])
    .order("created_at", { ascending: false });
  const { data: txnRows } = await sb
    .from("wallet_transactions")
    .select("id,type,amount_cents,description,created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const tickets: any[] = (ticketRows as any[]) || [];
  const txns: any[] = (txnRows as any[]) || [];

  const groups: any = {};
  tickets.forEach((t: any) => {
    const key = t.campaign_id;
    if (!groups[key]) {
      groups[key] = {
        name: t.campaigns ? t.campaigns.name : "Campaign",
        slug: t.campaigns ? t.campaigns.slug : "",
        draw: t.campaigns ? t.campaigns.draw_date : null,
        count: 0,
        serial: t.serial,
      };
    }
    groups[key].count += 1;
  });
  const groupKeys = Object.keys(groups);

  return (
    <div className="relative z-0 flex w-full flex-col">
      <div className="grid w-full grid-cols-12 gap-gutter">
        <div className="col-span-12 flex flex-col gap-gutter lg:col-span-8">
          <div className="relative isolate overflow-hidden rounded-3xl bg-primary-container p-8 text-on-primary-container shadow-2xl">
            <div className="absolute -right-32 -top-32 z-[-1] h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

            <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-2">
                <div className="mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary-fixed-dim">
                    account_balance_wallet
                  </span>
                  <span className="font-label text-label-bold uppercase tracking-widest text-on-primary-container opacity-80">
                    Available balance
                  </span>
                </div>
                <h1 className="num font-display text-display-lg tracking-tight text-secondary-fixed drop-shadow-md">
                  {winnn(wallet ? (wallet as any).balance_cents : 0)}{" "}
                  <span className="font-headline text-headline-sm uppercase text-secondary-fixed/70">
                    Winnn
                  </span>
                </h1>
                <p className="mt-1 font-body text-body-md text-on-primary-container/70">
                  1 Winnn = 1 USD, spendable in the store.
                </p>
              </div>

              <Link
                href="/"
                className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-secondary-fixed px-8 py-4 font-label text-label-bold uppercase tracking-widest text-on-secondary-fixed shadow-[0_0_20px_rgba(233,195,73,0.3)] transition-transform hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined transition-transform group-hover:rotate-90">
                  add_circle
                </span>
                Buy tickets
              </Link>
            </div>
          </div>

          <RedeemForm />

          <div className="mt-4 flex flex-col gap-4">
            <h3 className="px-2 font-headline text-headline-sm text-on-background">Recent activity</h3>
            {txns.length === 0 ? (
              <p className="px-2 font-body text-body-md text-on-surface-variant">No activity yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {txns.map((t: any) => {
                  const meta = TXN[t.type] || { label: t.type, icon: "receipt", tone: "bg-surface-variant text-on-surface-variant" };
                  const positive = t.amount_cents > 0;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className={"flex h-12 w-12 items-center justify-center rounded-xl " + meta.tone}>
                          <span className="material-symbols-outlined">{meta.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label text-label-bold text-on-surface">{meta.label}</span>
                          <span className="font-body text-sm text-on-surface-variant">
                            {dateFmt(t.created_at)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={
                          "num font-headline text-headline-sm " +
                          (positive ? "text-on-tertiary-container" : "text-on-surface")
                        }
                      >
                        {positive ? "+" : "-"}
                        {winnn(Math.abs(t.amount_cents))} W
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
          <div className="flex h-full flex-col rounded-3xl bg-surface-container-high p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline text-headline-sm text-on-surface">Your tickets</h2>
              <span className="num rounded-full bg-primary px-3 py-1 font-label text-xs font-semibold text-on-primary">
                {tickets.length} active
              </span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {groupKeys.length === 0 ? (
                <p className="font-body text-body-md text-on-surface-variant">
                  No tickets yet. Buy tickets for a campaign, or redeem a voucher from a partner store.
                </p>
              ) : (
                groupKeys.map((k) => {
                  const g = groups[k];
                  return (
                    <Link
                      href={g.slug ? "/campaigns/" + g.slug : "/wallet"}
                      key={k}
                      className="relative flex items-center overflow-hidden rounded-2xl bg-surface p-1 shadow-sm"
                    >
                      <div className="absolute -left-2 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full bg-surface-container-high" />
                      <div className="absolute -right-2 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full bg-surface-container-high" />

                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                        <div className={"h-full w-full " + artFor(g.slug || k)} />
                      </div>

                      <div className="mx-3 flex h-20 w-px flex-col justify-between overflow-hidden bg-outline-variant/30" />

                      <div className="flex flex-1 flex-col justify-center py-2 pr-4">
                        <span className="mb-1 font-label text-xs font-semibold uppercase tracking-widest text-secondary">
                          Draw {dateFmt(g.draw)}
                        </span>
                        <h4 className="line-clamp-2 font-headline text-[16px] leading-tight text-on-surface">
                          {g.name}
                        </h4>
                        <div className="mt-2 flex items-center gap-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                          <span className="num font-label text-xs font-semibold">x{g.count} entries</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {tickets.length > 0 ? (
              <div className="mt-6 border-t border-outline-variant/30 pt-4">
                <p className="mb-3 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Ticket serials
                </p>
                <div className="flex flex-wrap gap-2">
                  {tickets.slice(0, 14).map((t: any) => (
                    <span
                      key={t.id}
                      className={
                        "num rounded-md px-2 py-1 font-label text-[11px] font-semibold " +
                        (t.status === "WINNER"
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-surface text-on-surface-variant")
                      }
                    >
                      {t.serial}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
