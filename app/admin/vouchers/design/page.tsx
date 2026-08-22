import { requireAdmin } from "@/lib/admin";
import VoucherDesigner from "@/components/admin/voucher-designer";

export const dynamic = "force-dynamic";

export default async function VoucherDesignPage(props: any) {
  const search = await props.searchParams;
  const campaignId = search && search.campaign ? String(search.campaign) : "";
  const { sb } = await requireAdmin();

  const [{ data: campaigns }, { data: settings }] = await Promise.all([
    sb.from("campaigns")
      .select("id,name,slug,draw_date,voucher_design,banner_url,sponsor_logo_url,campaign_prizes(position,title,image_url)")
      .order("created_at", { ascending: false }),
    sb.from("site_settings").select("site_name,logo_url,voucher_design").maybeSingle(),
  ]);

  return (
    <VoucherDesigner
      campaigns={(campaigns as any[]) || []}
      settings={(settings as any) || {}}
      initialCampaign={campaignId}
    />
  );
}
