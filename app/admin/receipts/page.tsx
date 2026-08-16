import { requireAdmin } from "@/lib/admin";
import ReceiptsClient from "@/components/admin/receipts-client";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const { sb } = await requireAdmin();
  const { data } = await sb
    .from("receipts")
    .select("id,receipt_no,kind,email,total_cents,email_status,email_attempts,email_error,sent_at,created_at,snapshot,profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  return <ReceiptsClient initial={(data as any[]) || []} />;
}
