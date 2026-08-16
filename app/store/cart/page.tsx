import { supabaseServer } from "@/lib/supabase/server";
import CartClient from "@/components/cart-client";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  let balance: number | null = null;
  let addresses: any[] = [];
  if (auth && auth.user) {
    const { data: w } = await sb.from("wallets").select("balance_cents").maybeSingle();
    balance = w ? (w as any).balance_cents : 0;
    const { data: a } = await sb
      .from("customer_addresses").select("*").order("is_default", { ascending: false });
    addresses = (a as any[]) || [];
  }

  return (
    <CartClient
      balance={balance}
      signedIn={!!(auth && auth.user)}
      addresses={addresses}
    />
  );
}
