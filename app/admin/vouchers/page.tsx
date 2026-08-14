import { requireAdmin } from "@/lib/admin";
import VouchersClient from "@/components/admin/vouchers-client";

export const dynamic = "force-dynamic";

export default async function VouchersPage() {
  const { sb } = await requireAdmin();
  const [{ data: batches }, { data: campaigns }, { data: merchants }] = await Promise.all([
    sb.from("ticket_batches")
      .select("id,quantity,serial_from,serial_to,status,store_copies_received,created_at,campaigns(name,serial_prefix),merchants(name)")
      .order("created_at", { ascending: false }).limit(60),
    sb.from("campaigns").select("id,name,type,status,serial_prefix,offline_serial_next,offline_serial_end")
      .neq("type", "ONLINE").order("created_at", { ascending: false }),
    sb.from("merchants").select("id,name").eq("status", "ACTIVE").order("name"),
  ]);
  return (
    <VouchersClient
      batches={(batches as any[]) || []}
      campaigns={(campaigns as any[]) || []}
      merchants={(merchants as any[]) || []}
    />
  );
}
