import { supabaseServer } from "@/lib/supabase/server";
import CartClient from "@/components/cart-client";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  let addresses: any[] = [];
  if (auth && auth.user) {
    const { data: a } = await sb
      .from("customer_addresses").select("*").order("is_default", { ascending: false });
    addresses = (a as any[]) || [];
  }

  return <CartClient signedIn={!!(auth && auth.user)} addresses={addresses} />;
}
