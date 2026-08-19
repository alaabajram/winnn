import { requireAdmin } from "@/lib/admin";
import OrdersClient from "@/components/admin/orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { sb } = await requireAdmin();
  const { data } = await sb
    .from("v_admin_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return <OrdersClient initial={(data as any[]) || []} />;
}
