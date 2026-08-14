import { requireAdmin } from "@/lib/admin";
import InvoicesClient from "@/components/admin/invoices-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage(props: any) {
  const search = await props.searchParams;
  const { sb } = await requireAdmin();

  const [{ data: invoices }, { data: merchants }, { data: campaigns }] = await Promise.all([
    sb.from("merchant_invoices")
      .select("id,invoice_no,status,currency,subtotal_cents,tax_percent,tax_cents,total_cents,notes,issued_at,due_at,merchants(name),campaigns(name),merchant_invoice_items(description,quantity,unit_cents,line_cents,position)")
      .order("issued_at", { ascending: false }).limit(100),
    sb.from("merchants").select("id,name").eq("status", "ACTIVE").order("name"),
    sb.from("campaigns").select("id,name").order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <InvoicesClient
      initial={(invoices as any[]) || []}
      merchants={(merchants as any[]) || []}
      campaigns={(campaigns as any[]) || []}
      preselect={search && search.merchant ? String(search.merchant) : ""}
    />
  );
}
