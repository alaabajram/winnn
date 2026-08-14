import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://winnn-alaabajrams-projects.vercel.app";
  const sb = await supabaseServer();

  const [{ data: campaigns }, { data: draws }] = await Promise.all([
    sb.from("campaigns").select("slug,updated_at,status,noindex")
      .in("status", ["LIVE", "PAUSED", "SALES_CLOSED", "ENDED", "DRAWN", "COMPLETED"]),
    sb.from("draws").select("published_at,campaigns(slug)").eq("status", "PUBLISHED"),
  ]);

  const out: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: base + "/store", changeFrequency: "daily", priority: 0.8 },
  ];

  ((campaigns as any[]) || []).forEach((c) => {
    if (c.noindex) return;
    out.push({
      url: base + "/campaigns/" + c.slug,
      lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
      changeFrequency: "daily",
      priority: 0.9,
    });
  });

  ((draws as any[]) || []).forEach((d) => {
    if (!d.campaigns) return;
    out.push({
      url: base + "/results/" + d.campaigns.slug,
      lastModified: d.published_at ? new Date(d.published_at) : undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  return out;
}
