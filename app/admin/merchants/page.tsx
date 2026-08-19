import { requireAdmin } from "@/lib/admin";
import MerchantsClient from "@/components/admin/merchants-client";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const { sb } = await requireAdmin();
  const [{ data }, { data: districts }] = await Promise.all([
    sb.from("merchants").select("*,districts(name,governorate)").order("name"),
    sb.from("districts").select("id,name,governorate").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <MerchantsClient
      initial={(data as any[]) || []}
      districts={(districts as any[]) || []}
    />
  );
}
