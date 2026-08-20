"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, Banner, cleanError } from "./ui";
import ImageUpload from "./image-upload";

const EMPTY: any = {
  id: "", title: "", subtitle: "", image_url: "", link_url: "", cta_label: "",
  district_id: "", starts_at: "", ends_at: "", sort_order: "0", is_active: true,
};

function dtLocal(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
         "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export default function BannersClient(props: { initial: any[]; districts: any[] }) {
  const [rows, setRows] = useState<any[]>(props.initial);
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  function set(k: string, v: any) { setForm({ ...form, [k]: v }); }

  async function reload() {
    const { data } = await supabaseBrowser().from("banners").select("*").order("sort_order");
    setRows((data as any[]) || []);
    router.refresh();
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const payload = {
      ...form,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    const res = await supabaseBrowser().rpc("fn_admin_upsert_banner", { p: payload });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Banner saved." });
    setForm(null);
    reload();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this banner?")) return;
    const res = await supabaseBrowser().rpc("fn_admin_delete_banner", { p_id: id });
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    reload();
  }

  if (form) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setForm(null)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display text-display-sm text-on-background">
            {form.id ? "Edit banner" : "New banner"}
          </h1>
        </div>

        {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

        <Card title="Image">
          <div className="max-w-2xl">
            <ImageUpload slot="banner_home" folder="banners"
              value={form.image_url || ""} onChange={(url) => set("image_url", url)} />
          </div>
        </Card>

        <Card title="Text overlay" >
          <p className="mb-5 font-body text-body-md text-on-surface-variant">
            Leave all three blank to show the image on its own, which is usually better when the
            artwork already carries the message.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Title">
              <input className={FIELD} value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Button label">
              <input className={FIELD} placeholder="Shop now" value={form.cta_label || ""}
                onChange={(e) => set("cta_label", e.target.value)} />
            </Field>
            <Field label="Subtitle" wide>
              <input className={FIELD} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Behaviour">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Links to" wide hint="Where tapping the banner goes, e.g. /campaigns/summer-mega-draw">
              <input className={FIELD} placeholder="/campaigns/..." value={form.link_url || ""}
                onChange={(e) => set("link_url", e.target.value)} />
            </Field>
            <Field label="District" hint="Leave blank to show everywhere.">
              <select className={FIELD} value={form.district_id || ""}
                onChange={(e) => set("district_id", e.target.value)}>
                <option value="">All Lebanon</option>
                {props.districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.governorate} / {d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sort order" hint="Lower shows first.">
              <input className={FIELD + " num"} value={form.sort_order}
                onChange={(e) => set("sort_order", e.target.value)} />
            </Field>
            <Field label="Starts" hint="Optional.">
              <input className={FIELD} type="datetime-local" value={form.starts_at || ""}
                onChange={(e) => set("starts_at", e.target.value)} />
            </Field>
            <Field label="Ends" hint="Optional. Hides itself after this.">
              <input className={FIELD} type="datetime-local" value={form.ends_at || ""}
                onChange={(e) => set("ends_at", e.target.value)} />
            </Field>
          </div>
          <label className="mt-5 flex items-center gap-3">
            <input type="checkbox" className="h-5 w-5" checked={!!form.is_active}
              onChange={(e) => set("is_active", e.target.checked)} />
            <span className="font-body text-body-md text-on-surface">Active</span>
          </label>
        </Card>

        <div className="flex gap-3">
          <Btn onClick={save} disabled={busy || !form.image_url}>
            {busy ? "Saving" : "Save banner"}
          </Btn>
          <Btn tone="ghost" onClick={() => setForm(null)}>Cancel</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Home banners</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            The carousel at the top of Deals. Rotates every 6 seconds, swipeable on mobile.
          </p>
        </div>
        <Btn onClick={() => { setForm({ ...EMPTY }); setMsg(null); }}>New banner</Btn>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((b) => (
          <div key={b.id} className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
            <div className="aspect-[21/8] w-full bg-surface-container">
              <img src={b.image_url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-label text-label-bold text-on-surface">
                  {b.title || "Untitled"}
                </p>
                <p className="num truncate font-body text-sm text-on-surface-variant">
                  Order {b.sort_order}{b.link_url ? " / " + b.link_url : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Pill tone={b.is_active
                  ? "bg-tertiary-fixed/40 text-on-tertiary-fixed"
                  : "bg-surface-container text-on-surface-variant"}>
                  {b.is_active ? "Live" : "Off"}
                </Pill>
                <button onClick={() => setForm({
                  ...EMPTY, ...b,
                  sort_order: String(b.sort_order),
                  starts_at: dtLocal(b.starts_at), ends_at: dtLocal(b.ends_at),
                })}
                  className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                  Edit
                </button>
                <button onClick={() => remove(b.id)}
                  className="rounded-lg px-2 py-1.5 text-error hover:bg-error-container">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!rows.length ? (
        <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
          No banners yet. The carousel stays hidden until you add one.
        </p>
      ) : null}
    </div>
  );
}
