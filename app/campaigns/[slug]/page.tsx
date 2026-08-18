import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { price } from "@/lib/money";
import { dateFmt } from "@/lib/format";
import { artFor, splitCountdown } from "@/lib/art";
import BuyBox from "@/components/buy-box";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: any) {
  const params = await props.params;
  const sb = await supabaseServer();
  const { data } = await sb.from("campaigns")
    .select("name,description,meta_title,meta_description,og_image_url,hero_image_url")
    .eq("slug", params.slug).maybeSingle();
  const c: any = data;
  if (!c) return {};
  return {
    title: c.meta_title || c.name,
    description: c.meta_description || c.description,
    openGraph: {
      title: c.meta_title || c.name,
      description: c.meta_description || c.description,
      images: c.og_image_url || c.hero_image_url ? [c.og_image_url || c.hero_image_url] : undefined,
    },
  };
}

export default async function Campaign(props: any) {
  const params = await props.params;
  const sb = await supabaseServer();

  const { data } = await sb
    .from("campaigns")
    .select("id,name,slug,description,type,terms,draw_date,sales_close_at,hero_image_url,is_nationwide,ai_summary,faq,districts(name,governorate),campaign_prizes(position,title,value_cents),campaign_products(tickets_per_unit,is_primary,sort_order,products(id,name,slug,description,price_cents,stock,images,status)),campaign_merchants(merchants(name,category,address,logo_url,districts(name)))")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!data) notFound();
  const c: any = data;

  const { data: auth } = await sb.auth.getUser();
  const signedIn = !!(auth && auth.user);

  let mine = 0;
  if (signedIn) {
    const { count } = await sb.from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id).eq("status", "ELIGIBLE");
    mine = count || 0;
  }

  const prizes: any[] = ((c.campaign_prizes as any[]) || []).slice().sort((a, b) => a.position - b.position);
  const links: any[] = ((c.campaign_products as any[]) || [])
    .filter((x) => x.products && x.products.status === "ACTIVE")
    .sort((a, b) => (a.is_primary ? -1 : 0) - (b.is_primary ? -1 : 0) || a.sort_order - b.sort_order);
  const merchants: any[] = (c.campaign_merchants as any[]) || [];
  const cd = splitCountdown(c.sales_close_at);
  const top = prizes[0];

  return (
    <div className="flex w-full flex-col">
      <Link href="/" className="mb-5 flex items-center gap-1 font-label text-label-bold text-on-surface-variant hover:text-primary">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Deals
      </Link>

      <section className="relative mb-8 overflow-hidden rounded-[28px] shadow-2xl">
        {c.hero_image_url ? (
          <img src={c.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={"absolute inset-0 " + artFor(c.slug)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-primary/10" />

        <div className="relative z-10 flex min-h-[340px] flex-col justify-end p-6 sm:p-10">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-surface/15 px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-primary backdrop-blur-sm">
              {c.is_nationwide ? "All Lebanon" : c.districts ? c.districts.name : "Local"}
            </span>
            {cd ? (
              <span className="num rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
                {cd.days}d {cd.hours}h left
              </span>
            ) : null}
          </div>

          <h1 className="font-display text-[32px] leading-tight text-on-primary drop-shadow sm:text-display-lg">
            {top ? top.title.split("-").slice(1).join("-").trim() || top.title : c.name}
          </h1>
          <p className="mt-2 max-w-xl font-body text-body-lg text-primary-fixed-dim">
            {c.description}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="lg:col-span-2">
          {links.length ? (
            <>
              <h2 className="mb-4 font-headline text-headline-md text-on-background">
                Buy any of these to enter
              </h2>
              <div className="space-y-4">
                {links.map((l) => (
                  <BuyBox
                    key={l.products.id}
                    signedIn={signedIn}
                    ticketsPerUnit={l.tickets_per_unit}
                    product={{
                      id: l.products.id, slug: l.products.slug, name: l.products.name,
                      description: l.products.description, price_cents: l.products.price_cents,
                      stock: l.products.stock,
                      image: l.products.images && l.products.images.length ? l.products.images[0] : null,
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-surface-container p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant">storefront</span>
              <p className="mt-3 font-headline text-headline-sm text-on-surface">In-store entry only</p>
              <p className="mt-2 font-body text-body-md text-on-surface-variant">
                Shop with a partner below and they will hand you a voucher.
              </p>
            </div>
          )}

          {prizes.length ? (
            <>
              <h2 className="mb-4 mt-10 font-headline text-headline-md text-on-background">Prizes</h2>
              <div className="space-y-3">
                {prizes.map((p) => (
                  <div key={p.position}
                    className="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container font-headline text-on-secondary-container">
                        {p.position}
                      </span>
                      <span className="font-headline text-headline-sm text-on-surface">{p.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {merchants.length ? (
            <>
              <h2 className="mb-4 mt-10 font-headline text-headline-md text-on-background">
                Or get a free voucher here
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {merchants.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                    {m.merchants && m.merchants.logo_url ? (
                      <img src={m.merchants.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-secondary-fixed">
                        <span className="material-symbols-outlined">storefront</span>
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-label text-label-bold text-on-surface">
                        {m.merchants ? m.merchants.name : ""}
                      </p>
                      <p className="truncate font-body text-sm text-on-surface-variant">
                        {m.merchants && m.merchants.districts ? m.merchants.districts.name : ""}
                        {m.merchants && m.merchants.address ? " / " + m.merchants.address : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-3xl bg-primary-container p-6 text-on-primary-container">
              <p className="font-label text-[10px] uppercase tracking-widest opacity-70">Your tickets</p>
              <p className="num mt-1 font-display text-display-sm text-secondary-fixed">
                {signedIn ? mine : 0}
              </p>
              {!signedIn ? (
                <Link href="/login"
                  className="mt-4 block rounded-xl bg-surface/10 py-3 text-center font-label text-label-bold text-on-primary">
                  Sign in
                </Link>
              ) : null}
            </div>

            <div className="rounded-3xl bg-surface-container p-6">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                Draw date
              </p>
              <p className="mt-1 font-headline text-headline-md text-on-surface">{dateFmt(c.draw_date)}</p>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Drawn physically from a drum and recorded on video.
              </p>
              <Link href="/how-it-works"
                className="mt-4 flex items-center gap-1 font-label text-label-bold text-primary hover:underline">
                How it works
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {c.terms ? (
              <details className="group rounded-3xl bg-surface-container p-6">
                <summary className="flex cursor-pointer items-center justify-between font-label text-label-bold text-on-surface">
                  Terms
                  <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <p className="mt-3 font-body text-sm leading-relaxed text-on-surface-variant">{c.terms}</p>
              </details>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
