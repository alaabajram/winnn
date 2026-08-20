"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, statusTone, Banner, cleanError } from "./ui";
import { dateFmt } from "@/lib/format";

export default function VouchersClient(props: { batches: any[]; campaigns: any[]; merchants: any[] }) {
  const [batches, setBatches] = useState<any[]>(props.batches);
  const [campaignId, setCampaignId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [qty, setQty] = useState("500");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [copies, setCopies] = useState<any>({});
  const router = useRouter();

  const campaign = props.campaigns.find((c) => c.id === campaignId);
  const remaining = campaign
    ? Number(campaign.offline_serial_end) - Number(campaign.offline_serial_next) + 1
    : 0;

  async function reload() {
    const fresh = await supabaseBrowser().from("ticket_batches")
      .select("id,quantity,serial_from,serial_to,status,store_copies_received,created_at,campaigns(name,serial_prefix),merchants(name)")
      .order("created_at", { ascending: false }).limit(60);
    setBatches((fresh.data as any[]) || []);
    router.refresh();
  }

  async function generate() {
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_generate_offline_batch", {
      p_campaign_id: campaignId,
      p_merchant_id: merchantId,
      p_quantity: parseInt(qty, 10),
    });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    const d: any = res.data;
    setMsg({
      kind: "ok",
      text: "Generated " + d.quantity + " vouchers, serials " + d.serial_from + " to " + d.serial_to + ".",
    });
    reload();
  }

  async function setStatus(id: string, status: string, received?: number) {
    const res = await supabaseBrowser().rpc("fn_admin_set_batch_status", {
      p_batch_id: id, p_status: status,
      p_store_copies_received: received === undefined ? null : received,
    });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    reload();
  }

  async function exportNumbers(id: string, label: string) {
    const res = await supabaseBrowser().rpc("fn_admin_batch_numbers", { p_batch_id: id });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    const rows: any[] = (res.data as any[]) || [];
    const csv = "serial,entry_number\n" +
      rows.map((r) => r.serial + "," + r.entry_number).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "winnn-vouchers-" + label + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function cancelBatch(id: string) {
    const reason = window.prompt("Why is this batch being cancelled?");
    if (!reason) return;
    const res = await supabaseBrowser().rpc("fn_admin_cancel_batch", { p_batch_id: id, p_reason: reason });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Batch cancelled. Unredeemed vouchers are now void." });
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Vouchers</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Physical voucher stock for in-store campaigns. Each voucher has a public serial and a
          secret code; only the pair together can be redeemed.
        </p>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <Card title="Generate a batch">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Field label="Campaign">
            <select className={FIELD} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Choose</option>
              {props.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Merchant">
            <select className={FIELD} value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
              <option value="">Choose</option>
              {props.merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <input className={FIELD + " num"} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Btn onClick={generate} disabled={busy || !campaignId || !merchantId || !qty}>
              {busy ? "Generating" : "Generate"}
            </Btn>
          </div>
        </div>
        {campaign ? (
          <p className="num mt-4 font-body text-sm text-on-surface-variant">
            Serial prefix {campaign.serial_prefix} / entry prefix {campaign.entry_prefix} / next
            serial {campaign.offline_serial_next} / {remaining.toLocaleString()} remaining.
          </p>
        ) : null}
      </Card>

      <Card title="Batches">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Campaign", "Merchant", "Qty", "Serials", "Store copies", "Status", "Created", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container/50">
                  <td className="py-4 font-label text-label-bold text-on-surface">
                    {b.campaigns ? b.campaigns.name : "-"}
                  </td>
                  <td className="py-4 font-body text-body-md text-on-surface-variant">
                    {b.merchants ? b.merchants.name : "-"}
                  </td>
                  <td className="num py-4 font-label text-label-bold text-on-surface">{b.quantity}</td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">
                    {b.serial_from} - {b.serial_to}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <input
                        className="num w-20 rounded-lg bg-surface-container px-2 py-1 text-sm ring-1 ring-outline-variant/30"
                        defaultValue={b.store_copies_received}
                        onChange={(e) => setCopies({ ...copies, [b.id]: e.target.value })}
                      />
                      <button
                        onClick={() =>
                          setStatus(b.id, b.status, parseInt(copies[b.id] ?? b.store_copies_received, 10) || 0)
                        }
                        className="font-label text-[11px] font-semibold uppercase text-primary hover:underline"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="py-4"><Pill tone={statusTone(b.status)}>{b.status}</Pill></td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">{dateFmt(b.created_at)}</td>
                  <td className="py-4">
                    <div className="flex justify-end gap-2">
                      {b.status === "GENERATED" ? (
                        <button onClick={() => setStatus(b.id, "PRINTED")}
                          className="rounded-lg border border-outline-variant/40 px-2 py-1 font-label text-[11px] font-semibold hover:bg-surface-container">
                          Printed
                        </button>
                      ) : null}
                      {b.status === "PRINTED" ? (
                        <button onClick={() => setStatus(b.id, "DISTRIBUTED")}
                          className="rounded-lg border border-outline-variant/40 px-2 py-1 font-label text-[11px] font-semibold hover:bg-surface-container">
                          Distributed
                        </button>
                      ) : null}
                      <button onClick={() => exportNumbers(b.id, b.serial_from)}
                        className="rounded-lg border border-outline-variant/40 px-2 py-1 font-label text-[11px] font-semibold hover:bg-surface-container">
                        Numbers
                      </button>
                      {b.status !== "CANCELLED" ? (
                        <button onClick={() => cancelBatch(b.id)}
                          className="rounded-lg px-2 py-1 font-label text-[11px] font-semibold text-error hover:bg-error-container">
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!batches.length ? (
          <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
            No batches yet.
          </p>
        ) : null}
      </Card>

      <Card title="Before the draw">
        <ol className="space-y-3">
          {[
            "Generate a batch per merchant and mark it Printed once the run is back from the printer.",
            "Mark Distributed when the merchant has the vouchers. Only distributed batches enter the drum.",
            "As store copies come back, record the count. That number is published on the results page.",
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container font-label text-[12px] text-secondary-fixed">
                {i + 1}
              </span>
              <span className="font-body text-body-md text-on-surface-variant">{s}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
