import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFmt } from "@/lib/format";
import { price } from "@/lib/money";
import SignOut from "@/components/sign-out";
import AddressBook from "@/components/address-book";
import InstallButton from "@/components/install-button";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth || !auth.user) redirect("/login?next=/profile");
  const user: any = auth.user;

  const { data: profileRow } = await sb.from("profiles").select("full_name,email,mobile").maybeSingle();
  const profile: any = profileRow;

  const { data: ticketRows } = await sb
    .from("tickets")
    .select("id,serial,source,status,campaign_id,campaigns(name,slug,draw_date)")
    .in("status", ["ELIGIBLE", "WINNER", "AWAITING_CLAIM"]);
  const tickets: any[] = (ticketRows as any[]) || [];

  const { data: addressRows } = await sb
    .from("customer_addresses").select("*").order("is_default", { ascending: false });

  const { data: orderRows } = await sb
    .from("orders")
    .select("id,order_no,total_cents,status,payment_state,tickets_issued,created_at,order_items(name_snapshot,quantity)")
    .order("created_at", { ascending: false })
    .limit(5);
  const orders: any[] = (orderRows as any[]) || [];

  const groups: any = {};
  tickets.forEach((t: any) => {
    const k = t.campaign_id;
    if (!groups[k]) {
      groups[k] = {
        name: t.campaigns ? t.campaigns.name : "Campaign",
        slug: t.campaigns ? t.campaigns.slug : "",
        draw: t.campaigns ? t.campaigns.draw_date : null,
        online: 0,
        offline: 0,
        count: 0,
      };
    }
    groups[k].count += 1;
    if (t.source === "ONLINE") groups[k].online += 1;
    else groups[k].offline += 1;
  });
  const groupKeys = Object.keys(groups);

  const displayName = (profile && profile.full_name) || user.email || "Your account";

  return (
    <div className="relative flex w-full flex-col">
      <div className="grid w-full grid-cols-1 gap-gutter pb-16 lg:grid-cols-12">
        <div className="relative col-span-1 flex flex-col gap-8 lg:col-span-4">
          <div className="sticky top-28 flex flex-col items-center rounded-3xl bg-surface-container-low p-8 text-center shadow-2xl">
            <div className="relative mb-6">
              <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full border-4 border-surface bg-primary-container shadow-xl">
                <span className="font-display text-display-sm text-secondary-fixed">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            </div>

            <h1 className="mb-2 font-display text-headline-md text-on-surface">{displayName}</h1>
            <p className="mb-8 inline-block rounded-full bg-secondary-container/20 px-4 py-1.5 font-label text-label-bold uppercase tracking-[0.2em] text-secondary backdrop-blur-sm">
              Member
            </p>

            <div className="mb-6 w-full">
              <InstallButton />
            </div>

            <div className="w-full space-y-4 text-left">
              <div className="group flex items-center gap-4 rounded-2xl bg-surface p-4 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container/5 text-on-surface-variant transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-label text-label-bold text-on-surface-variant">Email address</p>
                  <p className="truncate font-body text-body-md text-on-surface">
                    {(profile && profile.email) || user.email}
                  </p>
                </div>
              </div>

              <div className="group flex items-center gap-4 rounded-2xl bg-surface p-4 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container/5 text-on-surface-variant transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-label text-label-bold text-on-surface-variant">Mobile number</p>
                  <p className="truncate font-body text-body-md text-on-surface">
                    {(profile && profile.mobile) || "Not added"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-12 pt-4 lg:col-span-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between border-b-2 border-surface-variant pb-4">
              <div>
                <h2 className="font-display text-headline-md text-on-background">My tickets</h2>
                <p className="mt-2 font-body text-body-md text-on-surface-variant">
                  Active entries for upcoming draws.
                </p>
              </div>
              <Link
                href="/wallet"
                className="group flex items-center gap-1 font-label text-label-bold uppercase tracking-widest text-primary transition-colors hover:text-secondary"
              >
                Wallet
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>

            {groupKeys.length === 0 ? (
              <p className="font-body text-body-md text-on-surface-variant">No active tickets yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {groupKeys.map((k) => {
                  const g = groups[k];
                  return (
                    <div
                      key={k}
                      className="group relative flex h-[280px] flex-col justify-between overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl transition-all duration-300 hover:shadow-2xl"
                    >
                      <div className="absolute -mr-16 -mt-16 right-0 top-0 h-32 w-32 rounded-bl-full bg-primary-container opacity-5 transition-transform duration-700 group-hover:scale-150" />
                      <div className="relative z-10 flex-1 p-6">
                        <div className="mb-6 flex items-start justify-between">
                          <span className="rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container shadow-sm">
                            {g.online > 0 && g.offline > 0
                              ? "Online + store"
                              : g.online > 0
                              ? "Online entry"
                              : "Store entry"}
                          </span>
                        </div>
                        <h3 className="mb-2 font-headline text-headline-md leading-tight text-on-surface">
                          {g.name}
                        </h3>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                          <span className="num font-body text-body-lg font-medium">{g.count} tickets</span>
                        </div>
                      </div>

                      <div className="relative flex h-20 bg-surface-container">
                        <div className="absolute -top-3 left-8 z-20 h-6 w-6 rounded-full bg-surface-container-lowest shadow-inner" />
                        <div className="absolute -top-3 right-8 z-20 h-6 w-6 rounded-full bg-surface-container-lowest shadow-inner" />
                        <div className="relative flex flex-1 flex-col justify-center border-r-2 border-dashed border-outline-variant/30 px-8">
                          <p className="mb-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                            Draw date
                          </p>
                          <p className="font-label text-label-bold text-on-surface">{dateFmt(g.draw)}</p>
                        </div>
                        <Link
                          href={g.slug ? "/campaigns/" + g.slug : "/wallet"}
                          className="flex w-32 items-center justify-center bg-primary-container text-on-primary-container transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
                        >
                          <span className="font-label text-label-bold uppercase tracking-widest">Details</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between border-b-2 border-surface-variant pb-4">
              <div>
                <h2 className="font-display text-headline-md text-on-background">My orders</h2>
                <p className="mt-2 font-body text-body-md text-on-surface-variant">
                  Recent store purchases.
                </p>
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="font-body text-body-md text-on-surface-variant">
                No orders yet. Anything you buy in the store will appear here.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {orders.map((o: any) => {
                  const items: any[] = (o.order_items as any[]) || [];
                  const first = items.length ? items[0] : null;
                  return (
                    <div
                      key={o.id}
                      className="flex flex-col items-start gap-6 rounded-2xl bg-surface-container-lowest p-6 shadow-md transition-shadow hover:shadow-xl sm:flex-row sm:items-center"
                    >
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface-variant text-on-surface-variant">
                        <span className="material-symbols-outlined text-[32px]">inventory_2</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-3">
                          <span className="num rounded-md bg-surface-container px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                            {o.order_no}
                          </span>
                          <span className={
                            "rounded-md px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest " +
                            (o.payment_state === "PAID"
                              ? "bg-tertiary-fixed/30 text-on-tertiary-container"
                              : o.payment_state === "CANCELLED"
                              ? "bg-error-container text-on-error-container"
                              : "bg-secondary-container text-on-secondary-container")
                          }>
                            {o.payment_state === "AWAITING_PAYMENT" ? "Awaiting payment" : o.payment_state}
                          </span>
                          {o.tickets_issued ? (
                            <span className="num rounded-md bg-primary-container px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-secondary-fixed">
                              {o.tickets_issued} tickets
                            </span>
                          ) : null}
                        </div>
                        <h4 className="truncate font-headline text-headline-sm text-on-surface">
                          {first ? first.name_snapshot : "Order"}
                          {items.length > 1 ? " + " + (items.length - 1) + " more" : ""}
                        </h4>
                        <p className="mt-1 font-body text-body-md text-on-surface-variant">
                          {dateFmt(o.created_at)}
                        </p>
                      </div>
                      <p className="num font-headline text-headline-sm text-on-surface">
                        {price(o.total_cents)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AddressBook initial={(addressRows as any[]) || []} />

          <div className="mt-4 flex justify-center">
            <div className="w-full max-w-xs">
              <SignOut />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
