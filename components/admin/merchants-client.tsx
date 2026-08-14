"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, statusTone, Banner, cleanError } from "./ui";

const EMPTY: any = {
  id: "", name: "", slug: "", category: "", description: "", address: "",
  latitude: "", longitude: "", website: "", contact_name: "", contact_phone: "",
  contact_email: "", logo_url: "", cover_url: "", status: "ACTIVE",
};

const CATEGORIES = ["Restaurant","Cafe","Grocery","Electronics","Bakery","Pharmacy","Fashion","Fuel","Beauty","Other"];

export default function MerchantsClient(props: { initial: any[] }) {
  const [rows, setRows] = useState<any[]>(props.initial);
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [q, setQ] = useState("");
  const router = useRouter();

  function set(k: string, v: any) { setForm({ ...form, [k]: v }); }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_admin_upsert_merchant", { p: form });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Merchant saved." });
    setForm(null);
    const fresh = await supabaseBrowser().from("merchants").select("*").order("name");
    setRows((fresh.data as any[]) || []);
    router.refresh();
  }

  const filtered = rows.filter((r) =>
    !q || (r.name + " " + (r.category || "") + " " + (r.address || "")).toLowerCase().indexOf(q.toLowerCase()) > -1
  );

  if (form) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setForm(null)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display text-display-sm text-on-background">
            {form.id ? "Edit merchant" : "New merchant"}
          </h1>
        </div>

        {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

        <Card title="Business details">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Business name">
              <input className={FIELD} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Category">
              <select className={FIELD} value={form.category || ""} onChange={(e) => set("category", e.target.value)}>
                <option value="">Choose</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Description" wide hint="Shown on the campaign page next to the business name.">
              <textarea className={FIELD} rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Address" wide>
              <input className={FIELD} value={form.address || ""} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Latitude" hint="Optional, for a future map view.">
              <input className={FIELD} value={form.latitude || ""} onChange={(e) => set("latitude", e.target.value)} />
            </Field>
            <Field label="Longitude">
              <input className={FIELD} value={form.longitude || ""} onChange={(e) => set("longitude", e.target.value)} />
            </Field>
            <Field label="Website">
              <input className={FIELD} placeholder="https://" value={form.website || ""} onChange={(e) => set("website", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={FIELD} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Profile images">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Logo URL" hint="Square. Used on ticket artwork and merchant lists.">
              <input className={FIELD} placeholder="https://" value={form.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} />
            </Field>
            <Field label="Cover image URL" hint="Wide banner for the merchant profile.">
              <input className={FIELD} placeholder="https://" value={form.cover_url || ""} onChange={(e) => set("cover_url", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Contact">
          <p className="mb-5 font-body text-body-md text-on-surface-variant">
            Merchants have no login. These details are how you reach them about vouchers and invoices.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Contact name">
              <input className={FIELD} value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={FIELD} value={form.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={FIELD} value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Btn onClick={save} disabled={busy || !form.name}>{busy ? "Saving" : "Save merchant"}</Btn>
          <Btn tone="ghost" onClick={() => setForm(null)}>Cancel</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Merchants</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            Partner businesses. They have no login; everything is managed here.
          </p>
        </div>
        <Btn onClick={() => { setForm({ ...EMPTY }); setMsg(null); }}>New merchant</Btn>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <input
        className={FIELD + " max-w-md"}
        placeholder="Search by name, category or address"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-secondary-fixed">
                  <span className="font-display text-headline-sm">{m.name.slice(0, 1)}</span>
                </div>
                <div>
                  <p className="font-headline text-headline-sm text-on-surface">{m.name}</p>
                  <p className="font-body text-sm text-on-surface-variant">{m.category || "Uncategorised"}</p>
                </div>
              </div>
              <Pill tone={statusTone(m.status)}>{m.status}</Pill>
            </div>
            <p className="mb-4 line-clamp-2 font-body text-body-md text-on-surface-variant">
              {m.address || m.description || "No address on file."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setForm({ ...EMPTY, ...m }); setMsg(null); }}
                className="rounded-lg border border-outline-variant/40 px-3 py-2 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
              >
                Edit
              </button>
              <a
                href={"/admin/invoices?merchant=" + m.id}
                className="rounded-lg border border-outline-variant/40 px-3 py-2 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
              >
                Invoice
              </a>
            </div>
          </div>
        ))}
      </div>

      {!filtered.length ? (
        <p className="py-12 text-center font-body text-body-md text-on-surface-variant">No merchants match.</p>
      ) : null}
    </div>
  );
}
