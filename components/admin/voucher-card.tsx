"use client";
import { VOUCHER, groupNumber, type VoucherDesign } from "@/lib/voucher";

/**
 * One voucher, rendered at real size in millimetres so the preview and the
 * printed sheet are the same component. Anything that looks right here
 * prints right.
 */
export function VoucherFront(props: {
  d: VoucherDesign;
  campaign: string;
  prize?: string | null;
  prizeImage?: string | null;
  merchant?: string | null;
  logo?: string | null;
  serial: string;
  entryNumber: string;
  drawDate?: string | null;
  qrSvg?: string | null;
  scale?: number;
}) {
  const d = props.d;
  const s = props.scale || 1;
  const mm = (n: number) => n * s + "mm";

  return (
    <div
      className="voucher relative flex overflow-hidden"
      style={{
        width: mm(VOUCHER.widthMm),
        height: mm(VOUCHER.heightMm),
        background: d.bg,
        color: d.ink,
      }}
    >
      {props.d.frontImage ? (
        <img src={d.frontImage} alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.35 }} />
      ) : null}

      {/* Stub: the half the shop keeps and drops in the drum */}
      <div
        className="relative flex flex-col justify-between"
        style={{
          width: mm(VOUCHER.stubMm),
          background: d.stubBg,
          color: d.stubInk,
          padding: mm(5),
        }}
      >
        <div>
          <p style={{ fontSize: mm(2.6), letterSpacing: "0.12em", fontWeight: 700, opacity: 0.6 }}>
            SHOP COPY
          </p>
          <p style={{ fontSize: mm(4), fontWeight: 800, lineHeight: 1.15, marginTop: mm(1.5) }}>
            {props.campaign}
          </p>
        </div>

        <div>
          <p style={{ fontSize: mm(2.4), letterSpacing: "0.1em", opacity: 0.55 }}>SERIAL</p>
          <p style={{ fontSize: mm(4.6), fontWeight: 700, letterSpacing: "0.04em", fontFamily: "monospace" }}>
            {props.serial}
          </p>
          {props.merchant ? (
            <p style={{ fontSize: mm(2.6), marginTop: mm(1), opacity: 0.6 }}>{props.merchant}</p>
          ) : null}
        </div>
      </div>

      {/* Perforation */}
      <div className="relative" style={{ width: 0 }}>
        <div
          style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            borderLeft: "1px dashed rgba(0,0,0,0.35)",
          }}
        />
      </div>

      {/* Customer half */}
      <div
        className="relative flex flex-1 items-center"
        style={{ padding: mm(5), gap: mm(4) }}
      >
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="flex items-center" style={{ gap: mm(2) }}>
            {d.showLogo && props.logo ? (
              <img src={props.logo} alt="" style={{ height: mm(7), width: "auto" }} />
            ) : null}
            <p style={{ fontSize: mm(3), letterSpacing: "0.14em", fontWeight: 700, color: d.accent }}>
              {d.headline}
            </p>
          </div>

          {props.prize ? (
            <p style={{ fontSize: mm(5.6), fontWeight: 800, lineHeight: 1.1, marginTop: mm(1.5) }}>
              {props.prize}
            </p>
          ) : null}

          <p style={{ fontSize: mm(2.7), opacity: 0.75, marginTop: mm(1) }}>
            {d.subheadline}
          </p>

          <div style={{ marginTop: mm(3) }}>
            <p style={{ fontSize: mm(2.4), letterSpacing: "0.12em", opacity: 0.65 }}>
              {d.entryLabel}
            </p>
            <p
              style={{
                fontSize: mm(7), fontWeight: 800, letterSpacing: "0.06em",
                fontFamily: "monospace", color: d.accent, lineHeight: 1.1,
              }}
            >
              {groupNumber(props.entryNumber)}
            </p>
          </div>

          <p style={{ fontSize: mm(2.6), marginTop: mm(1.5), opacity: 0.85 }}>
            {d.ctaText}
          </p>
        </div>

        <div className="flex flex-col items-center" style={{ gap: mm(1.5) }}>
          {d.showQr && props.qrSvg ? (
            <div
              style={{ width: mm(20), height: mm(20), background: "#fff", padding: mm(1) }}
              dangerouslySetInnerHTML={{ __html: props.qrSvg }}
            />
          ) : d.showPrizeImage && props.prizeImage ? (
            <img src={props.prizeImage} alt=""
              style={{ width: mm(22), height: mm(22), objectFit: "cover", borderRadius: mm(2) }} />
          ) : null}
          {props.drawDate ? (
            <p style={{ fontSize: mm(2.4), opacity: 0.7 }}>Draw {props.drawDate}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function VoucherBack(props: { d: VoucherDesign; site?: string; scale?: number }) {
  const d = props.d;
  const s = props.scale || 1;
  const mm = (n: number) => n * s + "mm";

  return (
    <div
      className="voucher relative overflow-hidden"
      style={{
        width: mm(VOUCHER.widthMm),
        height: mm(VOUCHER.heightMm),
        background: d.stubBg,
        color: d.stubInk,
        padding: mm(6),
      }}
    >
      {d.backImage ? (
        <img src={d.backImage} alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.15 }} />
      ) : null}

      <div className="relative">
        <p style={{ fontSize: mm(4), fontWeight: 800, color: d.bg }}>{d.backTitle}</p>
        <p style={{ fontSize: mm(2.7), lineHeight: 1.5, marginTop: mm(2), whiteSpace: "pre-line" }}>
          {d.backBody}
        </p>
        {props.site ? (
          <p style={{ fontSize: mm(3), fontWeight: 700, marginTop: mm(2.5), color: d.bg }}>
            {props.site}
          </p>
        ) : null}
      </div>
    </div>
  );
}
