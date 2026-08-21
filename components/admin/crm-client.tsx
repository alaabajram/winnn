"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, Banner, cleanError } from "./ui";
import { dateFmt } from "@/lib/format";

const SEND_TONE: any = {
  SENT: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
  SENDING: "bg-secondary-container text-on-secondary-container",
  QUEUED: "bg-primary-fixed text-on-primary-fixed",
  DRAFT: "bg-surface-container text-on-surface-variant",
  FAILED: "bg-error-container text-on-error-container",
};

export default function CrmClient(props: {
  segments: any[]; templates: any[]; sends: any[]; districts: any[]; campaigns: any[];
}) {
  const [tab, setTab] = useState<"send" | "segments" | "templates" | "history">("send");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  // compose
  const [segmentId, setSegmentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);

  // segment editor
  const [segForm, setSegForm] = useState<any>(null);
  const [tplForm, setTplForm] = useState<any>(null);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = props.templates.find((x) => x.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }

  async function previewSegment(rules: any) {
    setBusy(true);
    const res = await supabaseBrowser().rpc("fn_segment_members", { p_rules: rules });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setPreview((res.data as any[]) || []);
  }

  async function queueSend() {
    setBusy(true);
    setMsg(null);
    const seg = props.segments.find((s) => s.id === segmentId);
    const res = await supabaseBrowser().rpc("fn_admin_queue_send", {
      p: {
        segment_id: segmentId || null,
        template_id: templateId || null,
        rules: seg ? seg.rules : {},
        subject, body,
      },
    });
    if (res.error) {
      setBusy(false);
      setMsg({ kind: "error", text: cleanError(res.error.message) });
      return;
    }
    const d: any = res.data;

    const r = await fetch("/api/crm/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send_id: d.send_id }),
    });
    const out = await r.json().catch(() => ({}));
    setBusy(false);

    setMsg(
      out.skipped
        ? { kind: "error", text: "Queued " + d.recipients + " recipients, but email is not configured. Add RESEND_API_KEY in Vercel." }
        : { kind: "ok", text: "Sent to " + (out.sent || 0) + " of " + d.recipients + "." }
    );
    setSubject(""); setBody(""); setTemplateId(""); setPreview(null);
    router.refresh();
  }

  async function saveSegment() {
    setBusy(true);
    const res = await supabaseBrowser().rpc("fn_admin_upsert_segment", { p: segForm });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setSegForm(null);
    router.refresh();
  }

  async function saveTemplate() {
    setBusy(true);
    const res = await supabaseBrowser().rpc("fn_admin_upsert_template", { p: tplForm });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setTplForm(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-on-background">Customers and email</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Group customers by district or behaviour, then message them. Segments store the rule, not
          a fixed list, so they stay current as people join.
        </p>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="flex gap-2 rounded-xl bg-surface-container p-1">
        {(["send", "segments", "templates", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={
              "flex-1 rounded-lg py-2.5 font-label text-label-bold capitalize transition-colors " +
              (tab === t ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant")
            }>
            {t}
          </button>
        ))}
      </div>

      {tab === "send" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Who">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Segment">
                  <select className={FIELD} value={segmentId}
                    onChange={(e) => { setSegmentId(e.target.value); setPreview(null); }}>
                    <option value="">Everyone who opted in</option>
                    {props.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <div className="flex items-end">
                  <Btn tone="ghost" disabled={busy}
                    onClick={() => {
                      const seg = props.segments.find((s) => s.id === segmentId);
                      previewSegment(seg ? seg.rules : {});
                    }}>
                    Preview recipients
                  </Btn>
                </div>
              </div>

              {preview ? (
                <div className="mt-5 rounded-2xl bg-surface-container p-4">
                  <p className="num mb-2 font-label text-label-bold text-on-surface">
                    {preview.length} recipient{preview.length === 1 ? "" : "s"}
                  </p>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {preview.slice(0, 60).map((r) => (
                      <p key={r.id} className="font-body text-sm text-on-surface-variant">
                        {r.full_name || "-"} / {r.email}{r.district ? " / " + r.district : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>

            <Card title="What">
              <div className="space-y-5">
                <Field label="Start from a template">
                  <select className={FIELD} value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                    <option value="">Write from scratch</option>
                    {props.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Subject">
                  <input className={FIELD} value={subject} onChange={(e) => setSubject(e.target.value)} />
                </Field>
                <Field label="Message" hint="Use {{name}} to insert the customer's name.">
                  <textarea className={FIELD} rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
                </Field>
              </div>
            </Card>
          </div>

          <div>
            <div className="sticky top-24 rounded-3xl bg-primary-container p-6 text-on-primary-container">
              <p className="font-label text-[10px] uppercase tracking-widest opacity-70">Ready to send</p>
              <p className="num mt-1 font-display text-display-sm text-secondary-fixed">
                {preview ? preview.length : "-"}
              </p>
              <p className="mt-2 font-body text-sm">
                Only customers who have not opted out and are not paused are included.
              </p>
              <button onClick={queueSend} disabled={busy || !subject || !body}
                className="mt-6 w-full rounded-xl bg-secondary-container py-4 font-label text-label-bold uppercase tracking-widest text-on-secondary-container disabled:opacity-40">
                {busy ? "Sending" : "Send now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "segments" ? (
        <>
          {segForm ? (
            <Card title={segForm.id ? "Edit segment" : "New segment"}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Name">
                  <input className={FIELD} value={segForm.name}
                    onChange={(e) => setSegForm({ ...segForm, name: e.target.value })} />
                </Field>
                <Field label="Description">
                  <input className={FIELD} value={segForm.description || ""}
                    onChange={(e) => setSegForm({ ...segForm, description: e.target.value })} />
                </Field>
              </div>

              <p className="mb-3 mt-6 font-label text-label-bold text-on-surface-variant">Districts</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {props.districts.map((d) => {
                  const list: string[] = (segForm.rules && segForm.rules.districts) || [];
                  const on = list.indexOf(d.id) > -1;
                  return (
                    <label key={d.id}
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-lg p-2.5 text-left transition-colors " +
                        (on ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface")
                      }>
                      <input type="checkbox" className="h-4 w-4" checked={on}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...list, d.id]
                            : list.filter((x) => x !== d.id);
                          setSegForm({ ...segForm, rules: { ...segForm.rules, districts: next } });
                        }} />
                      <span className="truncate font-body text-sm">{d.name}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field label="Entered this campaign">
                  <select className={FIELD} value={(segForm.rules && segForm.rules.campaign_id) || ""}
                    onChange={(e) => setSegForm({ ...segForm, rules: { ...segForm.rules, campaign_id: e.target.value } })}>
                    <option value="">Any</option>
                    {props.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Minimum paid orders">
                  <input className={FIELD + " num"} inputMode="numeric"
                    value={(segForm.rules && segForm.rules.min_orders) || ""}
                    onChange={(e) => setSegForm({ ...segForm, rules: { ...segForm.rules, min_orders: e.target.value } })} />
                </Field>
                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-5 w-5"
                      checked={!!(segForm.rules && segForm.rules.has_tickets)}
                      onChange={(e) => setSegForm({ ...segForm, rules: { ...segForm.rules, has_tickets: e.target.checked } })} />
                    <span className="font-body text-body-md">Holds tickets</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Btn onClick={saveSegment} disabled={busy || !segForm.name}>Save segment</Btn>
                <Btn tone="ghost" onClick={() => previewSegment(segForm.rules || {})}>Preview</Btn>
                <Btn tone="ghost" onClick={() => setSegForm(null)}>Cancel</Btn>
              </div>

              {preview ? (
                <p className="num mt-4 font-label text-label-bold text-on-surface">
                  Matches {preview.length} customer{preview.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </Card>
          ) : (
            <div className="flex justify-end">
              <Btn onClick={() => setSegForm({ name: "", description: "", rules: { districts: [] } })}>
                New segment
              </Btn>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {props.segments.map((s) => (
              <div key={s.id} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                <p className="font-headline text-headline-sm text-on-surface">{s.name}</p>
                <p className="mt-1 font-body text-body-md text-on-surface-variant">
                  {s.description || "No description"}
                </p>
                <button onClick={() => setSegForm({ ...s, rules: s.rules || {} })}
                  className="mt-4 rounded-lg border border-outline-variant/40 px-3 py-2 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === "templates" ? (
        <>
          {tplForm ? (
            <Card title={tplForm.id ? "Edit template" : "New template"}>
              <div className="space-y-5">
                <Field label="Name" hint="Internal only.">
                  <input className={FIELD} value={tplForm.name}
                    onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
                </Field>
                <Field label="Subject">
                  <input className={FIELD} value={tplForm.subject}
                    onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} />
                </Field>
                <Field label="Body" hint="Use {{name}} for the customer's name.">
                  <textarea className={FIELD} rows={10} value={tplForm.body}
                    onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} />
                </Field>
              </div>
              <div className="mt-5 flex gap-3">
                <Btn onClick={saveTemplate} disabled={busy || !tplForm.name || !tplForm.subject}>
                  Save template
                </Btn>
                <Btn tone="ghost" onClick={() => setTplForm(null)}>Cancel</Btn>
              </div>
            </Card>
          ) : (
            <div className="flex justify-end">
              <Btn onClick={() => setTplForm({ name: "", subject: "", body: "" })}>New template</Btn>
            </div>
          )}

          <div className="space-y-3">
            {props.templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="min-w-0">
                  <p className="font-headline text-headline-sm text-on-surface">{t.name}</p>
                  <p className="truncate font-body text-body-md text-on-surface-variant">{t.subject}</p>
                </div>
                <button onClick={() => setTplForm(t)}
                  className="shrink-0 rounded-lg border border-outline-variant/40 px-3 py-2 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === "history" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  {["Subject", "Recipients", "Sent", "Failed", "State", "When"].map((h) => (
                    <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {props.sends.map((s) => (
                  <tr key={s.id}>
                    <td className="py-4 font-label text-label-bold text-on-surface">{s.subject}</td>
                    <td className="num py-4 text-on-surface">{s.recipients}</td>
                    <td className="num py-4 text-on-tertiary-container">{s.sent_count}</td>
                    <td className="num py-4 text-error">{s.failed_count}</td>
                    <td className="py-4"><Pill tone={SEND_TONE[s.state]}>{s.state}</Pill></td>
                    <td className="num py-4 font-body text-sm text-on-surface-variant">
                      {dateFmt(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!props.sends.length ? (
            <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
              Nothing sent yet.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
