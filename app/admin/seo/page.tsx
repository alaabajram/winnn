import { requireAdmin } from "@/lib/admin";
import SeoClient from "@/components/admin/seo-client";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const { sb } = await requireAdmin();
  const [{ data: settings }, { data: campaigns }] = await Promise.all([
    sb.from("site_settings").select("*").maybeSingle(),
    sb.from("campaigns")
      .select("id,name,slug,status,meta_title,meta_description,ai_summary,keywords,noindex")
      .order("created_at", { ascending: false }),
  ]);
  return <SeoClient settings={(settings as any) || {}} campaigns={(campaigns as any[]) || []} />;
}
