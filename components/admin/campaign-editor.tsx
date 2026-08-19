"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, statusTone, Banner, Section, cleanError } from "./ui";
import { toCents } from "@/lib/money";
import ImageUpload from "./image-upload";
import { winnn } from "@/lib/format";

function dtLocal(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
         "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export default function CampaignEditor(props: {
  campaign: any; prizes: any[]; selected: string[]; merchants: any[];
  districts: any[]; products: any[]; tethered: any[];
}) {
  const c = props.campaign;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [id, setId] = useState<string>(c ? c.id : "");
  const [live, setLive] = useState<{ slug: string } | null>(null);

  const [f, setF] = useState<any>({
    name: c ? c.name : "",
    slug: c ? c.slug : "",
    description: c ? c.description || "" : "",
    type: c ? c.type : "HYBRID",
    ticket_price: c ? (Number(c.ticket_price_cents) / 100).toString() : "10",
    owner_merchant_id: c ? c.owner_merchant_id || "" : "",
    hero_image_url: c ? c.hero_image_url || "" : "",
    thumbnail_url: c ? c.thumbnail_url || "" : "",
    banner_url: c ? c.banner_url || "" : "",
    sponsor_logo_url: c ? c.sponsor_logo_url || "" : "",
    brand_color: c ? c.brand_color || "" : "",
    max_tickets_total: c ? (c.max_tickets_total || "") : "",
    max_online_per_customer: c ? (c.max_online_per_customer || "") : "",
    max_offline_per_customer: c ? (c.max_offline_per_customer || "") : "",
    starts_at: dtLocal(c ? c.starts_at : null),
    sales_close_at: dtLocal(c ? c.sales_close_at : null),
    draw_date: dtLocal(c ? c.draw_date : null),
    terms: c ? c.terms || "" : "",
    meta_title: c ? c.meta_title || "" : "",
    meta_description: c ? c.meta_description || "" : "",
    og_image_url: c ? c.og_image_url || "" : "",
    keywords: c && c.keywords ? c.keywords.join(", ") : "",
    ai_summary: c ? c.ai_summary || "" : "",
    noindex: c ? !!c.noindex : false,
  });

  const [prizes, setPrizes] = useState<any[]>(
    props.prizes.length
      ? props.prizes.map((p) => ({
          position: p.position, title: p.title,
          value: p.value_cents ? (Number(p.value_cents) / 100).toString() : "",
        }))
      : [{ position: 1, title: "", value: "" }]
  );
  const [faq, setFaq] = useState<any[]>(
    c && c.faq && (c.faq as any[]).length ? (c.faq as any[]) : [{ q: "", a: "" }]
  );
  const [selected, setSelected] = useState<string[]>(props.selected);
  const [nationwide, setNationwide] = useState<boolean>(c ? c.is_nationwide !== false : true);
  const [districtId, setDistrictId] = useState<string>(c && c.district_id ? c.district_id : "");
  const [tether, setTether] = useState<any[]>(
    props.tethered && props.tethered.length
      ? props.tethered.map((t) => ({
          product_id: t.product_id,
          tickets_per_unit: String(t.tickets_per_unit),
          is_primary: !!t.is_primary,
        }))
      : []
  );

  function set(k: string, v: any) { setF({ ...f, [k]: v }); }

  async function save(alsoStatus?: string) {
    setBusy(true);
    setMsg(null);
    const payload: any = {
      id: id || null,
      name: f.name,
      slug: f.slug || null,
      description: f.description,
      type: f.type,
      ticket_price_cents: String(toCents(f.ticket_price)),
      owner_merchant_id: f.owner_merchant_id || null,
      hero_image_url: f.hero_image_url,
      thumbnail_url: f.thumbnail_url,
      banner_url: f.banner_url,
      sponsor_logo_url: f.sponsor_logo_url,
      brand_color: f.brand_color,
      max_tickets_total: f.max_tickets_total ? String(f.max_tickets_total) : null,
      max_online_per_customer: f.max_online_per_customer ? String(f.max_online_per_customer) : null,
      max_offline_per_customer: f.max_offline_per_customer ? String(f.max_offline_per_customer) : null,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      sales_close_at: f.sales_close_at ? new Date(f.sales_close_at).toISOString() : null,
      ends_at: f.sales_close_at ? new Date(f.sales_close_at).toISOString() : null,
      draw_date: f.draw_date ? new Date(f.draw_date).toISOString() : null,
      terms: f.terms,
      meta_title: f.meta_title,
      meta_description: f.meta_description,
      og_image_url: f.og_image_url,
      keywords: f.keywords.split(",").map((x: string) => x.trim()).filter(Boolean),
      ai_summary: f.ai_summary,
      faq: faq.filter((x) => x.q && x.a),
      noindex: f.noindex,
    };

    const sb = supabaseBrowser();
    const res = await sb.rpc("fn_admin_upsert_campaign", { p: payload });
    if (res.error) { setBusy(false); setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    const newId = (res.data as any).id;
    setId(newId);

    await sb.rpc("fn_admin_set_prizes", {
      p_campaign_id: newId,
      p_prizes: prizes
        .filter((p) => p.title)
        .map((p, i) => ({ position: i + 1, title: p.title, value_cents: String(toCents(p.value)) })),
    });
    await sb.rpc("fn_admin_set_campaign_merchants", {
      p_campaign_id: newId, p_merchant_ids: selected,
    });
    await sb.rpc("fn_admin_set_campaign_area", {
      p_campaign_id: newId,
      p_district_id: districtId || null,
      p_nationwide: nationwide,
    });
    await sb.rpc("fn_admin_set_campaign_products", {
      p_campaign_id: newId,
      p_rows: tether.filter((t) => t.product_id),
    });

    if (alsoStatus) {
      const st = await sb.rpc("fn_admin_set_campaign_status", { p_id: newId, p_status: alsoStatus });
      if (st.error) {
        setBusy(false);
        setMsg({ kind: "error", text: cleanError(st.error.message) });
        return;
      }
    }

    setBusy(false);
    if (alsoStatus === "LIVE") {
      setLive({ slug: (res.data as any).slug });
      setMsg(null);
    } else {
      setLive(null);
      setMsg({
        kind: "ok",
        text: alsoStatus ? "Saved and set to " + alsoStatus + "." : "Campaign saved as a draft.",
      });
    }
    if (!c) router.replace("/admin/campaigns/" + newId);
    router.refresh();
  }

  const seoPreviewTitle = f.meta_title || f.name || "Campaign";
  const seoPreviewDesc = f.meta_description || f.description || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/campaigns")} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display text-display-sm text-on-background">
            {c ? c.name : "New campaign"}
          </h1>
          {c ? <Pill tone={statusTone(c.status)}>{c.status}</Pill> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn tone="ghost" onClick={() => save()} disabled={busy || !f.name}>
            {busy ? "Saving" : "Save draft"}
          </Btn>
          <Btn onClick={() => save("LIVE")} disabled={busy || !f.name}>Save and go live</Btn>
        </div>
      </div>

      {live ? (
        <div className="relative overflow-hidden rounded-3xl bg-primary-container p-6 text-on-primary-container shadow-xl sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-[36px] text-secondary-fixed">
                rocket_launch
              </span>
              <div>
                <p className="font-headline text-headline-md text-on-primary">
                  This campaign is now live
                </p>
                <p className="mt-1 font-body text-body-md text-on-primary-container">
                  Customers can see it on the home page and start entering. Entries close on the date
                  you set; generate voucher batches before then if it accepts in-store entries.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <a
                href={"/campaigns/" + live.slug}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-secondary-container px-5 py-3 font-label text-label-bold uppercase tracking-widest text-on-secondary-container"
              >
                View page
              </a>
              <a
                href="/admin/vouchers"
                className="rounded-xl bg-surface/10 px-5 py-3 font-label text-label-bold uppercase tracking-widest text-on-primary backdrop-blur-sm"
              >
                Vouchers
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <Section title="Basics">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Campaign name" wide>
            <input className={FIELD} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Description" wide hint="Shown under the headline on the campaign page.">
            <textarea className={FIELD} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Entry type">
            <select className={FIELD} value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option value="HYBRID">Hybrid - online and in store</option>
              <option value="ONLINE">Online only</option>
              <option value="OFFLINE">In store only</option>
            </select>
          </Field>
          <Field label="Price per ticket (Winnn)">
            <input className={FIELD + " num"} inputMode="decimal" value={f.ticket_price}
              onChange={(e) => set("ticket_price", e.target.value)} />
          </Field>
          <Field label="Owner merchant" hint="The headline sponsor for this campaign.">
            <select className={FIELD} value={f.owner_merchant_id} onChange={(e) => set("owner_merchant_id", e.target.value)}>
              <option value="">None</option>
              {props.merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Brand colour">
            <input className={FIELD + " num"} placeholder="#0d1c32" value={f.brand_color}
              onChange={(e) => set("brand_color", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Prizes">
        <div className="space-y-4">
          {prizes.map((p, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-3">
              <div className="col-span-1 pb-3 text-center font-headline text-headline-sm text-on-surface-variant">
                {i + 1}
              </div>
              <div className="col-span-11 sm:col-span-7">
                <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">Title</label>
                <input className={FIELD} placeholder="Grand Prize - $100,000 cash" value={p.title}
                  onChange={(e) => {
                    const n = prizes.slice(); n[i] = { ...n[i], title: e.target.value }; setPrizes(n);
                  }} />
              </div>
              <div className="col-span-9 sm:col-span-3">
                <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">Value (Winnn)</label>
                <input className={FIELD + " num"} inputMode="decimal" value={p.value}
                  onChange={(e) => {
                    const n = prizes.slice(); n[i] = { ...n[i], value: e.target.value }; setPrizes(n);
                  }} />
              </div>
              <div className="col-span-3 sm:col-span-1 flex justify-end pb-2">
                {prizes.length > 1 ? (
                  <button onClick={() => setPrizes(prizes.filter((_, x) => x !== i))} className="text-error">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Btn tone="ghost" onClick={() => setPrizes([...prizes, { position: prizes.length + 1, title: "", value: "" }])}>
            Add prize
          </Btn>
        </div>
      </Section>

      <Section title="Dates and limits">
        <div className="mb-5 rounded-xl bg-secondary-container/30 p-4">
          <p className="font-body text-body-md text-on-surface">
            Entries close at <span className="font-semibold">sales close</span>. Online serials are
            printed after that and added to the physical drum, so the draw date must be later.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Starts">
            <input className={FIELD} type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          </Field>
          <Field label="Entries close">
            <input className={FIELD} type="datetime-local" value={f.sales_close_at} onChange={(e) => set("sales_close_at", e.target.value)} />
          </Field>
          <Field label="Draw date">
            <input className={FIELD} type="datetime-local" value={f.draw_date} onChange={(e) => set("draw_date", e.target.value)} />
          </Field>
          <Field label="Max tickets total" hint="Blank for unlimited.">
            <input className={FIELD + " num"} value={f.max_tickets_total} onChange={(e) => set("max_tickets_total", e.target.value)} />
          </Field>
          <Field label="Max online per customer">
            <input className={FIELD + " num"} value={f.max_online_per_customer} onChange={(e) => set("max_online_per_customer", e.target.value)} />
          </Field>
          <Field label="Max in-store per customer">
            <input className={FIELD + " num"} value={f.max_offline_per_customer} onChange={(e) => set("max_offline_per_customer", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Products that enter this draw">
        <div className="mb-5 rounded-xl bg-primary-container p-4">
          <p className="font-body text-body-md text-on-primary-container">
            Customers buy a product, and the tickets come with it. A campaign with no product here
            can only be entered with a physical voucher.
          </p>
        </div>

        <div className="space-y-3">
          {tether.map((t, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-3">
              <div className="col-span-12 sm:col-span-7">
                <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Product
                </label>
                <select className={FIELD} value={t.product_id}
                  onChange={(e) => {
                    const n = tether.slice(); n[i] = { ...n[i], product_id: e.target.value }; setTether(n);
                  }}>
                  <option value="">Choose a product</option>
                  {props.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({(Number(p.price_cents) / 100).toFixed(2)} USD)
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="mb-2 block font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Tickets per unit
                </label>
                <input className={FIELD + " num"} inputMode="numeric" value={t.tickets_per_unit}
                  onChange={(e) => {
                    const n = tether.slice(); n[i] = { ...n[i], tickets_per_unit: e.target.value }; setTether(n);
                  }} />
              </div>
              <div className="col-span-4 sm:col-span-1 flex items-center pb-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={!!t.is_primary}
                    onChange={(e) => {
                      const n = tether.map((x, y) => ({ ...x, is_primary: y === i ? e.target.checked : false }));
                      setTether(n);
                    }} />
                  <span className="font-label text-[11px] uppercase text-on-surface-variant">Main</span>
                </label>
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end pb-2">
                <button onClick={() => setTether(tether.filter((_, y) => y !== i))} className="text-error">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Btn tone="ghost"
            onClick={() => setTether([...tether, { product_id: "", tickets_per_unit: "1", is_primary: tether.length === 0 }])}>
            Add product
          </Btn>
        </div>
        <p className="mt-3 font-body text-sm text-on-surface-variant">
          The product marked Main is the one shown on the deal card.
        </p>
      </Section>

      <Section title="Where it runs">
        <label className="mb-4 flex items-start gap-3 rounded-xl bg-surface-container p-4">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={nationwide}
            onChange={(e) => setNationwide(e.target.checked)} />
          <span>
            <span className="block font-label text-label-bold text-on-surface">All Lebanon</span>
            <span className="block font-body text-sm text-on-surface-variant">
              Shows to everyone regardless of the district they choose.
            </span>
          </span>
        </label>

        {!nationwide ? (
          <Field label="District" hint="Only shown to customers in this district.">
            <select className={FIELD} value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">Choose a district</option>
              {props.districts.map((d) => (
                <option key={d.id} value={d.id}>{d.governorate} / {d.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
      </Section>

      <Section title="Participating businesses" open={false}>
        <p className="mb-5 font-body text-body-md text-on-surface-variant">
          Each business decides its own issuance rule. Voucher batches are generated per merchant in
          the Vouchers tab.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {props.merchants.map((m) => (
            <label key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-container p-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={selected.indexOf(m.id) > -1}
                onChange={(e) =>
                  setSelected(e.target.checked ? [...selected, m.id] : selected.filter((x) => x !== m.id))
                }
              />
              <span className="font-body text-body-md text-on-surface">{m.name}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Media" open={false}>
        <p className="mb-6 font-body text-body-md text-on-surface-variant">
          Each slot shows its recommended size. Anything off-ratio is accepted but will be cropped.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ImageUpload slot="campaign_hero" folder="campaigns"
            value={f.hero_image_url} onChange={(url) => set("hero_image_url", url)} />
          <ImageUpload slot="campaign_thumb" folder="campaigns"
            value={f.thumbnail_url} onChange={(url) => set("thumbnail_url", url)} />
          <ImageUpload slot="campaign_banner" folder="campaigns"
            value={f.banner_url} onChange={(url) => set("banner_url", url)} />
          <ImageUpload slot="sponsor_logo" folder="campaigns"
            value={f.sponsor_logo_url} onChange={(url) => set("sponsor_logo_url", url)} />
        </div>
      </Section>

      <Section title="Terms" open={false}>
        <textarea className={FIELD} rows={6} value={f.terms} onChange={(e) => set("terms", e.target.value)}
          placeholder="Eligibility, prize claim window, what happens if a winner cannot be reached." />
      </Section>

      <Section title="SEO and AI discoverability" open={false}>
        <div className="mb-6 rounded-2xl border border-outline-variant/40 p-5">
          <p className="mb-2 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Search preview
          </p>
          <p className="font-body text-[18px] text-[#1a0dab]">{seoPreviewTitle}</p>
          <p className="num font-body text-sm text-on-tertiary-container">
            winnn.app/campaigns/{f.slug || "your-campaign"}
          </p>
          <p className="mt-1 line-clamp-2 font-body text-sm text-on-surface-variant">
            {seoPreviewDesc || "Add a meta description to control what appears here."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <Field label="Meta title" hint="Under 60 characters. Falls back to the campaign name.">
            <input className={FIELD} value={f.meta_title} onChange={(e) => set("meta_title", e.target.value)} />
          </Field>
          <Field label="Meta description" hint="Between 70 and 160 characters.">
            <textarea className={FIELD} rows={2} value={f.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
          </Field>
          <Field label="Keywords" hint="Comma separated. Used for internal grouping, not for ranking.">
            <input className={FIELD} placeholder="lucky draw lebanon, win a car beirut" value={f.keywords}
              onChange={(e) => set("keywords", e.target.value)} />
          </Field>
          <div className="max-w-md">
            <ImageUpload slot="campaign_og" folder="campaigns"
              value={f.og_image_url} onChange={(url) => set("og_image_url", url)} />
          </div>
          <Field
            label="AI summary"
            hint="A factual paragraph an assistant can quote: the prize, how to enter, the closing date, and that the draw is physical."
          >
            <textarea className={FIELD} rows={4} value={f.ai_summary} onChange={(e) => set("ai_summary", e.target.value)} />
          </Field>
        </div>

        <div className="mt-6">
          <p className="mb-3 font-label text-label-bold text-on-surface-variant">
            FAQ (rendered as structured data)
          </p>
          <div className="space-y-3">
            {faq.map((x, i) => (
              <div key={i} className="rounded-xl bg-surface-container p-4">
                <input className={FIELD + " mb-2"} placeholder="How do I enter?" value={x.q}
                  onChange={(e) => { const n = faq.slice(); n[i] = { ...n[i], q: e.target.value }; setFaq(n); }} />
                <textarea className={FIELD} rows={2} placeholder="Buy tickets in the app, or get a voucher in store."
                  value={x.a}
                  onChange={(e) => { const n = faq.slice(); n[i] = { ...n[i], a: e.target.value }; setFaq(n); }} />
                {faq.length > 1 ? (
                  <button onClick={() => setFaq(faq.filter((_, y) => y !== i))}
                    className="mt-2 font-label text-[12px] font-semibold text-error">
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Btn tone="ghost" onClick={() => setFaq([...faq, { q: "", a: "" }])}>Add question</Btn>
          </div>
        </div>

        <label className="mt-6 flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={f.noindex}
            onChange={(e) => set("noindex", e.target.checked)} />
          <span className="font-body text-body-md text-on-surface">
            Hide from search engines (noindex)
          </span>
        </label>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Btn tone="ghost" onClick={() => save()} disabled={busy || !f.name}>Save draft</Btn>
        <Btn onClick={() => save("LIVE")} disabled={busy || !f.name}>Save and go live</Btn>
        {id ? (
          <Btn tone="ghost" onClick={() => save("PAUSED")} disabled={busy}>Pause</Btn>
        ) : null}
      </div>
    </div>
  );
}
