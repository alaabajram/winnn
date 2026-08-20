import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { price } from "@/lib/money";
import { dateFmt, endsLabel } from "@/lib/format";
import { artFor } from "@/lib/art";
import BuyBox from "@/components/buy-box";
import EntryNumber from "@/components/entry-number";

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
    .select("id,name,slug,description,type,terms,draw_date,sales_close_at,hero_image_url,is_nationwide,districts(name),campaign_prizes(position,title,value_cents,image_url),campaign_products(tickets_per_unit,is_primary,sort_order,products(id,name,slug,description,price_cents,stock,images,status)),campaign_merchants(merchants(name,category,address,logo_url,map_url,districts(name)))")
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

  const prizes: any[] = ((c.campaign_prizes as any[]) || [])
    .slice().sort((a, b) => a.position - b.position);
  const links: any[] = ((c.campaign_products as any[]) || [])
    .filter((x) => x.products && x.products.status === "ACTIVE")
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order);
  const merchants: any[] = (c.campaign_merchants as any[]) || [];
  const ends = endsLabel(c.sales_close_at);
  const top = prizes[0];

  return (
    <div className="flex w-full flex-col">
      <Link href="/" className="mb-5 flex items-center gap-1 font-label text-label-bold text-on-surface-variant hover:text-primary">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Deals
      </Link>

      {/* 1. BANNER - image only. Text sits underneath so nothing competes
             with the artwork or becomes unreadable over it. */}
      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-surface-container shadow-lg">
        <div className="aspect-[16/9] w-full sm:aspect-[21/9]">
          {c.hero_image_url ? (
            <img src={c.hero_image_url} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            <div className={"h-full w-full " + artFor(c.slug)} />
          )}
        </div>

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-surface/90 px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface backdrop-blur-sm">
            {c.is_nationwide ? "All Lebanon" : c.districts ? c.districts.name : "Local"}
          </span>
          {ends ? (
            <span className={
              "rounded-full px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm " +
              (ends.urgent ? "bg-error text-on-error" : "bg-surface/90 text-on-surface")
            }>
              {ends.text}
            </span>
          ) : null}
        </div>
      </section>

      <header className="mb-8">
        <h1 className="font-display text-display-sm text-on-background sm:text-display-lg">
          {top ? top.title.split("-").slice(1).join("-").trim() || top.title : c.name}
        </h1>
        <p className="mt-2 max-w-2xl font-body text-body-lg leading-relaxed text-on-surface-variant">
          {c.description}
        </p>
        <p className="num mt-3 font-label text-label-bold uppercase tracking-widest text-secondary">
          Draw {dateFmt(c.draw_date)}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {/* 2. PRODUCT + TICKET + PRICE */}
          {links.length ? (
            <section>
              <h2 className="mb-4 font-headline text-headline-md text-on-background">
                Buy to enter
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
                      images: (l.products.images as string[]) || [],
                    }}
                  />
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-3xl bg-surface-container p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant">storefront</span>
              <p className="mt-3 font-headline text-headline-sm text-on-surface">In-store entry only</p>
              <p className="mt-2 font-body text-body-md text-on-surface-variant">
                Shop with a partner below and they will hand you a voucher.
              </p>
            </div>
          )}

          {/* 3. PRIZES, each with its own image */}
          {prizes.length ? (
            <section>
              <h2 className="mb-4 font-headline text-headline-md text-on-background">
                What you could win
              </h2>
              <div className="space-y-4">
                {prizes.map((p) => (
                  <div key={p.position}
                    className="flex flex-col overflow-hidden rounded-[24px] bg-surface-container-lowest shadow-md sm:flex-row">
                    <div className="h-44 w-full shrink-0 overflow-hidden bg-surface-container sm:h-auto sm:w-52">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className={"flex h-full w-full items-center justify-center " + artFor(c.slug + p.position)}>
                          <span className="material-symbols-outlined text-[40px] text-white/70">
                            redeem
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-5">
                      <span className="mb-2 w-fit rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
                        {p.position === 1 ? "Grand prize" : "Prize " + p.position}
                      </span>
                      <h3 className="font-headline text-headline-md text-on-surface">{p.title}</h3>
                      {p.value_cents ? (
                        <p className="num mt-1 font-display text-headline-md text-secondary">
                          {price(p.value_cents)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* 4. ALREADY HAVE A TICKET */}
          <EntryNumber signedIn={signedIn} campaignName={c.name} />

          {merchants.length ? (
            <section>
              <h2 className="mb-4 font-headline text-headline-md text-on-background">
                Get a free voucher here
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {merchants.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                    {m.merchants && m.merchants.logo_url ? (
                      <img src={m.merchants.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-secondary-fixed">
                        <span className="material-symbols-outlined">storefront</span>
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label text-label-bold text-on-surface">
                        {m.merchants ? m.merchants.name : ""}
                      </p>
                      <p className="truncate font-body text-sm text-on-surface-variant">
                        {m.merchants && m.merchants.districts ? m.merchants.districts.name : ""}
                        {m.merchants && m.merchants.address ? " / " + m.merchants.address : ""}
                      </p>
                    </div>
                    {m.merchants && m.merchants.map_url ? (
                      <a href={m.merchants.map_url} target="_blank" rel="noreferrer"
                        aria-label="Open in Maps"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary hover:bg-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">map</span>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside>
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
