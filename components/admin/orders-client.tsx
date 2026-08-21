"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, Btn, Pill, Banner, FIELD, cleanError } from "./ui";
import { price } from "@/lib/money";
import { dateFmt } from "@/lib/format";

const TONE: any = {
  PAID: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
  AWAITING_PAYMENT: "bg-secondary-container text-on-secondary-container",
  CANCELLED: "bg-error-container text-on-error-container",
};

export default function OrdersClient(props: { initial: any[] }) {
  const [rows, setRows] = useState<any[]>(props.initial);
  const [open, setOpen] = useState<any>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [tab, setTab] = useState<"awaiting" | "tofulfil" | "paid" | "all">("awaiting");
  const router = useRouter();

  async function reload() {
    const { data } = await supabaseBrowser()
      .from("v_admin_orders").select("*")
      .order("created_at", { ascending: false }).limit(100);
    setRows((data as any[]) || []);
    router.refresh();
  }

  async function confirm(id: string) {
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_admin_confirm_order_payment", {
      p_order_id: id, p_note: note || null,
    });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    const d: any = res.data;
    setMsg({
      kind: "ok",
      text: "Payment confirmed. " + d.tickets_issued + " ticket" +
            (d.tickets_issued === 1 ? "" : "s") + " issued.",
    });
    setNote("");
    setOpen(null);
    reload();
    // send the receipt, fire and forget
    if (d.receipt_id) {
      fetch("/api/receipts/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.receipt_id }),
      }).catch(() => {});
    }
  }

  async function setFulfilment(id: string, status: string) {
    const note = status === "SHIPPED"
      ? window.prompt("Courier or tracking note (optional)") || ""
      : "";
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_admin_set_fulfilment", {
      p_order_id: id, p_status: status, p_note: note || null,
    });
    setBusy(false);
    if (res.error) {
      setMsg({
        kind: "error",
        text: res.error.message.indexOf("ERR_NOT_PAID") > -1
          ? "Confirm payment before moving this order."
          : cleanError(res.error.message),
      });
      return;
    }
    setMsg({ kind: "ok", text: "Order marked " + status.toLowerCase() + "." });
    if (open && open.id === id) setOpen({ ...open, status });
    reload();
  }

  async function cancel(id: string) {
    const reason = window.prompt("Why is this order being cancelled?");
    if (!reason) return;
    setBusy(true);
    const res = await supabaseBrowser().rpc("fn_admin_cancel_order", {
      p_order_id: id, p_reason: reason,
    });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Order cancelled and stock returned." });
    setOpen(null);
    reload();
  }

  const filtered = rows.filter((r) =>
    tab === "all" ? true
    : tab === "paid" ? r.payment_state === "PAID"
    : tab === "tofulfil"
      ? r.payment_state === "PAID" && r.status !== "COMPLETED" && r.status !== "CANCELLED"
      : r.payment_state === "AWAITING_PAYMENT"
  );

  const awaiting = rows.filter((r) => r.payment_state === "AWAITING_PAYMENT");
  const owed = awaiting.reduce((a, r) => a + Number(r.total_cents || 0), 0);

  if (open) {
    const items: any[] = (open.items as any[]) || [];
    const sh = open.shipping || {};
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setOpen(null)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="num font-display text-display-sm text-on-background">{open.order_no}</h1>
          <Pill tone={TONE[open.payment_state]}>
            {open.payment_state === "AWAITING_PAYMENT" ? "Awaiting payment" : open.payment_state}
          </Pill>
        </div>

        {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Items">
              <table className="w-full text-left">
                <tbody className="divide-y divide-outline-variant/20">
                  {items.map((i, n) => (
                    <tr key={n}>
                      <td className="py-3 font-body text-body-md text-on-surface">
                        {i.name} <span className="num text-on-surface-variant">x{i.quantity}</span>
                      </td>
                      <td className="num py-3 text-right font-label text-label-bold text-on-surface">
                        {price(i.line_cents)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 font-headline text-headline-sm text-on-surface">Total</td>
                    <td className="num py-3 text-right font-headline text-headline-sm text-on-surface">
                      {price(open.total_cents)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            <Card title="Deliver to">
              <p className="font-body text-body-md leading-relaxed text-on-surface">
                {[sh.full_name, sh.phone, sh.line1, sh.line2, sh.area, sh.city]
                  .filter(Boolean).join("\n")
                  .split("\n").map((l: string, i: number) => <span key={i} className="block">{l}</span>)}
              </p>
              {sh.notes ? (
                <p className="mt-3 rounded-xl bg-surface-container p-3 font-body text-sm text-on-surface-variant">
                  {sh.notes}
                </p>
              ) : null}
            </Card>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-primary-container p-6 text-on-primary-container">
              <p className="font-label text-[10px] uppercase tracking-widest opacity-70">
                Tickets on confirmation
              </p>
              <p className="num mt-1 font-display text-display-sm text-secondary-fixed">
                {open.payment_state === "PAID" ? open.tickets_issued : open.tickets_expected}
              </p>
              <p className="mt-2 font-body text-sm">
                {open.payment_state === "PAID"
                  ? "Issued and in the customer wallet."
                  : "Issued the moment you confirm payment. Not before."}
              </p>
            </div>

            <Card title="Customer">
              <p className="font-label text-label-bold text-on-surface">{open.full_name || "-"}</p>
              <p className="font-body text-body-md text-on-surface-variant">{open.email}</p>
              <p className="num font-body text-body-md text-on-surface-variant">{open.mobile || sh.phone}</p>
            </Card>

            {open.payment_state === "PAID" ? (
              <Card title="Fulfilment">
                <div className="mb-4 flex flex-wrap gap-2">
                  {["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"].map((st, i) => {
                    const order = ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"];
                    const at = order.indexOf(open.status);
                    const done = at >= i;
                    return (
                      <span key={st}
                        className={
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-label text-[10px] font-semibold uppercase tracking-widest " +
                          (done
                            ? "bg-tertiary-fixed/40 text-on-tertiary-fixed"
                            : "bg-surface-container text-on-surface-variant")
                        }>
                        <span className="material-symbols-outlined text-[14px]">
                          {done ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        {st === "COMPLETED" ? "Delivered" : st.toLowerCase()}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2">
                  {open.status === "CONFIRMED" ? (
                    <Btn onClick={() => setFulfilment(open.id, "PROCESSING")} disabled={busy}>
                      Start processing
                    </Btn>
                  ) : null}
                  {open.status === "PROCESSING" ? (
                    <Btn onClick={() => setFulfilment(open.id, "SHIPPED")} disabled={busy}>
                      Mark shipped
                    </Btn>
                  ) : null}
                  {open.status === "SHIPPED" ? (
                    <Btn onClick={() => setFulfilment(open.id, "COMPLETED")} disabled={busy}>
                      Mark delivered
                    </Btn>
                  ) : null}
                  {open.status === "COMPLETED" ? (
                    <p className="rounded-xl bg-tertiary-fixed/20 p-4 font-body text-body-md text-on-tertiary-fixed">
                      Delivered{open.delivered_at ? " " + dateFmt(open.delivered_at) : ""}.
                    </p>
                  ) : null}
                </div>

                {open.tracking_note ? (
                  <p className="mt-3 rounded-xl bg-surface-container p-3 font-body text-sm text-on-surface-variant">
                    {open.tracking_note}
                  </p>
                ) : null}
              </Card>
            ) : null}

            {open.payment_state === "AWAITING_PAYMENT" ? (
              <Card title="Confirm payment">
                <p className="mb-4 font-body text-body-md text-on-surface-variant">
                  Only confirm once the money has actually arrived. This issues tickets, which
                  cannot be un-issued.
                </p>
                <input className={FIELD} placeholder="Reference or note"
                  value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-4 flex flex-col gap-2">
                  <Btn onClick={() => confirm(open.id)} disabled={busy}>
                    {busy ? "Confirming" : "Confirm payment"}
                  </Btn>
                  <Btn tone="danger" onClick={() => cancel(open.id)} disabled={busy}>
                    Cancel order
                  </Btn>
                </div>
              </Card>
            ) : (
              <Card title="Payment">
                <p className="font-body text-body-md text-on-surface">
                  {open.payment_method} / {open.payment_ref}
                </p>
                {open.paid_at ? (
                  <p className="num mt-1 font-body text-sm text-on-surface-variant">
                    Paid {dateFmt(open.paid_at)}
                  </p>
                ) : null}
                {open.payment_note ? (
                  <p className="mt-3 rounded-xl bg-surface-container p-3 font-body text-sm text-on-surface-variant">
                    {open.payment_note}
                  </p>
                ) : null}
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Orders</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Tickets are issued when you confirm payment, never before.
        </p>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { l: "Awaiting payment", v: awaiting.length },
          { l: "Value awaiting", v: price(owed) },
          { l: "Paid", v: rows.filter((r) => r.payment_state === "PAID").length },
          { l: "Tickets issued", v: rows.reduce((a, r) => a + Number(r.tickets_issued || 0), 0) },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{k.l}</p>
            <p className="num mt-2 font-headline text-headline-md text-on-surface">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 rounded-xl bg-surface-container p-1">
        {(["awaiting", "tofulfil", "paid", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={
              "flex-1 rounded-lg py-2.5 font-label text-label-bold capitalize transition-colors " +
              (tab === t ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant")
            }>
            {t === "tofulfil" ? "to fulfil" : t}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Order", "Customer", "Total", "Tickets", "Payment", "Fulfilment", "Placed", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container/50">
                  <td className="num py-4 font-label text-label-bold text-on-surface">{r.order_no}</td>
                  <td className="py-4">
                    <p className="font-body text-body-md text-on-surface">{r.full_name || "-"}</p>
                    <p className="font-body text-sm text-on-surface-variant">{r.email}</p>
                  </td>
                  <td className="num py-4 font-label text-label-bold text-on-surface">
                    {price(r.total_cents)}
                  </td>
                  <td className="num py-4 font-label text-label-bold text-secondary">
                    {r.payment_state === "PAID" ? r.tickets_issued : r.tickets_expected}
                  </td>
                  <td className="py-4">
                    <Pill tone={TONE[r.payment_state]}>
                      {r.payment_state === "AWAITING_PAYMENT" ? "Awaiting" : r.payment_state}
                    </Pill>
                  </td>
                  <td className="py-4">
                    {r.payment_state === "PAID" ? (
                      <Pill tone={r.status === "COMPLETED"
                        ? "bg-tertiary-fixed/40 text-on-tertiary-fixed"
                        : "bg-surface-container text-on-surface-variant"}>
                        {r.status === "COMPLETED" ? "Delivered" : r.status}
                      </Pill>
                    ) : null}
                  </td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">
                    {dateFmt(r.created_at)}
                  </td>
                  <td className="py-4 text-right">
                    <button onClick={() => { setOpen(r); setMsg(null); }}
                      className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
            No orders here.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
