import { requireAdmin } from "@/lib/admin";
import CrmClient from "@/components/admin/crm-client";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const { sb } = await requireAdmin();
  const [{ data: segments }, { data: templates }, { data: sends }, { data: districts }, { data: campaigns }] =
    await Promise.all([
      sb.from("customer_segments").select("*").order("created_at", { ascending: false }),
      sb.from("email_templates").select("*").order("created_at", { ascending: false }),
      sb.from("email_sends").select("*").order("created_at", { ascending: false }).limit(30),
      sb.from("districts").select("id,name,governorate").eq("is_active", true).order("sort_order"),
      sb.from("campaigns").select("id,name").order("created_at", { ascending: false }).limit(40),
    ]);

  return (
    <CrmClient
      segments={(segments as any[]) || []}
      templates={(templates as any[]) || []}
      sends={(sends as any[]) || []}
      districts={(districts as any[]) || []}
      campaigns={(campaigns as any[]) || []}
    />
  );
}
