"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { price } from "@/lib/money";
import { artFor } from "@/lib/art";

export default function BuyBox(props: {
  product: {
    id: string; slug: string; name: string; description?: string | null;
    price_cents: number; stock: number; image?: string | null; images?: string[];
  };
  ticketsPerUnit: number;
  signedIn: boolean;
}) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const p = props.product;

  const max = Math.max(0, p.stock);
  const tickets = props.ticketsPerUnit * qty;

  function add() {
    cart.add(
      {
        product_id: p.id, slug: p.slug, name: p.name,
        price_cents: p.price_cents, stock: p.stock,
      },
      qty
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-surface-container-lowest shadow-md">
      <div className="flex flex-col gap-5 p-5 sm:flex-row">
        <div className="w-full shrink-0 sm:w-32">
          <div className="h-32 w-full overflow-hidden rounded-2xl bg-surface-container sm:h-28">
            {p.image ? (
              <img src={p.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className={"h-full w-full " + artFor(p.slug)} />
            )}
          </div>
          {p.images && p.images.length > 1 ? (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {p.images.slice(1, 4).map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg bg-surface-container">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-headline-sm text-on-surface">{p.name}</h3>
          {p.description ? (
            <p className="mt-1 line-clamp-2 font-body text-body-md text-on-surface-variant">
              {p.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="num font-display text-headline-md text-on-surface">
              {price(p.price_cents)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-on-secondary-container">
                confirmation_number
              </span>
              <span className="num font-label text-[12px] font-semibold uppercase tracking-widest text-on-secondary-container">
                +{props.ticketsPerUnit} tickets
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-outline-variant/30 bg-surface-container p-5 sm:flex-row sm:items-center">
        {max > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-on-surface">
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <span className="num w-10 text-center font-headline text-headline-sm text-on-surface">
                {qty}
              </span>
              <button onClick={() => setQty(Math.min(max, qty + 1))} disabled={qty >= max}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-on-surface disabled:opacity-40">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="num font-headline text-headline-sm text-on-surface">
                {price(p.price_cents * qty)}
              </p>
              <p className="num font-label text-[11px] font-semibold uppercase tracking-widest text-secondary">
                {tickets} tickets
              </p>
            </div>

            <button onClick={add}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-container px-8 py-4 font-label text-label-bold uppercase tracking-widest text-secondary-fixed shadow-lg transition-transform hover:scale-[1.02] active:scale-95">
              <span className="material-symbols-outlined text-[20px]">
                {added ? "check_circle" : "bolt"}
              </span>
              {added ? "In your cart" : "Buy"}
            </button>
          </>
        ) : (
          <p className="flex-1 text-center font-label text-label-bold uppercase tracking-widest text-on-surface-variant">
            Sold out
          </p>
        )}
      </div>
    </div>
  );
}
