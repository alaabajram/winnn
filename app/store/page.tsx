import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn } from "@/lib/format";
import { artFor } from "@/lib/art";

export const dynamic = "force-dynamic";

export default async function Store(props: any) {
  const search = await props.searchParams;
  const activeCat = search && search.cat ? String(search.cat) : "";

  const sb = await supabaseServer();
  const { data: catRows } = await sb
    .from("product_categories").select("id,name,slug").eq("is_active", true).order("sort_order");
  const cats: any[] = (catRows as any[]) || [];

  let q = sb
    .from("products")
    .select("id,name,slug,description,price_cents,stock,is_featured,category_id")
    .eq("status", "ACTIVE");
  if (activeCat) {
    const match = cats.find((c) => c.slug === activeCat);
    if (match) q = q.eq("category_id", match.id);
  }
  const { data: productRows } = await q.order("is_featured", { ascending: false }).order("name");
  const products: any[] = (productRows as any[]) || [];

  const { data: auth } = await sb.auth.getUser();
  let balance: number | null = null;
  if (auth && auth.user) {
    const { data: w } = await sb.from("wallets").select("balance_cents").maybeSingle();
    balance = w ? (w as any).balance_cents : 0;
  }

  const catName: any = {};
  cats.forEach((c) => { catName[c.id] = c.name; });

  return (
    <div className="flex w-full flex-col">
      <div className="group relative z-10 mb-12 flex w-full flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-primary-container p-8 text-on-primary-container shadow-2xl md:flex-row lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-tertiary-fixed/10 via-transparent to-primary/20 opacity-50" />
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-tertiary-fixed/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-2">
          <h2 className="font-headline text-headline-sm uppercase tracking-widest text-on-primary-container/80">
            Available balance
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="num font-display text-display-lg text-secondary-fixed">
              {balance === null ? "0" : winnn(balance)}
            </span>
            <span className="font-headline text-headline-sm text-secondary-fixed-dim">Winnn</span>
          </div>
          <p className="mt-2 max-w-md font-body text-body-md text-on-primary-container/60">
            Spend your Winnn on real products. Buying from the store never cancels tickets you already
            hold.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/wallet"
            className="flex items-center justify-center gap-2 rounded-full bg-secondary-container px-8 py-4 font-label text-label-bold text-on-secondary-container shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Buy more Winnn
          </Link>
          <Link
            href="/wallet"
            className="flex items-center justify-center gap-2 rounded-full bg-surface/10 px-8 py-4 font-label text-label-bold text-on-primary shadow-lg backdrop-blur-sm transition-all hover:bg-surface/20 active:scale-95"
          >
            <span className="material-symbols-outlined">history</span>
            Transactions
          </Link>
        </div>
      </div>

      <div className="sticky top-20 z-30 -mx-margin-mobile mb-8 bg-background/95 px-margin-mobile py-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] backdrop-blur-xl lg:-mx-margin-desktop lg:px-margin-desktop">
        <div className="hide-scrollbar flex snap-x items-center gap-4 overflow-x-auto pb-4">
          <Link
            href="/store"
            className={
              "shrink-0 snap-start rounded-full px-8 py-3 font-label text-label-bold transition-colors " +
              (activeCat === ""
                ? "bg-primary text-on-primary shadow-md"
                : "bg-surface-container text-on-surface hover:bg-surface-variant")
            }
          >
            All rewards
          </Link>
          {cats.map((c) => (
            <Link
              key={c.id}
              href={"/store?cat=" + c.slug}
              className={
                "shrink-0 snap-start rounded-full px-8 py-3 font-label text-label-bold transition-colors " +
                (activeCat === c.slug
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-surface-container text-on-surface hover:bg-surface-variant")
              }
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p: any) => {
          const affordable = balance !== null && balance >= p.price_cents;
          return (
            <div
              key={p.id}
              className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-surface-container-lowest p-4 shadow-sm transition-all duration-500 hover:shadow-xl"
            >
              <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-[1.5rem] bg-surface-container">
                <div className={"h-full w-full transition-transform duration-700 group-hover:scale-110 " + artFor(p.slug)} />
                {p.is_featured ? (
                  <div className="absolute bottom-4 left-4 rounded-full bg-primary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-primary-container shadow-md">
                    Featured
                  </div>
                ) : null}
                {p.category_id && catName[p.category_id] ? (
                  <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant backdrop-blur-sm">
                    {catName[p.category_id]}
                  </div>
                ) : null}
              </div>

              <div className="relative z-10 flex flex-1 flex-col px-2">
                <h3 className="mb-2 line-clamp-2 font-headline text-headline-sm text-on-surface">{p.name}</h3>
                <p className="mb-6 line-clamp-2 flex-1 font-body text-body-md text-on-surface-variant">
                  {p.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                      {p.stock > 0 ? p.stock + " in stock" : "Sold out"}
                    </span>
                    <span className="num font-headline text-headline-md text-on-surface">
                      {winnn(p.price_cents)} <span className="text-sm text-secondary">W</span>
                    </span>
                  </div>
                  <button
                    disabled
                    title={
                      balance === null
                        ? "Sign in to buy"
                        : affordable
                        ? "Checkout is not built yet"
                        : "Not enough Winnn"
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-transform disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined">shopping_cart</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
          Nothing in this category yet.
        </p>
      ) : null}
    </div>
  );
}
