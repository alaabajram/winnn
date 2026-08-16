"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, statusTone, Banner, cleanError } from "./ui";
import { winnn, dateFmt } from "@/lib/format";
import { toCents } from "@/lib/money";

type Item = { description: string; quantity: string; unit: string };

const BLANK: Item = { description: "", quantity: "1", unit: "" };

export default function InvoicesClient(props: {
  initial: any[]; merchants: any[]; campaigns: any[]; preselect: string;
}) {
  const [rows, setRows] = useState<any[]>(props.initial);
  const [open, setOpen] = useState(!!props.preselect);
  const [view, setView] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  const [merchantId, setMerchantId] = useState(props.preselect);
  const [campaignId, setCampaignId] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...BLANK }]);
  const [taxPercent, setTaxPercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const subtotal = items.reduce(
    (a, it) => a + Math.round((parseFloat(it.quantity || "0") || 0) * toCents(it.unit)),
    0
  );
  const tax = Math.round((subtotal * (parseFloat(taxPercent) || 0)) / 100);
  const total = subtotal + tax;

  function setItem(i: number, k: keyof Item, v: string) {
    const next = items.slice();
    next[i] = { ...next[i], [k]: v };
    setItems(next);
  }

  async function create() {
    setBusy(true);
    setMsg(null);
    const payload = {
      merchant_id: merchantId,
      campaign_id: campaignId || null,
      status,
      tax_percent: taxPercent,
      notes,
      due_at: dueAt || null,
      items: items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description,
          quantity: i.quantity || "1",
          unit_cents: String(toCents(i.unit)),
        })),
    };
    const res = await supabaseBrowser().rpc("fn_admin_create_invoice", { p: payload });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Invoice " + (res.data as any).invoice_no + " created." });
    setOpen(false);
    setItems([{ ...BLANK }]);
    setNotes("");
    const fresh = await supabaseBrowser()
      .from("merchant_invoices")
      .select("id,invoice_no,status,currency,subtotal_cents,tax_percent,tax_cents,total_cents,notes,issued_at,due_at,merchants(name),campaigns(name),merchant_invoice_items(description,quantity,unit_cents,line_cents,position)")
      .order("issued_at", { ascending: false }).limit(100);
    setRows((fresh.data as any[]) || []);
    router.refresh();
  }

  async function setInvoiceStatus(id: string, s: string) {
    const res = await supabaseBrowser().rpc("fn_admin_set_invoice_status", { p_id: id, p_status: s });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setRows(rows.map((r) => (r.id === id ? { ...r, status: s } : r)));
    if (view && view.id === id) setView({ ...view, status: s });
  }

  if (view) {
    const its: any[] = (view.merchant_invoice_items as any[]) || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView(null)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="num font-display text-display-sm text-on-background">{view.invoice_no}</h1>
          <Pill tone={statusTone(view.status)}>{view.status}</Pill>
        </div>

        <Card>
          <div className="mb-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Merchant</p>
              <p className="mt-1 font-headline text-headline-sm text-on-surface">
                {view.merchants ? view.merchants.name : "-"}
              </p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Campaign</p>
              <p className="mt-1 font-body text-body-md text-on-surface">
                {view.campaigns ? view.campaigns.name : "General"}
              </p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Issued</p>
              <p className="num mt-1 font-body text-body-md text-on-surface">{dateFmt(view.issued_at)}</p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Due</p>
              <p className="num mt-1 font-body text-body-md text-on-surface">
                {view.due_at ? dateFmt(view.due_at) : "On receipt"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Description</th>
                  <th className="pb-3 text-right font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Qty</th>
                  <th className="pb-3 text-right font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Unit</th>
                  <th className="pb-3 text-right font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {its.sort((a, b) => a.position - b.position).map((it, i) => (
                  <tr key={i}>
                    <td className="py-3 font-body text-body-md text-on-surface">{it.description}</td>
                    <td className="num py-3 text-right font-body text-body-md text-on-surface-variant">{it.quantity}</td>
                    <td className="num py-3 text-right font-body text-body-md text-on-surface-variant">{winnn(it.unit_cents)}</td>
                    <td className="num py-3 text-right font-label text-label-bold text-on-surface">{winnn(it.line_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between font-body text-body-md text-on-surface-variant">
                <span>Subtotal</span><span className="num">{winnn(view.subtotal_cents)} {view.currency}</span>
              </div>
              <div className="flex justify-between font-body text-body-md text-on-surface-variant">
                <span>Tax ({view.tax_percent}%)</span><span className="num">{winnn(view.tax_cents)}</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/30 pt-2 font-headline text-headline-sm text-on-surface">
                <span>Total</span><span className="num">{winnn(view.total_cents)} {view.currency}</span>
              </div>
            </div>
          </div>

          {view.notes ? (
            <p className="mt-6 rounded-xl bg-surface-container p-4 font-body text-body-md text-on-surface-variant">
              {view.notes}
            </p>
          ) : null}
        </Card>

        <div className="flex flex-wrap gap-3">
          {["SENT", "PAID", "OVERDUE", "VOID"].map((s) => (
            <Btn key={s} tone={s === "VOID" ? "danger" : "ghost"} onClick={() => setInvoiceStatus(view.id, s)}>
              Mark {s.toLowerCase()}
            </Btn>
          ))}
          <Btn tone="ghost" onClick={() => window.print()}>Print</Btn>
        </div>
      </div>
    );
  }

  if (open) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display text-display-sm text-on-background">New invoice</h1>
        </div>

        {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

        <Card title="Bill to">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Merchant">
              <select className={FIELD} value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                <option value="">Choose a merchant</option>
                {props.merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Campaign" hint="Optional. Links the invoice to a specific campaign.">
              <select className={FIELD} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">General / not campaign specific</option>
                {props.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Due date">
              <input className={FIELD} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={FIELD} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card
          title="Services"
          actions={<Btn tone="ghost" onClick={() => setItems([...items, { ...BLANK }])}>Add line</Btn>}
        >
          <div className="space-y-4">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-3">
                <div className="col-span-12 sm:col-span-6">
                  <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    Description
                  </label>
                  <input
                    className={FIELD}
                    placeholder="Campaign placement fee, voucher printing, ..."
                    value={it.description}
                    onChange={(e) => setItem(i, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    Qty
                  </label>
                  <input className={FIELD} inputMode="decimal" value={it.quantity}
                    onChange={(e) => setItem(i, "quantity", e.target.value)} />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    Unit (USD)
                  </label>
                  <input className={FIELD} inputMode="decimal" placeholder="0.00" value={it.unit}
                    onChange={(e) => setItem(i, "unit", e.target.value)} />
                </div>
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                  <span className="num font-label text-label-bold text-on-surface">
                    {winnn(Math.round((parseFloat(it.quantity || "0") || 0) * toCents(it.unit)))}
                  </span>
                  {items.length > 1 ? (
                    <button
                      onClick={() => setItems(items.filter((_, x) => x !== i))}
                      className="text-error hover:opacity-70"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-6 border-t border-outline-variant/30 pt-6 sm:flex-row sm:justify-between">
            <div className="w-full max-w-xs">
              <Field label="Tax percent" hint="Set 0 if not applicable.">
                <input className={FIELD} inputMode="decimal" value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)} />
              </Field>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between font-body text-body-md text-on-surface-variant">
                <span>Subtotal</span><span className="num">{winnn(subtotal)}</span>
              </div>
              <div className="flex justify-between font-body text-body-md text-on-surface-variant">
                <span>Tax</span><span className="num">{winnn(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/30 pt-2 font-headline text-headline-sm text-on-surface">
                <span>Total</span><span className="num">{winnn(total)} USD</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Notes">
          <textarea className={FIELD} rows={3} placeholder="Payment terms, bank details, reference"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Card>

        <div className="flex gap-3">
          <Btn onClick={create} disabled={busy || !merchantId || total <= 0}>
            {busy ? "Creating" : "Create invoice"}
          </Btn>
          <Btn tone="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
        </div>
      </div>
    );
  }

  const outstanding = rows
    .filter((r) => ["DRAFT", "SENT", "OVERDUE"].indexOf(r.status) > -1)
    .reduce((a, r) => a + Number(r.total_cents || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Merchant billing</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            B2B. What Winnn charges partner businesses for campaign placement, voucher printing and
            other services. Customer receipts are separate and are issued automatically.
          </p>
        </div>
        <Btn onClick={() => { setOpen(true); setMsg(null); }}>New invoice</Btn>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Invoices</p>
          <p className="num mt-2 font-headline text-headline-md text-on-surface">{rows.length}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Outstanding</p>
          <p className="num mt-2 font-headline text-headline-md text-on-surface">{winnn(outstanding)} USD</p>
        </div>
        <div className="rounded-2xl bg-primary-container p-5 shadow-sm">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-primary-container">Paid</p>
          <p className="num mt-2 font-headline text-headline-md text-secondary-fixed">
            {winnn(rows.filter((r) => r.status === "PAID").reduce((a, r) => a + Number(r.total_cents || 0), 0))}
          </p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Invoice", "Merchant", "Campaign", "Issued", "Total", "Status", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container/50">
                  <td className="num py-4 font-label text-label-bold text-on-surface">{r.invoice_no}</td>
                  <td className="py-4 font-body text-body-md text-on-surface">{r.merchants ? r.merchants.name : "-"}</td>
                  <td className="py-4 font-body text-sm text-on-surface-variant">{r.campaigns ? r.campaigns.name : "General"}</td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">{dateFmt(r.issued_at)}</td>
                  <td className="num py-4 font-label text-label-bold text-on-surface">{winnn(r.total_cents)}</td>
                  <td className="py-4"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => setView(r)}
                      className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
            No invoices yet.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
