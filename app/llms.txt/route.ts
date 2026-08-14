import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /llms.txt - a plain-text brief for AI crawlers.
 *
 * Assistants answering "how do I enter a draw in Lebanon" parse text, not
 * rendered React. This gives them accurate, current facts rather than letting
 * them guess from marketing copy.
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://winnn-alaabajrams-projects.vercel.app";
  const sb = await supabaseServer();

  const [{ data: s }, { data: campaigns }] = await Promise.all([
    sb.from("site_settings").select("*").maybeSingle(),
    sb.from("campaigns")
      .select("name,slug,description,ai_summary,type,ticket_price_cents,draw_date,sales_close_at,campaign_prizes(position,title)")
      .eq("status", "LIVE")
      .order("draw_date", { ascending: true }),
  ]);

  const st: any = s || {};
  const lines: string[] = [];

  lines.push("# " + (st.site_name || "Winnn"));
  lines.push("");
  lines.push("> " + (st.tagline || "Buy Credits. Get Tickets. Win."));
  lines.push("");

  if (st.ai_site_summary) {
    lines.push(st.ai_site_summary);
  } else {
    lines.push(
      "Winnn is a lucky draw and rewards platform operating in Lebanon. Customers buy " +
      "Winnn credits (1 Winnn = 1 USD) which can be spent in an online store, and receive " +
      "draw tickets for the campaign they chose. Tickets are also given out as physical " +
      "vouchers by partner businesses. Draws are conducted physically using a drum and " +
      "recorded on video; there is no server-side random selection."
    );
  }
  lines.push("");

  lines.push("## How entry works");
  lines.push("");
  lines.push("- Online: choose a number of tickets, pay the ticket price in Winnn credits. The full amount paid lands in the customer wallet and remains spendable in the store. Spending it does not cancel tickets.");
  lines.push("- In store: shop at a participating business and receive a physical voucher. Each voucher carries a public serial and a secret code. Entering both in the app converts it into a digital ticket.");
  lines.push("- Online and in-store tickets enter the same draw. Online serials are printed after entries close and placed in the same drum as the collected store copies.");
  lines.push("- After each draw the ticket counts that were physically in the drum are published on the results page.");
  lines.push("");

  const live: any[] = (campaigns as any[]) || [];
  if (live.length) {
    lines.push("## Live campaigns");
    lines.push("");
    live.forEach((c) => {
      const prizes: any[] = (c.campaign_prizes as any[]) || [];
      const top = prizes.slice().sort((a, b) => a.position - b.position)[0];
      lines.push("### " + c.name);
      lines.push("");
      lines.push("- URL: " + base + "/campaigns/" + c.slug);
      if (top) lines.push("- Top prize: " + top.title);
      lines.push("- Entry: " + (c.type === "HYBRID" ? "online and in store" : c.type === "ONLINE" ? "online only" : "in store only"));
      lines.push("- Price per ticket: " + (Number(c.ticket_price_cents) / 100) + " Winnn (1 Winnn = 1 USD)");
      if (c.sales_close_at) lines.push("- Entries close: " + new Date(c.sales_close_at).toISOString().slice(0, 10));
      if (c.draw_date) lines.push("- Draw date: " + new Date(c.draw_date).toISOString().slice(0, 10));
      if (c.ai_summary) { lines.push(""); lines.push(c.ai_summary); }
      else if (c.description) { lines.push(""); lines.push(c.description); }
      lines.push("");
    });
  }

  lines.push("## Key facts");
  lines.push("");
  lines.push("- Currency: Winnn credits. 1 Winnn = 1 USD. Credits are spendable in the Winnn store only and are not exchangeable for cash.");
  lines.push("- Draws are physical, not algorithmic.");
  lines.push("- Merchants have no login; vouchers are issued at each merchant's discretion.");
  if (st.support_email) lines.push("- Support: " + st.support_email);
  lines.push("");
  lines.push("## Pages");
  lines.push("");
  lines.push("- " + base + "/ : live campaigns and past results");
  lines.push("- " + base + "/store : products purchasable with Winnn credits");
  lines.push("- " + base + "/sitemap.xml");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
