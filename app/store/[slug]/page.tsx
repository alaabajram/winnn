import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { price } from "@/lib/money";
import { dateFmt } from "@/lib/format";
import { artFor } from "@/lib/art";
import BuyBox from "@/components/buy-box";
import Gallery from "@/components/gallery";

export const dynamic = "force-dynamic";

export default async function ProductPage(props: any) {
  const params = await props.params;
  const sb = await supabaseServer();

  const { data } = await sb.from("products")
    .select("id,name,slug,description,price_cents,stock,images,status,campaign_products(tickets_per_unit,campaigns(id,name,slug,draw_date,status))")
    .eq("slug", params.slug).eq("status", "ACTIVE").maybeSingle();
  if (!data) notFound();
  const p: any = data;

  const { data: auth } = await sb.auth.getUser();
  const signedIn = !!(auth && auth.user);

  const links: any[] = ((p.campaign_products as any[]) || [])
    .filter((x) => x.campaigns && x.campaigns.status === "LIVE");
  const tickets = links.reduce((a, x) => a + x.tickets_per_unit, 0);
  const images: string[] = (p.images as string[]) || [];

  return (
    <div className="flex w-full flex-col">
      <Link href="/" className="mb-5 flex items-center gap-1 font-label text-label-bold text-on-surface-variant hover:text-primary">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Deals
      </Link>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <div>
          <Gallery images={images} slug={p.slug} alt={p.name} />
        </div>

        <div>
          <h1 className="font-display text-display-sm text-on-background">{p.name}</h1>
          <p className="num mt-3 font-display text-display-sm text-on-surface">
            {price(p.price_cents)}
          </p>
          <p className="mt-4 font-body text-body-lg leading-relaxed text-on-surface-variant">
            {p.description}
          </p>

          {links.length ? (
            <div className="mt-6 space-y-2">
              {links.map((l, i) => (
                <Link key={i} href={"/campaigns/" + l.campaigns.slug}
                  className="flex items-center justify-between rounded-2xl bg-secondary-container p-4 transition-transform hover:scale-[1.01]">
                  <div>
                    <p className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
                      Enters you into
                    </p>
                    <p className="font-headline text-headline-sm text-on-secondary-container">
                      {l.campaigns.name}
                    </p>
                    <p className="num font-body text-sm text-on-secondary-container">
                      Draw {dateFmt(l.campaigns.draw_date)}
                    </p>
                  </div>
                  <span className="num rounded-xl bg-on-secondary-container/10 px-3 py-2 text-center">
                    <span className="block font-headline text-headline-sm text-on-secondary-container">
                      +{l.tickets_per_unit}
                    </span>
                    <span className="block font-label text-[9px] font-semibold uppercase tracking-widest text-on-secondary-container">
                      tickets
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            <BuyBox
              signedIn={signedIn}
              ticketsPerUnit={tickets}
              product={{
                id: p.id, slug: p.slug, name: p.name, description: null,
                price_cents: p.price_cents, stock: p.stock,
                image: images.length ? images[0] : null,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
