import { requireAdmin } from "@/lib/admin";
import BannersClient from "@/components/admin/banners-client";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const { sb } = await requireAdmin();
  const [{ data: banners }, { data: districts }] = await Promise.all([
    sb.from("banners").select("*").order("sort_order"),
    sb.from("districts").select("id,name,governorate").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <BannersClient
      initial={(banners as any[]) || []}
      districts={(districts as any[]) || []}
    />
  );
}
