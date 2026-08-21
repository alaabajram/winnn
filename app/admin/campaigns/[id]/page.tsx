import { requireAdmin } from "@/lib/admin";
import CampaignEditor from "@/components/admin/campaign-editor";

export const dynamic = "force-dynamic";

export default async function CampaignEditPage(props: any) {
  const params = await props.params;
  const id = params.id;
  const { sb } = await requireAdmin();

  const [{ data: merchants }, { data: districts }, { data: products }] = await Promise.all([
    sb.from("merchants").select("id,name").eq("status", "ACTIVE").order("name"),
    sb.from("districts").select("id,name,governorate").eq("is_active", true).order("sort_order"),
    sb.from("products").select("id,name,price_cents").eq("status", "ACTIVE").order("name"),
  ]);

  if (id === "new") {
    return (
      <CampaignEditor
        campaign={null} prizes={[]} selected={[]}
        merchants={(merchants as any[]) || []}
        districts={(districts as any[]) || []}
        products={(products as any[]) || []}
        tethered={[]}
        districtIds={[]}
      />
    );
  }

  const [{ data: campaign }, { data: prizes }, { data: cm }, { data: cp }] = await Promise.all([
    sb.from("campaigns").select("*").eq("id", id).maybeSingle(),
    sb.from("campaign_prizes").select("position,title,value_cents,image_url").eq("campaign_id", id).order("position"),
    sb.from("campaign_merchants").select("merchant_id").eq("campaign_id", id),
    sb.from("campaign_products").select("product_id,tickets_per_unit,is_primary").eq("campaign_id", id).order("sort_order"),
  ]);

  const { data: cd } = await sb
    .from("campaign_districts").select("district_id").eq("campaign_id", id);

  return (
    <CampaignEditor
      campaign={(campaign as any) || null}
      prizes={(prizes as any[]) || []}
      selected={((cm as any[]) || []).map((x) => x.merchant_id)}
      merchants={(merchants as any[]) || []}
      districts={(districts as any[]) || []}
      products={(products as any[]) || []}
      tethered={(cp as any[]) || []}
      districtIds={((cd as any[]) || []).map((x) => x.district_id)}
    />
  );
}
