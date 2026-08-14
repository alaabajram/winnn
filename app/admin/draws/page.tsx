import { requireAdmin } from "@/lib/admin";
import DrawsClient from "@/components/admin/draws-client";

export const dynamic = "force-dynamic";

export default async function DrawsPage() {
  const { sb } = await requireAdmin();
  const [{ data: campaigns }, { data: draws }] = await Promise.all([
    sb.from("campaigns")
      .select("id,name,slug,status,draw_date,sales_close_at,serial_prefix,campaign_prizes(position,title,value_cents)")
      .in("status", ["LIVE", "PAUSED", "SALES_CLOSED", "DRAWN", "COMPLETED"])
      .order("draw_date", { ascending: true }),
    sb.from("draws")
      .select("id,campaign_id,status,pool_online_count,pool_offline_count,pool_total_count,store_copies_received,youtube_video_id,sales_closed_at,published_at,draw_winners(position,claim_status,tickets(serial,source)),draw_pulls(attempt_no,prize_position,serial_entered,result,reason,pulled_at)")
      .order("sales_closed_at", { ascending: false }),
  ]);
  return <DrawsClient campaigns={(campaigns as any[]) || []} draws={(draws as any[]) || []} />;
}
