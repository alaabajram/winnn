import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import HowItWorks from "@/components/how-it-works";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works - Winnn",
  description:
    "Two ways to enter a Winnn draw: buy credits online and get tickets, or pick up a free voucher when you shop with a partner business in Lebanon. Both go into the same physical drum.",
};

export default async function HowItWorksPage() {
  const sb = await supabaseServer();
  const [{ data: merchants }, { count }] = await Promise.all([
    sb.from("merchants").select("id,name,category,address,logo_url").eq("status", "ACTIVE").order("name").limit(9),
    sb.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "LIVE"),
  ]);

  return <HowItWorks merchants={(merchants as any[]) || []} hasLive={(count || 0) > 0} />;
}
