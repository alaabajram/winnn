import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFmt } from "@/lib/format";
import { artFor } from "@/lib/art";
import VoucherEntry from "@/components/voucher-entry";

export const dynamic = "force-dynamic";

export default async function MyTickets() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth || !auth.user) redirect("/login?next=/wallet");

  const { data: ticketRows } = await sb
    .from("tickets")
    .select("id,serial,source,status,registered_at,pool_copies,created_at,campaign_id,campaigns(name,slug,draw_date,hero_image_url,status),merchants(name)")
    .in("status", ["ELIGIBLE", "WINNER", "AWAITING_CLAIM"])
    .order("created_at", { ascending: false });
  const tickets: any[] = (ticketRows as any[]) || [];

  const groups: any = {};
  tickets.forEach((t) => {
    const k = t.campaign_id;
    if (!groups[k]) {
      groups[k] = {
        name: t.campaigns ? t.campaigns.name : "Campaign",
        slug: t.campaigns ? t.campaigns.slug : "",
        draw: t.campaigns ? t.campaigns.draw_date : null,
        image: t.campaigns ? t.campaigns.hero_image_url : null,
        status: t.campaigns ? t.campaigns.status : null,
        slips: 0, online: 0, offline: 0, doubled: 0, winner: false,
        serials: [] as string[],
      };
    }
    const g = groups[k];
    g.slips += t.pool_copies || 1;
    if (t.source === "ONLINE") g.online += 1; else g.offline += 1;
    if (t.registered_at) g.doubled += 1;
    if (t.status === "WINNER" || t.status === "AWAITING_CLAIM") g.winner = true;
    g.serials.push(t.serial);
  });
  const keys = Object.keys(groups);
  const totalSlips = keys.reduce((a, k) => a + groups[k].slips, 0);

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6">
        <h1 className="font-display text-display-sm text-on-background sm:text-display-lg">
          My tickets
        </h1>
        <p className="mt-1 font-body text-body-md text-on-surface-variant">
          {totalSlips > 0
            ? totalSlips + " slip" + (totalSlips === 1 ? "" : "s") + " in upcoming draws"
            : "No tickets yet"}
        </p>
      </div>

      {keys.length === 0 ? (
        <div className="rounded-[28px] bg-surface-container p-10 text-center">
          <span className="material-symbols-outlined text-[44px] text-on-surface-variant">
            confirmation_number
          </span>
          <p className="mt-3 font-headline text-headline-sm text-on-surface">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-sm font-body text-body-md text-on-surface-variant">
            Buy a product from a deal, or register a voucher from a partner shop.
          </p>
          <Link href="/"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-4 font-label text-label-bold uppercase tracking-widest text-on-primary">
            Browse deals
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((k) => {
            const g = groups[k];
            return (
              <div key={k}
                className="relative overflow-hidden rounded-[24px] bg-surface-container-lowest shadow-md">
                <div className="flex">
                  <div className="relative w-28 shrink-0 sm:w-40">
                    {g.image ? (
                      <img src={g.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className={"h-full w-full " + artFor(g.slug || k)} />
                    )}
                  </div>

                  <div className="relative flex-1 p-5">
                    <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />

                    {g.winner ? (
                      <span className="mb-2 inline-block rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
                        Winner
                      </span>
                    ) : null}

                    <h2 className="font-headline text-headline-sm text-on-surface">{g.name}</h2>
                    <p className="num mt-1 font-body text-sm text-on-surface-variant">
                      Draw {dateFmt(g.draw)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="num rounded-lg bg-primary-container px-3 py-1.5 font-headline text-[15px] text-secondary-fixed">
                        {g.slips} slips
                      </span>
                      {g.online ? (
                        <span className="rounded-lg bg-surface-container px-2.5 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                          {g.online} bought
                        </span>
                      ) : null}
                      {g.offline ? (
                        <span className="rounded-lg bg-surface-container px-2.5 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                          {g.offline} voucher
                        </span>
                      ) : null}
                      {g.doubled ? (
                        <span className="rounded-lg bg-tertiary-fixed/30 px-2.5 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest text-on-tertiary-fixed">
                          {g.doubled} doubled
                        </span>
                      ) : null}
                    </div>

                    <details className="group mt-3">
                      <summary className="cursor-pointer font-label text-[12px] font-semibold uppercase tracking-widest text-primary">
                        Ticket numbers
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {g.serials.map((sn: string) => (
                          <span key={sn}
                            className="num rounded bg-surface-container px-2 py-1 font-label text-[11px] text-on-surface-variant">
                            {sn}
                          </span>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <VoucherEntry signedIn />
      </div>
    </div>
  );
}
