"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Banner, cleanError } from "./ui";
import { winnn, dateFmt } from "@/lib/format";
import { toCents } from "@/lib/money";

export default function CustomersClient(props: { initial: any[] }) {
  const [rows] = useState<any[]>(props.initial);
  const [q, setQ] = useState("");
  const [adjust, setAdjust] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("credit");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  const filtered = rows.filter(
    (r) => !q || ((r.full_name || "") + " " + (r.email || "") + " " + (r.mobile || ""))
      .toLowerCase().indexOf(q.toLowerCase()) > -1
  );

  async function submit() {
    setBusy(true);
    setMsg(null);
    const cents = toCents(amount) * (direction === "debit" ? -1 : 1);
    const res = await supabaseBrowser().rpc("fn_admin_adjust_wallet", {
      p_customer_id: adjust.id, p_amount_cents: cents, p_reason: reason,
    });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Wallet adjusted. New balance " + winnn((res.data as any).balance_after_cents) + " Winnn." });
    setAdjust(null);
    setAmount("");
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Customers</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Every adjustment writes an immutable ledger entry and an audit log line.
        </p>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      {adjust ? (
        <Card title={"Adjust wallet - " + (adjust.full_name || adjust.email)}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Direction">
              <select className={FIELD} value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="credit">Credit (add Winnn)</option>
                <option value="debit">Debit (remove Winnn)</option>
              </select>
            </Field>
            <Field label="Amount (Winnn)">
              <input className={FIELD + " num"} inputMode="decimal" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Reason" hint="Required. Appears in the audit log.">
              <input className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <Btn onClick={submit} disabled={busy || !reason || toCents(amount) <= 0}>Apply</Btn>
            <Btn tone="ghost" onClick={() => setAdjust(null)}>Cancel</Btn>
          </div>
        </Card>
      ) : null}

      <input className={FIELD + " max-w-md"} placeholder="Search name, email or mobile"
        value={q} onChange={(e) => setQ(e.target.value)} />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Customer", "Contact", "Balance", "Tickets", "Joined", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-surface-container/50">
                  <td className="py-4 font-label text-label-bold text-on-surface">{r.full_name || "No name"}</td>
                  <td className="py-4">
                    <p className="font-body text-sm text-on-surface">{r.email}</p>
                    <p className="num font-body text-sm text-on-surface-variant">{r.mobile || ""}</p>
                  </td>
                  <td className="num py-4 font-headline text-headline-sm text-on-surface">{winnn(r.balance_cents)}</td>
                  <td className="num py-4 font-label text-label-bold text-on-surface">{r.tickets}</td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">{dateFmt(r.created_at)}</td>
                  <td className="py-4 text-right">
                    <button onClick={() => { setAdjust(r); setMsg(null); }}
                      className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
