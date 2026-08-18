import Link from "next/link";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { price } from "@/lib/money";
import { dateFmt } from "@/lib/format";
import { artFor, splitCountdown } from "@/lib/art";
import DistrictPicker from "@/components/district-picker";
import VoucherEntry from "@/components/voucher-entry";

export const dynamic = "force-dynamic";

export default async function Deals(props: any) {
  const search = await props.searchParams;
  const districtSlug = search && search.d ? String(search.d) : "";

  const sb = await supabaseServer();

  const { data: districtRows } = await sb
    .from("districts").select("id,slug,name,governorate").eq("is_active", true).order("sort_order");
  const districts: any[] = (districtRows as any[]) || [];
  const active = districts.find((d) => d.slug === districtSlug);

  let q = sb
    .from("campaigns")
    .select("id,name,slug,description,type,draw_date,sales_close_at,hero_image_url,thumbnail_url,is_nationwide,district_id,districts(name),campaign_prizes(position,title,value_cents),campaign_products(tickets_per_unit,is_primary,products(id,name,slug,price_cents,stock,images,status))")
    .eq("status", "LIVE")
    .order("draw_date", { ascending: true });

  if (active) q = q.or("is_nationwide.eq.true,district_id.eq." + active.id);

  const { data: liveRows } = await q;
  const live: any[] = (liveRows as any[]) || [];

  const { data: pastRows } = await sb
    .from("draws")
    .select("id,published_at,pool_total_count,youtube_video_id,campaigns(name,slug),draw_winners(tickets(serial),profiles(full_name))")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false })
    .limit(3);
  const past: any[] = (pastRows as any[]) || [];

  const { data: auth } = await sb.auth.getUser();
  const signedIn = !!(auth && auth.user);

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-sm text-on-background sm:text-display-lg">Deals</h1>
          <p className="mt-1 font-body text-body-md text-on-surface-variant">
            Buy the product. The tickets come free.
          </p>
        </div>
        <Suspense fallback={<div className="h-11 w-32 animate-pulse rounded-full bg-surface-container" />}>
          <DistrictPicker districts={districts} active={districtSlug} />
        </Suspense>
      </div>

      {live.length === 0 ? (
        <div className="rounded-3xl bg-surface-container p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
            location_off
          </span>
          <p className="mt-3 font-headline text-headline-sm text-on-surface">
            Nothing in {active ? active.name : "your area"} yet
          </p>
          <Link href="/" className="mt-4 inline-block font-label text-label-bold text-primary hover:underline">
            See all of Lebanon
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {live.map((c: any) => {
          const prizes: any[] = (c.campaign_prizes as any[]) || [];
          const prize = prizes.slice().sort((a, b) => a.position - b.position)[0];
          const links: any[] = ((c.campaign_products as any[]) || [])
            .filter((x) => x.products && x.products.status === "ACTIVE");
          const primary = links.find((x) => x.is_primary) || links[0];
          const product = primary ? primary.products : null;
          const tickets = primary ? primary.tickets_per_unit : 0;
          const cd = splitCountdown(c.sales_close_at);
          const img = c.hero_image_url || c.thumbnail_url;
          const pimg = product && product.images && product.images.length ? product.images[0] : null;

          return (
            <article key={c.id}
              className="group flex flex-col overflow-hidden rounded-[24px] bg-surface-container-lowest shadow-md transition-shadow hover:shadow-xl">

              <Link href={"/campaigns/" + c.slug} className="relative block h-52 overflow-hidden">
                {img ? (
                  <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className={"h-full w-full " + artFor(c.slug)} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />

                <div className="absolute left-4 top-4 flex gap-2">
                  <span className="rounded-full bg-surface/90 px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface backdrop-blur-sm">
                    {c.is_nationwide ? "All Lebanon" : c.districts ? c.districts.name : "Local"}
                  </span>
                </div>

                {cd ? (
                  <div className="num absolute right-4 top-4 flex gap-1 rounded-lg bg-primary-container/80 px-2.5 py-1.5 backdrop-blur-md">
                    <span className="font-headline text-[13px] text-secondary-fixed">{cd.days}d</span>
                    <span className="font-headline text-[13px] text-secondary-fixed">{cd.hours}h</span>
                  </div>
                ) : null}

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-[26px] leading-tight text-on-primary drop-shadow">
                    {prize ? prize.title.split("-").slice(1).join("-").trim() || prize.title : c.name}
                  </p>
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-5">
                {product ? (
                  <>
                    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface-container p-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-variant">
                        {pimg ? (
                          <img src={pimg} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className={"h-full w-full " + artFor(product.slug)} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-label text-label-bold text-on-surface">{product.name}</p>
                        <p className="num font-headline text-headline-sm text-on-surface">
                          {price(product.price_cents)}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl bg-secondary-container px-3 py-2 text-center">
                        <p className="num font-headline text-headline-sm text-on-secondary-container">
                          {tickets}
                        </p>
                        <p className="font-label text-[8px] font-semibold uppercase tracking-widest text-on-secondary-container">
                          tickets
                        </p>
                      </div>
                    </div>

                    <Link
                      href={"/campaigns/" + c.slug}
                      className="mt-auto block rounded-xl bg-primary py-3.5 text-center font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface"
                    >
                      Buy and enter
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mb-4 font-body text-body-md text-on-surface-variant">
                      In-store entry only. Get a voucher at a partner shop.
                    </p>
                    <Link
                      href={"/campaigns/" + c.slug}
                      className="mt-auto block rounded-xl border border-outline-variant/40 py-3.5 text-center font-label text-label-bold uppercase tracking-widest text-on-surface"
                    >
                      Where to find it
                    </Link>
                  </>
                )}

                <p className="num mt-3 text-center font-body text-sm text-on-surface-variant">
                  Draw {dateFmt(c.draw_date)}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10">
        <VoucherEntry signedIn={signedIn} />
      </div>

      {past.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-5 font-headline text-headline-md text-on-background">Recent winners</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {past.map((d: any) => {
              const w = d.draw_winners && d.draw_winners.length ? d.draw_winners[0] : null;
              const n = w && w.profiles ? w.profiles.full_name : null;
              const masked = n ? n.split(" ").map((x: string) => x[0] + "****").join(" ") : "Unclaimed";
              return (
                <Link key={d.id} href={"/results/" + (d.campaigns ? d.campaigns.slug : "")}
                  className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                      <span className="material-symbols-outlined text-[20px]">emoji_events</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-label text-label-bold text-on-surface">{masked}</p>
                      <p className="num font-body text-sm text-on-surface-variant">
                        {w && w.tickets ? w.tickets.serial : ""}
                      </p>
                    </div>
                  </div>
                  <p className="truncate font-body text-body-md text-on-surface-variant">
                    {d.campaigns ? d.campaigns.name : ""}
                  </p>
                  <p className="num mt-1 font-body text-sm text-on-surface-variant">
                    {d.pool_total_count} in the drum
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
