"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, Banner, cleanError } from "./ui";
import ImageUpload from "./image-upload";

/** Green when inside the range search engines actually render. */
function Counter(props: { value: string; max: number; min?: number }) {
  const n = (props.value || "").length;
  const good = n > 0 && n <= props.max && n >= (props.min || 0);
  return (
    <span
      className={
        "num font-label text-[11px] font-semibold " +
        (n === 0 ? "text-on-surface-variant" : good ? "text-on-tertiary-container" : "text-error")
      }
    >
      {n}/{props.max}
    </span>
  );
}

export default function SeoClient(props: { settings: any; campaigns: any[] }) {
  const [f, setF] = useState<any>(props.settings);
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
    setMsg({ kind: "ok", text: "SEO settings saved." });
    router.refresh();
  }

  const missing = props.campaigns.filter(
    (c) => !c.meta_description || !c.ai_summary
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">SEO</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            Site-wide defaults plus per-campaign coverage. Built for search engines and for AI
            crawlers that read structured data rather than rendered pages.
          </p>
        </div>
        <Btn onClick={save} disabled={busy}>{busy ? "Saving" : "Save"}</Btn>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <Card title="Site defaults">
        <div className="grid grid-cols-1 gap-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-label text-label-bold text-on-surface-variant">Default meta title</label>
              <Counter value={f.default_meta_title || ""} max={60} />
            </div>
            <input className={FIELD} placeholder="Winnn - Buy Credits. Get Tickets. Win."
              value={f.default_meta_title || ""} onChange={(e) => set("default_meta_title", e.target.value)} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-label text-label-bold text-on-surface-variant">Default meta description</label>
              <Counter value={f.default_meta_description || ""} max={160} min={70} />
            </div>
            <textarea className={FIELD} rows={2} value={f.default_meta_description || ""}
              onChange={(e) => set("default_meta_description", e.target.value)} />
          </div>
          <div className="max-w-md">
            <ImageUpload slot="og_default" folder="site" value={f.default_og_image_url || ""}
              onChange={(url) => set("default_og_image_url", url)} />
          </div>
        </div>
      </Card>

      <Card title="AI discoverability">
        <div className="mb-5 rounded-xl bg-primary-container p-5">
          <p className="font-body text-body-md text-on-primary-container">
            Assistants answering "where can I win a car in Lebanon" read structured summaries, not
            marketing copy. What you write below is served at{" "}
            <Link href="/llms.txt" className="text-secondary-fixed underline">/llms.txt</Link> and
            embedded as JSON-LD on every page.
          </p>
        </div>
        <Field
          label="Plain-language site summary"
          hint="Explain what Winnn is, how entry works, and that draws are physical. Write it as an answer to a question, not as an advert."
        >
          <textarea
            className={FIELD}
            rows={5}
            placeholder="Winnn is a lucky draw platform in Lebanon. Customers buy Winnn credits (1 Winnn = 1 USD) which are spendable in an online store, and receive draw tickets. Tickets can also be obtained free with a physical voucher from a partner shop. Draws are conducted physically with a drum and recorded on video."
            value={f.ai_site_summary || ""}
            onChange={(e) => set("ai_site_summary", e.target.value)}
          />
        </Field>
      </Card>

      <Card title="Verification and analytics">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Google site verification" hint="The content value of the meta tag only.">
            <input className={FIELD + " num"} value={f.google_verification || ""}
              onChange={(e) => set("google_verification", e.target.value)} />
          </Field>
          <Field label="Google Analytics ID" hint="G-XXXXXXXXXX. Leave blank to disable.">
            <input className={FIELD + " num"} value={f.ga_measurement_id || ""}
              onChange={(e) => set("ga_measurement_id", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card
        title="Campaign coverage"
        actions={
          missing ? (
            <Pill tone="bg-error-container text-on-error-container">{missing} incomplete</Pill>
          ) : (
            <Pill tone="bg-tertiary-fixed/40 text-on-tertiary-fixed">All complete</Pill>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Campaign", "Title", "Description", "AI summary", "Keywords", "Index", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {props.campaigns.map((c) => {
                const dot = (ok: boolean) => (
                  <span className={"material-symbols-outlined text-[18px] " +
                    (ok ? "text-on-tertiary-container" : "text-outline-variant")}>
                    {ok ? "check_circle" : "radio_button_unchecked"}
                  </span>
                );
                return (
                  <tr key={c.id}>
                    <td className="py-4 font-label text-label-bold text-on-surface">{c.name}</td>
                    <td className="py-4">{dot(!!c.meta_title)}</td>
                    <td className="py-4">{dot(!!c.meta_description)}</td>
                    <td className="py-4">{dot(!!c.ai_summary)}</td>
                    <td className="py-4">{dot(!!(c.keywords && c.keywords.length))}</td>
                    <td className="py-4">
                      {c.noindex ? (
                        <Pill tone="bg-error-container text-on-error-container">No index</Pill>
                      ) : (
                        <Pill tone="bg-surface-container text-on-surface-variant">Indexed</Pill>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={"/admin/campaigns/" + c.id}
                        className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Generated files">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { href: "/sitemap.xml", label: "sitemap.xml", desc: "All live campaigns and results" },
            { href: "/robots.txt", label: "robots.txt", desc: "Crawler rules" },
            { href: "/llms.txt", label: "llms.txt", desc: "Plain-text summary for AI crawlers" },
          ].map((x) => (
            <a key={x.href} href={x.href} target="_blank" rel="noreferrer"
              className="rounded-xl border border-outline-variant/40 p-4 transition-colors hover:bg-surface-container">
              <p className="num font-label text-label-bold text-on-surface">{x.label}</p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">{x.desc}</p>
            </a>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Btn onClick={save} disabled={busy}>{busy ? "Saving" : "Save"}</Btn>
      </div>
    </div>
  );
}
