"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Card, Btn, Pill, Banner, cleanError } from "./ui";
import { dateFmt } from "@/lib/format";
import { price } from "@/lib/money";

export default function CustomersClient(props: { initial: any[] }) {
  const [rows, setRows] = useState<any[]>(props.initial);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  const filtered = rows.filter(
    (r) => !q || ((r.full_name || "") + " " + (r.email || "") + " " + (r.mobile || ""))
      .toLowerCase().indexOf(q.toLowerCase()) > -1
  );

  async function openCustomer(r: any) {
    setOpen(r);
    setHistory(null);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_admin_customer_history", { p_customer: r.id });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setHistory(res.data);
  }

  async function setPaused(id: string, disabled: boolean) {
    const reason = disabled ? window.prompt("Why is this account being paused?") : "Resumed";
    if (disabled && !reason) return;
    setBusy(true);
    const res = await supabaseBrowser().rpc("fn_admin_set_customer_state", {
      p_customer: id, p_disabled: disabled, p_reason: reason,
    });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setRows(rows.map((r) => (r.id === id ? { ...r, is_disabled: disabled } : r)));
    if (open && open.id === id) setOpen({ ...open, is_disabled: disabled });
    setMsg({ kind: "ok", text: disabled ? "Account paused." : "Account resumed." });
    router.refresh();
  }

  async function setOptin(id: string, optin: boolean) {
    const res = await supabaseBrowser().rpc("fn_admin_set_customer_optin", {
      p_customer: id, p_optin: optin,
    });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setRows(rows.map((r) => (r.id === id ? { ...r, marketing_optin: optin } : r)));
    if (open && open.id === id) setOpen({ ...open, marketing_optin: optin });
  }

  if (open) {
    const t = history ? history.totals : null;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setOpen(null)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display text-display-sm text-on-background">
            {open.full_name || open.email}
          </h1>
          {open.is_disabled ? <Pill tone="bg-error-container text-on-error-container">Paused</Pill> : null}
        </div>

        {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

        {t ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { l: "Orders", v: t.orders },
              { l: "Paid", v: t.paid_orders },
              { l: "Spent", v: price(t.spent_cents) },
              { l: "Slips in drums", v: t.slips },
              { l: "Wins", v: t.wins },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{k.l}</p>
                <p className="num mt-1 font-headline text-headline-sm text-on-surface">{k.v}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 animate-pulse rounded-2xl bg-surface-container" />
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Orders">
              {history && history.orders.length ? (
                <div className="divide-y divide-outline-variant/20">
                  {history.orders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="num font-label text-label-bold text-on-surface">{o.order_no}</p>
                        <p className="num font-body text-sm text-on-surface-variant">
                          {dateFmt(o.created_at)} / {o.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="num font-label text-label-bold text-on-surface">
                          {price(o.total_cents)}
                        </p>
                        {o.tickets_issued ? (
                          <p className="num font-body text-sm text-secondary">
                            {o.tickets_issued} tickets
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-body-md text-on-surface-variant">No orders.</p>
              )}
            </Card>

            <Card title="Tickets">
              {history && history.tickets.length ? (
                <div className="flex flex-wrap gap-2">
                  {history.tickets.map((x: any, i: number) => (
                    <span key={i}
                      className={
                        "num rounded px-2 py-1 font-label text-[11px] " +
                        (x.registered
                          ? "bg-tertiary-fixed/30 text-on-tertiary-fixed"
                          : "bg-surface-container text-on-surface-variant")
                      }
                      title={x.campaign}>
                      {x.serial}{x.registered ? " x2" : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-body text-body-md text-on-surface-variant">No tickets.</p>
              )}
            </Card>

            {history && history.wins.length ? (
              <Card title="Wins">
                <div className="space-y-2">
                  {history.wins.map((w: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-secondary-container/40 p-4">
                      <div>
                        <p className="font-label text-label-bold text-on-surface">{w.campaign}</p>
                        <p className="num font-body text-sm text-on-surface-variant">{w.serial}</p>
                      </div>
                      <Pill>{w.claim_status}</Pill>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card title="Contact">
              <p className="font-body text-body-md text-on-surface">{open.email}</p>
              <p className="num font-body text-body-md text-on-surface-variant">{open.mobile || "No mobile"}</p>
              <p className="num mt-2 font-body text-sm text-on-surface-variant">
                Joined {dateFmt(open.created_at)}
              </p>
              <a href={"mailto:" + open.email}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary-container py-3 font-label text-label-bold uppercase tracking-widest text-secondary-fixed">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                Email
              </a>
            </Card>

            <Card title="Account">
              <label className="flex items-start gap-3 rounded-xl bg-surface-container p-4">
                <input type="checkbox" className="mt-1 h-5 w-5"
                  checked={open.marketing_optin !== false}
                  onChange={(e) => setOptin(open.id, e.target.checked)} />
                <span>
                  <span className="block font-label text-label-bold text-on-surface">
                    Receives marketing email
                  </span>
                  <span className="block font-body text-sm text-on-surface-variant">
                    Unticked customers are excluded from every segment.
                  </span>
                </span>
              </label>

              <div className="mt-4">
                {open.is_disabled ? (
                  <Btn onClick={() => setPaused(open.id, false)} disabled={busy}>Resume account</Btn>
                ) : (
                  <Btn tone="danger" onClick={() => setPaused(open.id, true)} disabled={busy}>
                    Pause account
                  </Btn>
                )}
              </div>
              <p className="mt-3 font-body text-sm text-on-surface-variant">
                Pausing blocks sign-in and removes them from mailing. Tickets they already hold stay
                in the drum.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Customers</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Open a customer for their full history. Group and message them from the CRM tab.
        </p>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <input className={FIELD + " max-w-md"} placeholder="Search name, email or mobile"
        value={q} onChange={(e) => setQ(e.target.value)} />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Customer", "Contact", "Tickets", "Joined", "State", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-surface-container/50">
                  <td className="py-4 font-label text-label-bold text-on-surface">
                    {r.full_name || "No name"}
                  </td>
                  <td className="py-4">
                    <p className="font-body text-sm text-on-surface">{r.email}</p>
                    <p className="num font-body text-sm text-on-surface-variant">{r.mobile || ""}</p>
                  </td>
                  <td className="num py-4 font-label text-label-bold text-on-surface">{r.tickets}</td>
                  <td className="num py-4 font-body text-sm text-on-surface-variant">
                    {dateFmt(r.created_at)}
                  </td>
                  <td className="py-4">
                    {r.is_disabled ? (
                      <Pill tone="bg-error-container text-on-error-container">Paused</Pill>
                    ) : r.marketing_optin === false ? (
                      <Pill>No email</Pill>
                    ) : (
                      <Pill tone="bg-tertiary-fixed/40 text-on-tertiary-fixed">Active</Pill>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <button onClick={() => openCustomer(r)}
                      className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                      Open
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
