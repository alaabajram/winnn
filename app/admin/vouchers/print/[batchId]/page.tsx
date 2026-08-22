import { requireAdmin } from "@/lib/admin";
import PrintSheet from "@/components/admin/print-sheet";

export const dynamic = "force-dynamic";

export default async function PrintPage(props: any) {
  const params = await props.params;
  const { sb } = await requireAdmin();
  const { data, error } = await sb.rpc("fn_admin_batch_print", { p_batch_id: params.batchId });

  if (error || !data) {
    return (
      <div className="rounded-3xl bg-error-container p-8 text-on-error-container">
        <p className="font-headline text-headline-sm">Could not load this batch</p>
        <p className="mt-2 font-body text-body-md">{error ? error.message : "Not found"}</p>
      </div>
    );
  }

  return <PrintSheet data={data as any} />;
}
