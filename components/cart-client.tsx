"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-provider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { winnn } from "@/lib/format";
import AddressForm, { type Address } from "./address-form";

const MESSAGES: any = {
  ERR_INSUFFICIENT_CREDITS: "You do not have enough Winnn for this order.",
  ERR_OUT_OF_STOCK: "One of these items just went out of stock. Adjust the quantity and try again.",
  ERR_PRODUCT_UNAVAILABLE: "One of these items is no longer on sale.",
  ERR_PRODUCT_NOT_FOUND: "One of these items no longer exists.",
  ERR_EMPTY_CART: "Your cart is empty.",
  ERR_NOT_AUTHENTICATED: "Please sign in to check out.",
  ERR_INVALID_QUANTITY: "Check the quantities and try again.",
  ERR_SHIPPING_REQUIRED: "Add a delivery address before paying.",
};

export default function CartClient(props: {
  balance: number | null;
  signedIn: boolean;
  addresses: Address[];
}) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>(props.addresses || []);
  const [chosen, setChosen] = useState<string>(
    props.addresses && props.addresses.length
      ? (props.addresses.find((a) => a.is_default) || props.addresses[0]).id || ""
      : ""
  );
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  const address = addresses.find((a) => a.id === chosen) || null;

  const balance = props.balance || 0;
  const short = cart.totalCents - balance;

  async function checkout() {
    if (!address) { setErr("Add a delivery address before paying."); return; }
    setBusy(true);
    setErr(null);
    const res = await supabaseBrowser().rpc("fn_store_checkout", {
      p_items: cart.lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      p_shipping: {
        full_name: address.full_name, phone: address.phone,
        line1: address.line1, line2: address.line2 || null,
        city: address.city, area: address.area || null, notes: address.notes || null,
      },
    });
    setBusy(false);
    if (res.error) {
      const k = Object.keys(MESSAGES).find((x) => res.error!.message.indexOf(x) > -1);
      setErr(k ? MESSAGES[k] : "Checkout failed. Please try again.");
      return;
    }
    const data: any = res.data;
    setDone(data);
    cart.clear();
    router.refresh();

    // Email is fire-and-forget: a mail outage must not affect a paid order.
    if (data && data.receipt_id) {
      fetch("/api/receipts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.receipt_id }),
      }).catch(() => {});
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-fixed/30">
          <span className="material-symbols-outlined text-[40px] text-on-tertiary-fixed">check</span>
        </div>
        <h1 className="font-display text-display-sm text-on-background">Order confirmed</h1>
        <p className="num mt-3 font-headline text-headline-sm text-on-surface">{done.order_no}</p>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          {winnn(done.total_cents)} Winnn was taken from your wallet. Your tickets are unaffected.
        </p>
        <p className="mt-3 font-body text-body-md text-on-surface-variant">
          A receipt is on its way to your email.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/profile" className="rounded-xl bg-primary py-4 font-label text-label-bold uppercase tracking-widest text-on-primary">
            View my orders
          </Link>
          <Link href="/store" className="rounded-xl border border-outline-variant/40 py-4 font-label text-label-bold text-on-surface">
            Keep shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!cart.ready) {
    return <div className="h-64 animate-pulse rounded-3xl bg-surface-container" />;
  }

  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline-variant">shopping_cart</span>
        <h1 className="mt-4 font-display text-display-sm text-on-background">Your cart is empty</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Everything in the store is bought with Winnn from your wallet.
        </p>
        <Link href="/store" className="mt-8 inline-block rounded-xl bg-primary px-6 py-4 font-label text-label-bold uppercase tracking-widest text-on-primary">
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-gutter lg:flex-row">
      <div className="flex-1">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/store" className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-display text-display-sm text-on-background">Cart</h1>
        </div>

        <div className="space-y-3">
          {cart.lines.map((l) => (
            <div key={l.product_id} className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-variant text-on-surface-variant">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-headline text-headline-sm text-on-surface">{l.name}</p>
                <p className="num font-body text-body-md text-secondary">{winnn(l.price_cents)} Winnn each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => cart.setQty(l.product_id, l.quantity - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span className="num w-8 text-center font-label text-label-bold text-on-surface">{l.quantity}</span>
                <button onClick={() => cart.setQty(l.product_id, l.quantity + 1)}
                  disabled={l.quantity >= l.stock}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
              <div className="w-24 text-right">
                <p className="num font-headline text-headline-sm text-on-surface">
                  {winnn(l.price_cents * l.quantity)}
                </p>
                <button onClick={() => cart.remove(l.product_id)}
                  className="font-label text-[11px] font-semibold uppercase text-error hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 lg:hidden" />

      <aside className="w-full lg:w-96">
        <div className="mb-4 rounded-3xl bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-headline text-headline-sm text-on-surface">Delivery address</h2>
            {addresses.length && !adding ? (
              <button onClick={() => setAdding(true)}
                className="font-label text-[12px] font-semibold uppercase tracking-widest text-primary hover:underline">
                Add new
              </button>
            ) : null}
          </div>

          {!props.signedIn ? (
            <p className="font-body text-body-md text-on-surface-variant">
              Sign in to add a delivery address.
            </p>
          ) : adding || !addresses.length ? (
            <AddressForm
              compact
              onSaved={(a) => {
                setAddresses([...addresses.filter((x) => x.id !== a.id), a]);
                setChosen(a.id || "");
                setAdding(false);
                setErr(null);
              }}
              onCancel={addresses.length ? () => setAdding(false) : undefined}
            />
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label key={a.id}
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors " +
                    (chosen === a.id
                      ? "border-primary bg-surface-container"
                      : "border-outline-variant/40 hover:bg-surface-container")
                  }>
                  <input type="radio" className="mt-1" checked={chosen === a.id}
                    onChange={() => { setChosen(a.id || ""); setErr(null); }} />
                  <span className="min-w-0">
                    <span className="block font-label text-label-bold text-on-surface">
                      {a.label || a.full_name}
                    </span>
                    <span className="block font-body text-sm text-on-surface-variant">
                      {[a.line1, a.area, a.city].filter(Boolean).join(", ")}
                    </span>
                    <span className="num block font-body text-sm text-on-surface-variant">{a.phone}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="sticky top-24 rounded-3xl bg-primary-container p-6 text-on-primary-container shadow-2xl">
          <h2 className="font-headline text-headline-sm text-on-primary">Summary</h2>

          <dl className="mt-5 space-y-3">
            <div className="flex justify-between font-body text-body-md">
              <dt>Items</dt>
              <dd className="num">{cart.count}</dd>
            </div>
            <div className="flex justify-between font-body text-body-md">
              <dt>Total</dt>
              <dd className="num font-semibold text-secondary-fixed">{winnn(cart.totalCents)} W</dd>
            </div>
            <div className="flex justify-between border-t border-on-primary-container/20 pt-3 font-body text-body-md">
              <dt>Wallet balance</dt>
              <dd className="num">{props.signedIn ? winnn(balance) + " W" : "Sign in"}</dd>
            </div>
            {props.signedIn ? (
              <div className="flex justify-between font-body text-body-md">
                <dt>{short > 0 ? "Short by" : "Remaining after"}</dt>
                <dd className={"num font-semibold " + (short > 0 ? "text-error" : "text-secondary-fixed")}>
                  {winnn(Math.abs(short))} W
                </dd>
              </div>
            ) : null}
          </dl>

          {err ? (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-error-container p-4 text-on-error-container">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="font-body text-body-md">{err}</p>
            </div>
          ) : null}

          {!props.signedIn ? (
            <Link href="/login?next=/store/cart"
              className="mt-6 block rounded-xl bg-secondary-container py-4 text-center font-label text-label-bold uppercase tracking-widest text-on-secondary-container">
              Sign in to check out
            </Link>
          ) : short > 0 ? (
            <Link href="/"
              className="mt-6 block rounded-xl bg-secondary-container py-4 text-center font-label text-label-bold uppercase tracking-widest text-on-secondary-container">
              Buy more Winnn
            </Link>
          ) : !address ? (
            <div className="mt-6 rounded-xl bg-surface/10 p-4 text-center backdrop-blur-sm">
              <p className="font-body text-body-md text-on-primary-container">
                Add a delivery address to continue.
              </p>
            </div>
          ) : (
            <button onClick={checkout} disabled={busy}
              className="mt-6 w-full rounded-xl bg-secondary-fixed py-4 font-label text-label-bold uppercase tracking-widest text-on-secondary-fixed disabled:opacity-40">
              {busy ? "Processing" : "Pay with Winnn"}
            </button>
          )}

          <p className="mt-4 font-body text-sm text-on-primary-container/70">
            No card is charged. This spends Winnn already in your wallet, and never cancels tickets
            you hold.
          </p>
        </div>
      </aside>
    </div>
  );
}
