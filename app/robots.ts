import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://winnn-alaabajrams-projects.vercel.app";
  const sb = await supabaseServer();
  const { data } = await sb.from("site_settings").select("maintenance_mode").maybeSingle();
  const down = data ? (data as any).maintenance_mode : false;

  if (down) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/auth/", "/wallet", "/profile", "/login"],
      },
    ],
    sitemap: base + "/sitemap.xml",
  };
}
