"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";

export default function CartButton() {
  const cart = useCart();
  if (!cart.ready || cart.count === 0) return null;
  return (
    <Link
      href="/store/cart"
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"
    >
      <span className="material-symbols-outlined">shopping_cart</span>
      <span className="num absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container font-label text-[11px] font-semibold text-on-secondary-container">
        {cart.count}
      </span>
    </Link>
  );
}
