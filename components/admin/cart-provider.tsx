"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type CartLine = {
  product_id: string;
  slug: string;
  name: string;
  price_cents: number;
  quantity: number;
  stock: number;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (product_id: string, qty: number) => void;
  remove: (product_id: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "winnn.cart.v1";

export function CartProvider(props: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate after mount. Reading storage during render would mismatch the
  // server-rendered HTML and throw a hydration error.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch (e) {
      // private mode or corrupt payload; start empty rather than crash
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch (e) {}
  }, [lines, ready]);

  function add(line: Omit<CartLine, "quantity">, qty?: number) {
    const n = qty || 1;
    setLines((prev) => {
      const found = prev.find((l) => l.product_id === line.product_id);
      if (!found) return [...prev, { ...line, quantity: Math.min(n, line.stock) }];
      return prev.map((l) =>
        l.product_id === line.product_id
          ? { ...l, quantity: Math.min(l.quantity + n, l.stock) }
          : l
      );
    });
  }

  function setQty(product_id: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product_id !== product_id)
        : prev.map((l) =>
            l.product_id === product_id ? { ...l, quantity: Math.min(qty, l.stock) } : l
          )
    );
  }

  const value: Ctx = {
    lines,
    ready,
    count: lines.reduce((a, l) => a + l.quantity, 0),
    totalCents: lines.reduce((a, l) => a + l.price_cents * l.quantity, 0),
    add,
    setQty,
    remove: (id) => setLines((prev) => prev.filter((l) => l.product_id !== id)),
    clear: () => setLines([]),
  };

  return <CartContext.Provider value={value}>{props.children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
