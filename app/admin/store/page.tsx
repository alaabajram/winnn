import { requireAdmin } from "@/lib/admin";
import StoreClient from "@/components/admin/store-client";

export const dynamic = "force-dynamic";

export default async function AdminStorePage() {
  const { sb } = await requireAdmin();
  const [{ data: products }, { data: cats }, { data: orders }] = await Promise.all([
    sb.from("products").select("*").order("created_at", { ascending: false }),
    sb.from("product_categories").select("*").order("sort_order"),
    sb.from("orders")
      .select("id,order_no,total_cents,status,created_at,profiles(full_name,email),order_items(name_snapshot,quantity)")
      .order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <StoreClient
      products={(products as any[]) || []}
      cats={(cats as any[]) || []}
      orders={(orders as any[]) || []}
    />
  );
}
