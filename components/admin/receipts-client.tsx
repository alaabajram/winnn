"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill, Btn, Banner } from "./ui";
import { winnn, dateFmt } from "@/lib/format";

const KIND: any = {
  CREDIT_PURCHASE: "Credit purchase",
  STORE_ORDER: "Store order",
  REFUND: "Refund",
};

const TONE: any = {
  SENT: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
  PENDING: "bg-secondary-container text-on-secondary-container",
  FAILED: "bg-error-container text-on-error-container",
  SKIPPED: "bg-surface-container text-on-surface-variant",
};

export default function ReceiptsClient(props: { initial: any[] }) {
  const [rows] = useState<any[]>(props.initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  const pending = rows.filter((r) => r.email_status === "PENDING").length;
  const failed = rows.filter((r) => r.email_status === "FAILED").length;

  async function drain() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/receipts/send", { method: "POST" });
      const d = await res.json();
      setMsg(
        d.skipped
          ? { kind: "error", text: "Email is not configured yet. Add RESEND_API_KEY and RECEIPT_FROM_EMAIL in Vercel." }
          : { kind: "ok", text: "Processed " + d.processed + ", sent " + d.sent + ", failed " + d.failed + "." }
      );
      router.refresh();
    } catch (e: any) {
      setMsg({ kind: "error", text: String(e && e.message ? e.message : e) });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Customer receipts</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            Issued automatically when a customer buys credits, places a store order, or is refunded.
            Separate from merchant billing.
          </p>
        </div>
        <Btn onClick={drain} disabled={busy}>{busy ? "Sending" : "Send pending"}</Btn>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { l: "Receipts", v: rows.length },
          { l: "Queued", v: pending },
          { l: "Failed", v: failed },
          { l: "Sent", v: rows.filter((r) => r.email_status === "SENT").length },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{k.l}</p>
            <p className="num mt-2 font-headline text-headline-md text-on-surface">{k.v}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Receipt", "Type", "Customer", "Amount", "Email", "Date"].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container/50">
                  <td className="num py-4 font-label text-label-bold text-on-surface">{r.receipt_no}</td>
                  <td className="py-4"><Pill>{KIND[r.kind] || r.kind}</Pill></td>
                  <td className="py-4">
                    <p className="font-body text-body-md text-on-surface">
                      {r.profiles ? r.profiles.full_name || "-" : "-"}
                    </p>
                    <p className="font-body text-sm text-on-surface-variant">{r.email}</p>
                  </td>
                  <td className="num py-4 font-label text-label-bold text-on-surface">
                    {winnn(r.total_cents)} W
                  </td>
                  <td className="py-4">
                    <Pill tone={TONE[r.email_status]}>{r.email_status}</Pill>
                    {r.email_error ? (
                      <p className="mt-1 max-w-[220px] truncate font-body text-[11px] text-error"
                        title={r.email_error}>
                        {r.email_error}
                      </p>
                    ) : null}
                  </td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">
                    {dateFmt(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
            No receipts yet. One is created automatically on every credit purchase and store order.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
