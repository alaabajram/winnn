import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFmt } from "@/lib/format";
import EntryNumber from "@/components/entry-number";
import TicketStub from "@/components/ticket-stub";

export const dynamic = "force-dynamic";

export default async function MyTickets() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth || !auth.user) redirect("/login?next=/wallet");

  const { data: ticketRows } = await sb
    .from("tickets")
    .select("id,serial,source,status,registered_at,pool_copies,created_at,campaign_id,campaigns(name,slug,draw_date,hero_image_url,thumbnail_url,status)")
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
        image: t.campaigns ? (t.campaigns.hero_image_url || t.campaigns.thumbnail_url) : null,
        slips: 0, online: 0, offline: 0, doubled: 0, winner: false,
        onlineSerials: [] as string[],
        offlineSerials: [] as any[],
      };
    }
    const g = groups[k];
    g.slips += t.pool_copies || 1;
    if (t.source === "ONLINE") {
      g.online += 1;
      g.onlineSerials.push(t.serial);
    } else {
      g.offline += 1;
      g.offlineSerials.push({ serial: t.serial, doubled: !!t.registered_at });
    }
    if (t.registered_at) g.doubled += 1;
    if (t.status === "WINNER" || t.status === "AWAITING_CLAIM") g.winner = true;
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
            Buy a product from a deal, or enter the number from a shop voucher.
          </p>
          <Link href="/"
            className="mt-6 inline-block rounded-xl bg-primary-container px-6 py-4 font-label text-label-bold uppercase tracking-widest text-secondary-fixed">
            Browse deals
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {keys.map((k) => {
            const g = groups[k];
            return (
              <TicketStub
                key={k}
                campaign={g.name}
                slug={g.slug || k}
                drawDate={dateFmt(g.draw)}
                image={g.image}
                slips={g.slips}
                online={g.online}
                offline={g.offline}
                doubled={g.doubled}
                winner={g.winner}
                onlineSerials={g.onlineSerials}
                offlineSerials={g.offlineSerials}
              />
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <EntryNumber signedIn />
      </div>
    </div>
  );
}
