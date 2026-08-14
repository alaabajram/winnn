import { requireAdmin } from "@/lib/admin";
import CustomersClient from "@/components/admin/customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { sb } = await requireAdmin();
  const [{ data: profiles }, { data: wallets }, { data: tickets }] = await Promise.all([
    sb.from("profiles").select("id,full_name,email,mobile,is_disabled,created_at")
      .order("created_at", { ascending: false }).limit(200),
    sb.from("wallets").select("customer_id,balance_cents"),
    sb.from("tickets").select("customer_id,status"),
  ]);

  const bal: any = {};
  ((wallets as any[]) || []).forEach((w) => { bal[w.customer_id] = w.balance_cents; });
  const tix: any = {};
  ((tickets as any[]) || []).forEach((t) => {
    if (!t.customer_id) return;
    if (t.status === "ELIGIBLE" || t.status === "WINNER") tix[t.customer_id] = (tix[t.customer_id] || 0) + 1;
  });

  const rows = ((profiles as any[]) || []).map((p) => ({
    ...p, balance_cents: bal[p.id] || 0, tickets: tix[p.id] || 0,
  }));

  return <CustomersClient initial={rows} />;
}
