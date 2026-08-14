import { requireAdmin } from "@/lib/admin";
import MerchantsClient from "@/components/admin/merchants-client";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("merchants").select("*").order("name");
  return <MerchantsClient initial={(data as any[]) || []} />;
}
