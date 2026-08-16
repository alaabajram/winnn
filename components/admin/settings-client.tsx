"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Banner, Section, cleanError } from "./ui";
import ImageUpload from "./image-upload";

export default function SettingsClient(props: { initial: any }) {
  const [f, setF] = useState<any>(props.initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  function set(k: string, v: any) { setF({ ...f, [k]: v }); }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_admin_update_settings", { p: f });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Settings saved." });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Website settings</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            Branding, contact details, page content and switches that affect the whole site.
          </p>
        </div>
        <Btn onClick={save} disabled={busy}>{busy ? "Saving" : "Save changes"}</Btn>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <Section title="Brand">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Site name">
            <input className={FIELD} value={f.site_name || ""} onChange={(e) => set("site_name", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <input className={FIELD} value={f.tagline || ""} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Short description" wide hint="Used as the default meta description and in the app manifest.">
            <textarea className={FIELD} rows={2} value={f.description || ""} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="sm:col-span-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ImageUpload slot="site_logo" folder="site" value={f.logo_url || ""}
              onChange={(url) => set("logo_url", url)} />
            <ImageUpload slot="favicon" folder="site" value={f.favicon_url || ""}
              onChange={(url) => set("favicon_url", url)} />
          </div>
          <Field label="Primary colour" hint="Deep brand colour used for the sidebar and hero panels.">
            <div className="flex gap-3">
              <input type="color" className="h-12 w-14 rounded-lg" value={f.brand_primary || "#0d1c32"}
                onChange={(e) => set("brand_primary", e.target.value)} />
              <input className={FIELD + " num"} value={f.brand_primary || ""} onChange={(e) => set("brand_primary", e.target.value)} />
            </div>
          </Field>
          <Field label="Accent colour" hint="Highlight colour for prices, balances and CTAs.">
            <div className="flex gap-3">
              <input type="color" className="h-12 w-14 rounded-lg" value={f.brand_accent || "#fed65b"}
                onChange={(e) => set("brand_accent", e.target.value)} />
              <input className={FIELD + " num"} value={f.brand_accent || ""} onChange={(e) => set("brand_accent", e.target.value)} />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Contact and social" open={false}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Support email">
            <input className={FIELD} value={f.support_email || ""} onChange={(e) => set("support_email", e.target.value)} />
          </Field>
          <Field label="Support phone">
            <input className={FIELD} value={f.support_phone || ""} onChange={(e) => set("support_phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp number" hint="Include the country code, e.g. +961...">
            <input className={FIELD} value={f.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          <Field label="Office address">
            <input className={FIELD} value={f.address || ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Instagram URL">
            <input className={FIELD} value={f.instagram_url || ""} onChange={(e) => set("instagram_url", e.target.value)} />
          </Field>
          <Field label="Facebook URL">
            <input className={FIELD} value={f.facebook_url || ""} onChange={(e) => set("facebook_url", e.target.value)} />
          </Field>
          <Field label="TikTok URL">
            <input className={FIELD} value={f.tiktok_url || ""} onChange={(e) => set("tiktok_url", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Page content" open={false}>
        <p className="mb-5 font-body text-body-md text-on-surface-variant">
          Plain text or Markdown. These render on the customer-facing legal and info pages.
        </p>
        <div className="space-y-5">
          <Field label="Terms and conditions">
            <textarea className={FIELD} rows={6} value={f.terms_content || ""} onChange={(e) => set("terms_content", e.target.value)} />
          </Field>
          <Field label="Privacy policy">
            <textarea className={FIELD} rows={6} value={f.privacy_content || ""} onChange={(e) => set("privacy_content", e.target.value)} />
          </Field>
          <Field label="How it works">
            <textarea className={FIELD} rows={4} value={f.how_it_works_content || ""} onChange={(e) => set("how_it_works_content", e.target.value)} />
          </Field>
          <Field label="About">
            <textarea className={FIELD} rows={4} value={f.about_content || ""} onChange={(e) => set("about_content", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Switches" open={false}>
        <div className="space-y-4">
          {[
            { k: "store_enabled", label: "Store enabled", hint: "Turn off to hide the store tab entirely." },
            { k: "signup_enabled", label: "New sign-ups allowed", hint: "Turn off to close registration." },
            { k: "maintenance_mode", label: "Maintenance mode", hint: "Shows a holding message instead of the site." },
          ].map((s) => (
            <label key={s.k} className="flex items-start gap-3 rounded-xl bg-surface-container p-4">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={!!f[s.k]}
                onChange={(e) => set(s.k, e.target.checked)} />
              <span>
                <span className="block font-label text-label-bold text-on-surface">{s.label}</span>
                <span className="block font-body text-sm text-on-surface-variant">{s.hint}</span>
              </span>
            </label>
          ))}
          <Field label="Maintenance message">
            <input className={FIELD} value={f.maintenance_message || ""} onChange={(e) => set("maintenance_message", e.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="flex gap-3">
        <Btn onClick={save} disabled={busy}>{busy ? "Saving" : "Save changes"}</Btn>
      </div>
    </div>
  );
}
