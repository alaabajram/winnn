"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { price } from "@/lib/money";
import { artFor } from "@/lib/art";

export default function DealCard(props: {
  campaign: {
    id: string; slug: string; name: string; image: string | null;
    prizeTitle: string | null; drawDate: string; areaLabel: string;
    countdown: { days: string; hours: string } | null;
  };
  product: {
    id: string; slug: string; name: string; price_cents: number;
    stock: number; image: string | null;
  } | null;
  ticketsPerUnit: number;
}) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const c = props.campaign;
  const p = props.product;

  const max = p ? Math.max(0, p.stock) : 0;

  function add() {
    if (!p) return;
    cart.add(
      { product_id: p.id, slug: p.slug, name: p.name, price_cents: p.price_cents, stock: p.stock },
      qty
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-[24px] bg-surface-container-lowest shadow-md transition-shadow hover:shadow-xl">
      <Link href={"/campaigns/" + c.slug} className="relative block h-52 overflow-hidden">
        {c.image ? (
          <img src={c.image} alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className={"h-full w-full " + artFor(c.slug)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />

        <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface backdrop-blur-sm">
          {c.areaLabel}
        </span>

        {c.countdown ? (
          <span className="num absolute right-4 top-4 rounded-lg bg-primary-container/80 px-2.5 py-1.5 font-headline text-[13px] text-secondary-fixed backdrop-blur-md">
            {c.countdown.days}d {c.countdown.hours}h
          </span>
        ) : null}

        <p className="absolute inset-x-0 bottom-0 p-4 font-display text-[26px] leading-tight text-on-primary drop-shadow">
          {c.prizeTitle || c.name}
        </p>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {p ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                {p.image ? (
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className={"h-full w-full " + artFor(p.slug)} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label text-label-bold text-on-surface">{p.name}</p>
                <p className="num font-headline text-headline-sm text-on-surface">
                  {price(p.price_cents)}
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-secondary-container px-3 py-2 text-center">
                <span className="num block font-headline text-headline-sm text-on-secondary-container">
                  {props.ticketsPerUnit * qty}
                </span>
                <span className="block font-label text-[8px] font-semibold uppercase tracking-widest text-on-secondary-container">
                  tickets
                </span>
              </span>
            </div>

            {max > 0 ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <button onClick={() => setQty(Math.max(1, qty - 1))}
                    aria-label="Fewer"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="num w-10 text-center font-headline text-headline-sm text-on-surface">
                    {qty}
                  </span>
                  <button onClick={() => setQty(Math.min(max, qty + 1))} disabled={qty >= max}
                    aria-label="More"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                  <span className="num ml-auto font-headline text-headline-sm text-on-surface">
                    {price(p.price_cents * qty)}
                  </span>
                </div>

                <button onClick={add}
                  className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface">
                  <span className="material-symbols-outlined text-[20px]">
                    {added ? "check" : "shopping_cart"}
                  </span>
                  {added ? "Added" : "Add to cart"}
                </button>
              </>
            ) : (
              <p className="mt-auto rounded-xl bg-surface-container py-3.5 text-center font-label text-label-bold uppercase tracking-widest text-on-surface-variant">
                Sold out
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 font-body text-body-md text-on-surface-variant">
              In-store entry only. Get a free voucher at a partner shop.
            </p>
            <Link href={"/campaigns/" + c.slug}
              className="mt-auto block rounded-xl border border-outline-variant/40 py-3.5 text-center font-label text-label-bold uppercase tracking-widest text-on-surface">
              Where to find it
            </Link>
          </>
        )}

        <Link href={"/campaigns/" + c.slug}
          className="num mt-3 text-center font-body text-sm text-on-surface-variant hover:text-primary">
          Draw {c.drawDate} / details
        </Link>
      </div>
    </article>
  );
}
