"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Banner, Section, cleanError } from "./ui";
import ImageUpload from "./image-upload";
import { VoucherFront, VoucherBack } from "./voucher-card";
import { DEFAULT_DESIGN, mergeDesign, VOUCHER } from "@/lib/voucher";
import { dateFmt } from "@/lib/format";

const SAMPLE_SERIAL = "SUM26-4YQ8-MNEA";
const SAMPLE_ENTRY = "5673482372911805";

export default function VoucherDesigner(props: {
  campaigns: any[]; settings: any; initialCampaign: string;
}) {
  const [campaignId, setCampaignId] = useState(props.initialCampaign);
  const [side, setSide] = useState<"front" | "back">("front");
  const [d, setD] = useState<any>(DEFAULT_DESIGN);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  const campaign = props.campaigns.find((c) => c.id === campaignId);
  const merchant = campaign && campaign.campaign_merchants && campaign.campaign_merchants.length
    ? campaign.campaign_merchants[0].merchants
    : null;
  const prize = campaign && campaign.campaign_prizes && campaign.campaign_prizes.length
    ? campaign.campaign_prizes.slice().sort((a: any, b: any) => a.position - b.position)[0]
    : null;

  // Load the right layers: site default under campaign override.
  useEffect(() => {
    setD(mergeDesign(props.settings.voucher_design, campaign ? campaign.voucher_design : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    const site = typeof window !== "undefined" ? window.location.origin : "";
    fetch("/api/qr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [site + "/?entry=" + SAMPLE_ENTRY] }),
    })
      .then((r) => r.json())
      .then((j) => setQr(j.svg[site + "/?entry=" + SAMPLE_ENTRY] || null))
      .catch(() => {});
  }, []);

  function set(k: string, v: any) { setD({ ...d, [k]: v }); }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await supabaseBrowser().rpc("fn_admin_set_voucher_design", {
      p_campaign_id: campaignId || null, p_design: d,
    });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({
      kind: "ok",
      text: campaignId ? "Saved for this campaign." : "Saved as the default for all campaigns.",
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Voucher design</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            {VOUCHER.widthMm} x {VOUCHER.heightMm} mm, {VOUCHER.perPage} to an A4 sheet. The preview
            is at real size, so what you see here is what prints.
          </p>
        </div>
        <div className="flex gap-3">
          <Btn tone="ghost" onClick={() => setD(DEFAULT_DESIGN)}>Reset</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? "Saving" : "Save design"}</Btn>
        </div>
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <Card>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Design for"
            hint="Choose a campaign to override the default just for it.">
            <select className={FIELD} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Default for all campaigns</option>
              {props.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <div className="flex w-full rounded-xl bg-surface-container p-1">
              {(["front", "back"] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  className={
                    "flex-1 rounded-lg py-2.5 font-label text-label-bold capitalize transition-colors " +
                    (side === s ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant")
                  }>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Live preview at real size */}
      <div className="overflow-x-auto rounded-3xl bg-surface-container p-6">
        <p className="mb-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          Actual size preview
        </p>
        <div className="inline-block shadow-2xl">
          {side === "front" ? (
            <VoucherFront
              d={d}
              campaign={campaign ? campaign.name : "Summer Mega Draw"}
              prize={prize ? prize.title : "Grand Prize - $100,000 cash"}
              prizeValueCents={prize ? prize.value_cents : null}
              merchant={merchant ? merchant.name : "Abou Hassan Restaurant"}
              merchantLogo={merchant ? merchant.logo_url : null}
              logo={props.settings.logo_url}
              serial={SAMPLE_SERIAL}
              entryNumber={SAMPLE_ENTRY}
              drawDate={campaign ? dateFmt(campaign.draw_date) : "1 Sept 2026"}
              qrSvg={qr}
            />
          ) : (
            <VoucherBack d={d} site={props.settings.site_name || "winnn.app"} />
          )}
        </div>
      </div>

      <Section title="Colours">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          {[
            { k: "bg", label: "Background" },
            { k: "ink", label: "Text" },
            { k: "accent", label: "Highlight" },
            { k: "accentDeep", label: "Highlight, deep" },
            { k: "stubBg", label: "Stub background" },
          ].map((c) => (
            <Field key={c.k} label={c.label}>
              <div className="flex gap-2">
                <input type="color" className="h-12 w-14 cursor-pointer rounded-lg border border-outline-variant/40"
                  value={d[c.k] || "#000000"} onChange={(e) => set(c.k, e.target.value)} />
                <input className={FIELD + " num"} value={d[c.k] || ""}
                  onChange={(e) => set(c.k, e.target.value)} />
              </div>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Front text">
        <p className="mb-5 font-body text-body-md text-on-surface-variant">
          The campaign name, prize, ticket number, merchant name and logo are pulled automatically.
          These are the fixed labels around them.
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Tagline">
            <input className={FIELD} value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Prize pill" hint="Small label above the plaque.">
            <input className={FIELD} value={d.prizeLabel} onChange={(e) => set("prizeLabel", e.target.value)} />
          </Field>
          <Field label="Number label">
            <input className={FIELD} value={d.entryLabel} onChange={(e) => set("entryLabel", e.target.value)} />
          </Field>
          <Field label="Plaque heading" hint="Above the amount, inside the plaque.">
            <input className={FIELD} value={d.prizePrefix} onChange={(e) => set("prizePrefix", e.target.value)} />
          </Field>
          <Field label="Plaque heading, second line" hint="Optional. Usually left blank.">
            <input className={FIELD} value={d.prizeSuffix} onChange={(e) => set("prizeSuffix", e.target.value)} />
          </Field>
          <Field label="QR label">
            <input className={FIELD} value={d.qrLabel} onChange={(e) => set("qrLabel", e.target.value)} />
          </Field>
          <Field label="Call to action, before">
            <input className={FIELD} value={d.ctaBefore} onChange={(e) => set("ctaBefore", e.target.value)} />
          </Field>
          <Field label="Emphasised word">
            <input className={FIELD} value={d.ctaEmphasis} onChange={(e) => set("ctaEmphasis", e.target.value)} />
          </Field>
          <Field label="Call to action, after">
            <input className={FIELD} value={d.ctaAfter} onChange={(e) => set("ctaAfter", e.target.value)} />
          </Field>
          <Field label="Stub title">
            <input className={FIELD} value={d.stubTitle} onChange={(e) => set("stubTitle", e.target.value)} />
          </Field>
          <Field label="Partner label">
            <input className={FIELD} value={d.partnerLabel} onChange={(e) => set("partnerLabel", e.target.value)} />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          {[
            { k: "showQr", label: "QR code" },
            { k: "showLogo", label: "Winnn logo" },
            { k: "showWriteIn", label: "Name and mobile lines on the stub" },
            { k: "showPartner", label: "Merchant panel" },
            { k: "showConfetti", label: "Confetti" },
          ].map((t) => (
            <label key={t.k} className="flex items-center gap-2 rounded-xl bg-surface-container px-4 py-3">
              <input type="checkbox" className="h-5 w-5" checked={!!d[t.k]}
                onChange={(e) => set(t.k, e.target.checked)} />
              <span className="font-body text-body-md text-on-surface">{t.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 font-body text-sm text-on-surface-variant">
          The write-in lines matter: a shop can note the buyer's name and number, so an unclaimed
          winning ticket can still be traced to a person.
        </p>
      </Section>

      <Section title="Back text" open={false}>
        <div className="space-y-5">
          <Field label="Title">
            <input className={FIELD} value={d.backTitle} onChange={(e) => set("backTitle", e.target.value)} />
          </Field>
          <Field label="Body" hint="Line breaks are preserved.">
            <textarea className={FIELD} rows={8} value={d.backBody}
              onChange={(e) => set("backBody", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Background artwork" open={false}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ImageUpload slot="campaign_banner" folder="vouchers"
            value={d.frontImage || ""} onChange={(url) => set("frontImage", url)} />
          <ImageUpload slot="campaign_banner" folder="vouchers"
            value={d.backImage || ""} onChange={(url) => set("backImage", url)} />
        </div>
        <p className="mt-3 font-body text-sm text-on-surface-variant">
          Artwork sits behind the text at low opacity so the number stays readable. Keep it dark and
          low contrast, or leave it blank and use a flat colour.
        </p>
      </Section>

      <div className="flex gap-3">
        <Btn onClick={save} disabled={busy}>{busy ? "Saving" : "Save design"}</Btn>
      </div>
    </div>
  );
}
