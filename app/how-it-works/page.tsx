import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import HowItWorks from "@/components/how-it-works";
import JsonLd from "@/components/json-ld";

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

  const faq = [
    ["Am I paying for the tickets?",
     "No. You are buying a product at its normal price. The draw tickets come free with the purchase."],
    ["When do my tickets appear?",
     "As soon as your payment clears. They show under My tickets with their own serial numbers."],
    ["Is the shop ticket really free?",
     "Yes. Partner businesses hand them out with a qualifying purchase at their own discretion."],
    ["What does entering the number online do?",
     "The shop keeps one half of your ticket and that half is already in the drum. Entering the number adds a second slip, so you have two chances."],
    ["How do I know the draw is fair?",
     "It is physical and recorded. After each draw we publish how many tickets of each kind were in the drum."],
  ];

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }} />
      <HowItWorks merchants={(merchants as any[]) || []} hasLive={(count || 0) > 0} />
    </>
  );
}
