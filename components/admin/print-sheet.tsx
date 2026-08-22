"use client";
import { useEffect, useState } from "react";
import { VoucherFront, VoucherBack } from "./voucher-card";
import { mergeDesign, VOUCHER } from "@/lib/voucher";
import { dateFmt } from "@/lib/format";
import { Btn } from "./ui";

export default function PrintSheet(props: { data: any }) {
  const d = props.data;
  const design = mergeDesign(
    d.settings ? d.settings.design : null,
    d.campaign ? d.campaign.design : null
  );
  const tickets: any[] = d.tickets || [];

  const [qr, setQr] = useState<Record<string, string>>({});
  const [showBacks, setShowBacks] = useState(false);
  const [loading, setLoading] = useState(design.showQr);

  useEffect(() => {
    if (!design.showQr || !tickets.length) { setLoading(false); return; }
    const site = window.location.origin;
    const items = tickets.map((t) => site + "/?entry=" + t.entry_number);
    // Batched so a 5,000 voucher run does not build one enormous request.
    const chunks: string[][] = [];
    for (let i = 0; i < items.length; i += 200) chunks.push(items.slice(i, i + 200));

    Promise.all(
      chunks.map((c) =>
        fetch("/api/qr", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: c }),
        }).then((r) => r.json())
      )
    )
      .then((parts) => {
        const all: Record<string, string> = {};
        parts.forEach((p) => Object.assign(all, p.svg || {}));
        setQr(all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const site = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <div>
          <h1 className="font-headline text-headline-md text-on-surface">
            {d.campaign.name}
          </h1>
          <p className="num mt-1 font-body text-body-md text-on-surface-variant">
            {tickets.length} vouchers / {d.merchant ? d.merchant.name : "No merchant"} /{" "}
            {VOUCHER.perPage} per A4 sheet
          </p>
          {loading ? (
            <p className="mt-1 font-body text-sm text-secondary">Building QR codes...</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-xl bg-surface-container px-4 py-3">
            <input type="checkbox" className="h-5 w-5" checked={showBacks}
              onChange={(e) => setShowBacks(e.target.checked)} />
            <span className="font-body text-body-md">Include backs</span>
          </label>
          <Btn onClick={() => window.print()} disabled={loading}>Print</Btn>
        </div>
      </div>

      <div className="no-print mb-6 rounded-2xl bg-secondary-container/40 p-5">
        <p className="font-body text-body-md text-on-surface">
          Print at 100% scale with no page scaling, on A4. Cut along the horizontal lines, then
          score the vertical dashed line so the stub tears cleanly. If you are printing backs, feed
          the sheets through a second time and tick Include backs.
        </p>
      </div>

      <div className="sheet">
        {tickets.map((t, i) => (
          <div key={t.serial} className="voucher-slot">
            <VoucherFront
              d={design}
              campaign={d.campaign.name}
              prize={d.prize ? d.prize.title : null}
              prizeImage={d.prize ? d.prize.image_url : null}
              merchant={d.merchant ? d.merchant.name : null}
              logo={d.settings ? d.settings.logo_url : null}
              serial={t.serial}
              entryNumber={t.entry_number}
              drawDate={dateFmt(d.campaign.draw_date)}
              qrSvg={qr[site + "/?entry=" + t.entry_number] || null}
            />
          </div>
        ))}

        {showBacks
          ? tickets.map((t) => (
              <div key={"b" + t.serial} className="voucher-slot">
                <VoucherBack d={design} site={d.settings ? d.settings.site_name : "Winnn"} />
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
