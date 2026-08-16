import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn, countdown, dateFmt } from "@/lib/format";
import { artFor, splitCountdown } from "@/lib/art";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = await supabaseServer();

  const { data: liveRows } = await sb
    .from("campaigns")
    .select("id,name,slug,description,type,draw_date,sales_close_at,ticket_price_cents,hero_image_url,thumbnail_url,campaign_prizes(position,title,value_cents)")
    .eq("status", "LIVE")
    .order("draw_date", { ascending: true });

  const { data: pastRows } = await sb
    .from("draws")
    .select("id,youtube_video_id,published_at,pool_total_count,campaigns(name,slug),draw_winners(position,claim_status,tickets(serial),profiles(full_name))")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false })
    .limit(3);

  const { data: auth } = await sb.auth.getUser();
  const signedIn = !!(auth && auth.user);

  const counts: any = {};
  if (signedIn) {
    const { data: mine } = await sb.from("tickets").select("campaign_id").eq("status", "ELIGIBLE");
    ((mine as any[]) || []).forEach((t: any) => {
      counts[t.campaign_id] = (counts[t.campaign_id] || 0) + 1;
    });
  }

  const live: any[] = (liveRows as any[]) || [];
  const past: any[] = (pastRows as any[]) || [];
  const hero: any = live[0];
  const heroPrize = hero && hero.campaign_prizes
    ? hero.campaign_prizes.find((p: any) => p.position === 1)
    : null;
  const cd = hero ? splitCountdown(hero.sales_close_at) : null;
  const heroTickets = hero ? counts[hero.id] || 0 : 0;

  return (
    <div className="relative flex w-full flex-col pb-margin-desktop">
      {hero ? (
        <section className="relative mb-12 -mt-4 w-full overflow-hidden rounded-[24px] shadow-2xl">
          {hero.hero_image_url ? (
            <img src={hero.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className={"absolute inset-0 " + artFor(hero.slug)} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-primary/10" />

          <div className="relative z-10 flex min-h-[480px] flex-col justify-between px-6 py-12 sm:px-12 sm:py-20">
            <div className="flex w-full items-start justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-surface/20 bg-surface/10 px-4 py-1.5 backdrop-blur-md">
                <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
                  workspace_premium
                </span>
                <span className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-primary">
                  {hero.type === "HYBRID" ? "Online + In store" : hero.type === "ONLINE" ? "Online draw" : "In store draw"}
                </span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="mb-1 rounded bg-surface px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant shadow-sm">
                  Your entries
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-outline/20 bg-surface-container-high/90 px-3 py-1.5 backdrop-blur-md">
                  <span className="material-symbols-outlined text-[14px] text-secondary">local_activity</span>
                  <span className="num font-headline text-headline-sm text-on-surface">
                    {signedIn ? heroTickets : 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto flex max-w-2xl flex-col">
              <h1 className="mb-2 font-display text-display-sm leading-tight text-on-primary drop-shadow-md sm:text-display-lg">
                {heroPrize && heroPrize.title
                  ? heroPrize.title.split("-").slice(1).join("-").trim() || heroPrize.title
                  : hero.name}
              </h1>
              <p className="mb-8 max-w-lg font-body text-body-lg leading-relaxed text-primary-fixed-dim">
                {hero.description}
              </p>

              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
                <Link
                  href={"/campaigns/" + hero.slug}
                  className="flex items-center gap-2 rounded-full bg-secondary-container px-8 py-4 font-label text-label-bold uppercase tracking-widest text-on-secondary-container shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-fixed hover:shadow-xl"
                >
                  Enter now
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>

                {cd ? (
                  <div className="flex flex-col">
                    <span className="mb-1 font-label text-[10px] font-semibold uppercase tracking-widest text-primary-fixed">
                      Entry closes in
                    </span>
                    <div className="num flex gap-3 font-headline text-headline-sm tracking-tight text-on-primary drop-shadow-md">
                      {[
                        { v: cd.days, l: "Days" },
                        { v: cd.hours, l: "Hrs" },
                        { v: cd.mins, l: "Min" },
                      ].map((b, i) => (
                        <div key={b.l} className="flex items-center gap-3">
                          {i > 0 ? <span className="mt-2 opacity-50">:</span> : null}
                          <div className="flex flex-col items-center rounded-lg border border-outline-variant/10 bg-primary-container/60 px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md">
                            <span className="text-secondary-fixed">{b.v}</span>
                            <span className="mt-1 font-label text-[9px] font-semibold uppercase tracking-widest text-on-primary-container">
                              {b.l}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mb-8 flex items-center gap-4">
        <h2 className="font-headline text-headline-md tracking-tight text-on-background">Active campaigns</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-outline-variant/30 to-transparent" />
      </div>

      <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {live.map((c: any) => {
          const prize = c.campaign_prizes ? c.campaign_prizes.find((x: any) => x.position === 1) : null;
          const mine = counts[c.id] || 0;
          return (
            <article
              key={c.id}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface shadow-md transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative h-48 w-full overflow-hidden">
                {c.thumbnail_url || c.hero_image_url ? (
                  <img
                    src={c.thumbnail_url || c.hero_image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className={"absolute inset-0 transition-transform duration-700 group-hover:scale-110 " + artFor(c.slug)} />
                )}
                <div className="absolute left-4 top-4 rounded bg-surface/90 px-3 py-1 shadow-sm backdrop-blur-md">
                  <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface">
                    Draw {dateFmt(c.draw_date)}
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex flex-1 flex-col p-6">
                <div className="mb-4">
                  <h3 className="mb-1 line-clamp-1 font-headline text-headline-sm uppercase text-on-surface">
                    {c.name}
                  </h3>
                  <p className="font-body text-body-md font-medium text-secondary">
                    {prize ? prize.title : "Prize to be announced"}
                  </p>
                </div>

                <div className="mb-4 flex items-center justify-between border-b border-t border-surface-variant/50 py-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-outline">sell</span>
                    <span className="num font-label text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {winnn(c.ticket_price_cents)} Winnn = 1 ticket
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">local_activity</span>
                    <span className="num font-label text-[14px] font-semibold text-on-surface">{mine}</span>
                  </div>
                </div>

                <Link
                  href={"/campaigns/" + c.slug}
                  className="group/btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/40 px-4 py-3 font-label text-label-bold uppercase tracking-widest text-on-surface transition-colors hover:border-outline hover:bg-surface-container-low"
                >
                  View campaign
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover/btn:translate-x-1">
                    trending_flat
                  </span>
                </Link>
              </div>
            </article>
          );
        })}
        {live.length === 0 ? (
          <p className="font-body text-body-md text-on-surface-variant">No live campaigns right now.</p>
        ) : null}
      </div>

      {past.length > 0 ? (
        <div className="relative overflow-hidden rounded-[24px] bg-surface-container p-8 shadow-inner sm:p-12">
          <div className="relative z-10 mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="mb-1 font-headline text-headline-md tracking-tight text-on-surface">
                Previous results
              </h2>
              <p className="font-body text-body-md text-on-surface-variant">Transparency in every draw.</p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            {past.map((d: any) => {
              const winner = d.draw_winners && d.draw_winners.length ? d.draw_winners[0] : null;
              const name = winner && winner.profiles ? winner.profiles.full_name : null;
              const masked = name
                ? name.split(" ").map((p: string) => p[0] + "****").join(" ")
                : "Unclaimed";
              return (
                <Link
                  key={d.id}
                  href={"/results/" + (d.campaigns ? d.campaigns.slug : "")}
                  className="flex flex-col items-center gap-8 rounded-2xl border border-outline-variant/20 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md md:flex-row"
                >
                  <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-xl md:w-48">
                    <div className={"absolute inset-0 " + artFor(d.id)} />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/60 to-transparent p-3">
                      <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-primary">
                        {d.youtube_video_id ? "Watch the draw" : "Draw concluded"}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-1 flex-col">
                    <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                      <h3 className="font-headline text-headline-sm uppercase text-on-surface">
                        {d.campaigns ? d.campaigns.name : "Campaign"}
                      </h3>
                      <span className="rounded-full border border-outline-variant/30 bg-surface-container px-3 py-1 font-label text-[12px] font-semibold text-on-surface-variant">
                        {dateFmt(d.published_at)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-6 rounded-xl border border-surface-variant/50 bg-surface-container-low p-4 sm:flex-row">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-inner">
                          <span className="material-symbols-outlined text-[24px]">emoji_events</span>
                        </div>
                        <div>
                          <p className="mb-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                            Winner
                          </p>
                          <p className="font-headline text-[16px] text-on-surface">{masked}</p>
                        </div>
                      </div>

                      <div className="hidden h-10 w-px self-center bg-outline-variant/30 sm:block" />

                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center rounded-lg border-2 border-dashed border-secondary/40 bg-surface px-4 py-2">
                          <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface-container-low" />
                          <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface-container-low" />
                          <div>
                            <p className="mb-0.5 text-center font-label text-[10px] font-semibold uppercase tracking-widest text-secondary">
                              Winning ticket
                            </p>
                            <p className="num font-headline text-[14px] tracking-widest text-on-surface">
                              {winner && winner.tickets ? winner.tickets.serial : "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="hidden h-10 w-px self-center bg-outline-variant/30 sm:block" />

                      <div className="flex items-center gap-4">
                        <div>
                          <p className="mb-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                            Tickets in drum
                          </p>
                          <p className="num font-headline text-[16px] text-on-surface">{d.pool_total_count}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
