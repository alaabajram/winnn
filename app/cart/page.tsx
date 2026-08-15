import { supabaseServer } from "@/lib/supabase/server";
import CartClient from "@/components/cart-client";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  let balance: number | null = null;
  if (auth && auth.user) {
    const { data: w } = await sb.from("wallets").select("balance_cents").maybeSingle();
    balance = w ? (w as any).balance_cents : 0;
  }

  return <CartClient balance={balance} signedIn={!!(auth && auth.user)} />;
}
