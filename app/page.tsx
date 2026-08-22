import Link from "next/link";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFmt, endsLabel } from "@/lib/format";

import DistrictPicker from "@/components/district-picker";
import EntryNumber from "@/components/entry-number";
import DealCard from "@/components/deal-card";
import BannerCarousel from "@/components/banner-carousel";
import JsonLd from "@/components/json-ld";

export const dynamic = "force-dynamic";

/** Nationwide, one district by name, or "N areas" when it spans several. */
function areaLabel(c: any) {
  if (c.is_nationwide) return "All Lebanon";
  const list: any[] = (c.campaign_districts as any[]) || [];
  if (list.length > 1) return list.length + " areas";
  if (list.length === 1 && list[0].districts) return list[0].districts.name;
  if (c.districts) return c.districts.name;
  return "Local";
}

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
    .select("id,name,slug,description,type,draw_date,sales_close_at,hero_image_url,thumbnail_url,is_nationwide,district_id,districts!campaigns_district_id_fkey(name),campaign_districts(districts(name)),campaign_prizes(position,title,value_cents),campaign_products(tickets_per_unit,is_primary,products(id,name,slug,price_cents,stock,images,status))")
    .eq("status", "LIVE")
    .order("draw_date", { ascending: true });

  // A campaign matches if it is nationwide, or listed in this district.
  if (active) {
    const { data: inDistrict } = await sb
      .from("campaign_districts").select("campaign_id").eq("district_id", active.id);
    const ids = ((inDistrict as any[]) || []).map((x) => x.campaign_id);
    q = ids.length
      ? q.or("is_nationwide.eq.true,id.in.(" + ids.join(",") + ")")
      : q.eq("is_nationwide", true);
  }

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

  let bq = sb.from("banners")
    .select("id,title,subtitle,image_url,link_url,cta_label,district_id")
    .eq("is_active", true).order("sort_order");
  if (active) bq = bq.or("district_id.is.null,district_id.eq." + active.id);
  else bq = bq.is("district_id", null);
  const { data: bannerRows } = await bq;
  const banners: any[] = (bannerRows as any[]) || [];

  const { data: settingsRow } = await sb
    .from("site_settings").select("site_name,description,logo_url").maybeSingle();
  const st: any = settingsRow || {};
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://winnn-4x9m.vercel.app";

  return (
    <div className="flex w-full flex-col">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: st.site_name || "Winnn",
        url: site,
        logo: st.logo_url || undefined,
        description: st.description || undefined,
        areaServed: { "@type": "Country", name: "Lebanon" },
      }} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: st.site_name || "Winnn",
        url: site,
      }} />

      <BannerCarousel banners={banners} />

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
          const pimg = product && product.images && product.images.length ? product.images[0] : null;

          return (
            <DealCard
              key={c.id}
              ticketsPerUnit={primary ? primary.tickets_per_unit : 0}
              campaign={{
                id: c.id, slug: c.slug, name: c.name,
                image: c.hero_image_url || c.thumbnail_url || null,
                prizeTitle: prize
                  ? prize.title.split("-").slice(1).join("-").trim() || prize.title
                  : null,
                drawDate: dateFmt(c.draw_date),
                areaLabel: areaLabel(c),
                ends: endsLabel(c.sales_close_at),
              }}
              product={
                product
                  ? {
                      id: product.id, slug: product.slug, name: product.name,
                      price_cents: product.price_cents, stock: product.stock, image: pimg,
                    }
                  : null
              }
            />
          );
        })}
      </div>

      <div className="mt-10">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-[24px] bg-surface-container" />}>
          <EntryNumber signedIn={signedIn} />
        </Suspense>
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
