import { requireAdmin } from "@/lib/admin";
import CustomersClient from "@/components/admin/customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { sb } = await requireAdmin();
  const [{ data: profiles }, { data: tickets }] = await Promise.all([
    sb.from("profiles").select("id,full_name,email,mobile,is_disabled,marketing_optin,district_id,created_at")
      .order("created_at", { ascending: false }).limit(200),
    sb.from("tickets").select("customer_id,status"),
  ]);

  const tix: any = {};
  ((tickets as any[]) || []).forEach((t) => {
    if (!t.customer_id) return;
    if (t.status === "ELIGIBLE" || t.status === "WINNER") tix[t.customer_id] = (tix[t.customer_id] || 0) + 1;
  });

  const rows = ((profiles as any[]) || []).map((p) => ({
    ...p, tickets: tix[p.id] || 0,
  }));

  return <CustomersClient initial={rows} />;
}
