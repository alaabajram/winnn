import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn } from "@/lib/format";
import { artFor } from "@/lib/art";
import AddToCart from "@/components/add-to-cart";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: any) {
  const params = await props.params;
  const sb = await supabaseServer();
  const { data } = await sb.from("products")
    .select("name,description,meta_title,meta_description")
    .eq("slug", params.slug).maybeSingle();
  const p: any = data;
  if (!p) return {};
  return {
    title: p.meta_title || p.name,
    description: p.meta_description || p.description,
  };
}

export default async function ProductPage(props: any) {
  const params = await props.params;
  const sb = await supabaseServer();

  const { data } = await sb.from("products")
    .select("id,name,slug,description,price_cents,stock,is_featured,images,sku,product_categories(name)")
    .eq("slug", params.slug).eq("status", "ACTIVE").maybeSingle();
  if (!data) notFound();
  const p: any = data;

  const { data: auth } = await sb.auth.getUser();
  let balance: number | null = null;
  if (auth && auth.user) {
    const { data: w } = await sb.from("wallets").select("balance_cents").maybeSingle();
    balance = w ? (w as any).balance_cents : 0;
  }
  const images: string[] = (p.images as string[]) || [];
  const affordable = balance !== null && balance >= p.price_cents;

  return (
    <div className="flex w-full flex-col">
      <Link href="/store" className="mb-6 flex items-center gap-1 font-label text-label-bold text-on-surface-variant hover:text-primary">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Store
      </Link>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-[2rem] bg-surface-container">
            {images.length ? (
              <img src={images[0]} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className={"h-full w-full " + artFor(p.slug)} />
            )}
          </div>
          {images.length > 1 ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {images.slice(1, 4).map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-surface-container">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col">
          {p.product_categories ? (
            <span className="mb-3 w-fit rounded-full bg-surface-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              {p.product_categories.name}
            </span>
          ) : null}

          <h1 className="font-display text-display-sm text-on-background">{p.name}</h1>

          <p className="num mt-4 font-display text-display-sm text-secondary">
            {winnn(p.price_cents)} <span className="font-headline text-headline-sm">Winnn</span>
          </p>

          <p className="mt-5 font-body text-body-lg leading-relaxed text-on-surface-variant">
            {p.description}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-surface-container p-4">
              <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Stock</dt>
              <dd className="num mt-1 font-headline text-headline-sm text-on-surface">
                {p.stock > 0 ? p.stock + " available" : "Sold out"}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface-container p-4">
              <dt className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Your balance</dt>
              <dd className="num mt-1 font-headline text-headline-sm text-on-surface">
                {balance === null ? "Sign in" : winnn(balance) + " W"}
              </dd>
            </div>
          </dl>

          {balance !== null && !affordable ? (
            <div className="mt-5 rounded-xl bg-secondary-container/30 p-4">
              <p className="font-body text-body-md text-on-surface">
                You need {winnn(p.price_cents - balance)} more Winnn for this item.
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <AddToCart
              full
              signedIn={balance !== null}
              product={{
                product_id: p.id, slug: p.slug, name: p.name,
                price_cents: p.price_cents, stock: p.stock,
              }}
            />
          </div>

          <p className="mt-4 font-body text-sm text-on-surface-variant">
            Paid from your Winnn wallet. Spending credits never cancels draw tickets you already hold.
          </p>
        </div>
      </div>
    </div>
  );
}
