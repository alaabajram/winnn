"use client";
import { useState } from "react";
import { useCart } from "./cart-provider";

export default function AddToCart(props: {
  product: { product_id: string; slug: string; name: string; price_cents: number; stock: number };
  signedIn: boolean;
  full?: boolean;
}) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const p = props.product;

  const inCart = cart.lines.find((l) => l.product_id === p.product_id);
  const atMax = !!inCart && inCart.quantity >= p.stock;
  const disabled = p.stock <= 0 || atMax;

  function go() {
    cart.add(p);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  if (props.full) {
    return (
      <button
        onClick={go}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[20px]">
          {added ? "check" : "shopping_cart"}
        </span>
        {p.stock <= 0 ? "Sold out" : atMax ? "All stock in cart" : added ? "Added" : "Add to cart"}
      </button>
    );
  }

  return (
    <button
      onClick={go}
      disabled={disabled}
      title={p.stock <= 0 ? "Sold out" : atMax ? "All available stock is in your cart" : "Add to cart"}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
    >
      <span className="material-symbols-outlined">{added ? "check" : "shopping_cart"}</span>
    </button>
  );
}
