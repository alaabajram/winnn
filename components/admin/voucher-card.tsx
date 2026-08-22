"use client";
import { VOUCHER, numberGroups, splitTitle, prizeAmount, type VoucherDesign } from "@/lib/voucher";

/**
 * The voucher, rendered in real millimetres so preview and print are the
 * same component. Everything except the fixed labels is pulled from the
 * campaign, merchant and ticket - nothing is typed twice.
 */

function Confetti(props: { accent: string; scale: number }) {
  const s = props.scale;
  const bits = [
    { x: 12, y: 14, r: -20, w: 3.2, h: 4.4, c: "#3b82f6" },
    { x: 22, y: 8, r: 35, w: 2.6, h: 3.6, c: props.accent },
    { x: 34, y: 18, r: -10, w: 2.2, h: 3.0, c: "#60a5fa" },
    { x: 78, y: 10, r: 25, w: 3.0, h: 4.0, c: props.accent },
    { x: 88, y: 22, r: -30, w: 2.4, h: 3.4, c: "#3b82f6" },
    { x: 8, y: 40, r: 15, w: 2.0, h: 2.8, c: props.accent },
    { x: 92, y: 46, r: -18, w: 2.6, h: 3.6, c: "#60a5fa" },
    { x: 16, y: 62, r: 40, w: 2.2, h: 3.0, c: props.accent },
  ];
  return (
    <>
      {bits.map((b, i) => (
        <span key={i} aria-hidden="true"
          style={{
            position: "absolute", left: b.x + "%", top: b.y + "%",
            width: b.w * s + "mm", height: b.h * s + "mm",
            background: b.c, transform: "rotate(" + b.r + "deg)",
            borderRadius: 0.4 * s + "mm", opacity: 0.85,
          }} />
      ))}
    </>
  );
}

function Star(props: { size: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: props.size, height: props.size }} aria-hidden="true">
      <path fill={props.color}
        d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
    </svg>
  );
}

export function VoucherFront(props: {
  d: VoucherDesign;
  campaign: string;
  prize?: string | null;
  prizeValueCents?: number | null;
  merchant?: string | null;
  merchantLogo?: string | null;
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
  const [l1, l2] = splitTitle(props.campaign);
  const amount = prizeAmount(props.prize, props.prizeValueCents);
  const groups = numberGroups(props.entryNumber);

  const Line = (label: string, icon: string) => (
    <div style={{ marginBottom: mm(4) }}>
      <div className="flex items-center" style={{ gap: mm(1.4) }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: mm(3.4), color: d.stubInk, opacity: 0.75 }}>{icon}</span>
        <span style={{ fontSize: mm(2.5), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.75 }}>
          {label}
        </span>
      </div>
      <div style={{ borderBottom: "1px dashed rgba(0,0,0,0.28)", marginTop: mm(3.2) }} />
    </div>
  );

  return (
    <div className="voucher relative flex"
      style={{ width: mm(VOUCHER.widthMm), height: mm(VOUCHER.heightMm), background: "#ffffff" }}>

      {/* ---------- SHOP COPY ---------- */}
      <div className="relative flex flex-col"
        style={{
          width: mm(VOUCHER.stubMm), background: d.stubBg, color: d.stubInk,
          padding: mm(6), borderRight: "1px dashed rgba(0,0,0,0.3)",
        }}>
        <div className="flex items-center justify-center" style={{ gap: mm(1.5) }}>
          <Star size={mm(3.4)} color={d.accent} />
          <span style={{ fontSize: mm(3.6), fontWeight: 800, letterSpacing: "0.08em" }}>
            {d.stubTitle}
          </span>
          <Star size={mm(3.4)} color={d.accent} />
        </div>

        <p style={{ fontSize: mm(4.6), fontWeight: 800, lineHeight: 1.15, marginTop: mm(2.5) }}>
          {props.campaign}
        </p>

        <div style={{ marginTop: mm(5), flex: 1 }}>
          {d.showWriteIn ? (
            <>
              {Line("NAME", "person")}
              {Line("MOBILE", "call")}
            </>
          ) : null}

          <div style={{ marginBottom: mm(3.5) }}>
            <div className="flex items-center" style={{ gap: mm(1.4) }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: mm(3.4), opacity: 0.75 }}>confirmation_number</span>
              <span style={{ fontSize: mm(2.5), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.75 }}>
                SERIAL NUMBER
              </span>
            </div>
            <p style={{ fontSize: mm(3.6), fontWeight: 700, marginTop: mm(1.2), fontFamily: "monospace" }}>
              {props.serial}
            </p>
          </div>

          {props.merchant ? (
            <div>
              <div className="flex items-center" style={{ gap: mm(1.4) }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: mm(3.4), opacity: 0.75 }}>storefront</span>
                <span style={{ fontSize: mm(2.5), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.75 }}>
                  MERCHANT
                </span>
              </div>
              <p style={{ fontSize: mm(3.4), fontWeight: 700, marginTop: mm(1.2) }}>
                {props.merchant}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center" style={{ gap: mm(2.5) }}>
          {d.showLogo && props.logo ? (
            <img src={props.logo} alt="" style={{ height: mm(8), width: "auto" }} />
          ) : null}
          <div style={{ borderLeft: "1px solid rgba(0,0,0,0.2)", paddingLeft: mm(2.5) }}>
            <p style={{ fontSize: mm(2.6), fontWeight: 800, lineHeight: 1.3 }}>
              {d.tagline.split(" ").map((w, i) => <span key={i} style={{ display: "block" }}>{w}</span>)}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- CUSTOMER COPY ---------- */}
      <div className="relative flex flex-1 overflow-hidden" style={{ background: d.bg, color: d.ink }}>
        {d.frontImage ? (
          <img src={d.frontImage} alt=""
            className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.3 }} />
        ) : null}
        {d.showConfetti ? <Confetti accent={d.accent} scale={s} /> : null}

        <div className="relative flex flex-1 flex-col items-center"
          style={{ padding: mm(5), paddingRight: mm(2) }}>

          {d.showLogo && props.logo ? (
            <img src={props.logo} alt="" style={{ height: mm(11), width: "auto" }} />
          ) : null}
          <p style={{
            fontSize: mm(2.7), fontWeight: 800, letterSpacing: "0.18em",
            marginTop: mm(1.2), opacity: 0.9,
          }}>
            {d.tagline}
          </p>

          <p style={{
            fontSize: mm(9), fontWeight: 900, lineHeight: 0.98, marginTop: mm(2),
            letterSpacing: "-0.01em", textAlign: "center",
          }}>
            {l1}
          </p>
          {l2 ? (
            <p style={{
              fontSize: mm(9), fontWeight: 900, lineHeight: 0.98, color: d.accent,
              letterSpacing: "-0.01em", textAlign: "center",
            }}>
              {l2}
            </p>
          ) : null}

          {amount ? (
            <>
              <span style={{
                background: d.bg, border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: mm(2), padding: mm(0.8) + " " + mm(3),
                fontSize: mm(2.6), fontWeight: 800, letterSpacing: "0.12em",
                marginTop: mm(2.5),
              }}>
                {d.prizeLabel}
              </span>

              <div style={{
                background: "linear-gradient(180deg," + d.accent + " 0%," + d.accentDeep + " 100%)",
                color: d.bg, borderRadius: mm(2.5), padding: mm(1.5) + " " + mm(5),
                marginTop: mm(1.5), textAlign: "center", minWidth: mm(62),
              }}>
                <div className="flex items-center justify-between" style={{ gap: mm(3) }}>
                  <span style={{ fontSize: mm(2.9), fontWeight: 800, letterSpacing: "0.06em" }}>
                    {d.prizePrefix}
                  </span>
                  <span style={{ fontSize: mm(2.9), fontWeight: 800, letterSpacing: "0.06em" }}>
                    {d.prizeSuffix}
                  </span>
                </div>
                <p style={{ fontSize: mm(11), fontWeight: 900, lineHeight: 1, marginTop: mm(0.5) }}>
                  {amount}
                </p>
              </div>
            </>
          ) : null}

          <div className="flex w-full items-center" style={{ gap: mm(2), marginTop: mm(3) }}>
            <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: mm(2.7), fontWeight: 800, letterSpacing: "0.14em" }}>
              {d.entryLabel}
            </span>
            <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.3)" }} />
          </div>

          <div className="flex" style={{ gap: mm(3), marginTop: mm(1.5) }}>
            {groups.map((g, i) => (
              <span key={i} style={{
                fontSize: mm(7.5), fontWeight: 900, color: d.accent,
                fontFamily: "monospace", letterSpacing: "0.02em",
              }}>
                {g}
              </span>
            ))}
          </div>

          <p style={{ fontSize: mm(2.8), marginTop: mm(1.5), textAlign: "center" }}>
            {d.ctaBefore}{" "}
            <span style={{ color: d.accent, fontWeight: 800 }}>{d.ctaEmphasis}</span>{" "}
            {d.ctaAfter}
          </p>

          {d.showPartner && props.merchant ? (
            <div style={{
              background: "#ffffff", color: d.stubInk, borderRadius: mm(2),
              padding: mm(2) + " " + mm(4), marginTop: "auto", textAlign: "center",
              minWidth: mm(60),
            }}>
              <p style={{ fontSize: mm(2.3), fontWeight: 700, letterSpacing: "0.12em", opacity: 0.7 }}>
                {d.partnerLabel}
              </p>
              {props.merchantLogo ? (
                <img src={props.merchantLogo} alt=""
                  style={{ height: mm(9), margin: mm(1) + " auto 0", objectFit: "contain" }} />
              ) : (
                <p style={{ fontSize: mm(4), fontWeight: 800, marginTop: mm(0.8) }}>
                  {props.merchant}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* QR column */}
        {d.showQr ? (
          <div className="relative flex flex-col items-center justify-center"
            style={{
              width: mm(34), borderLeft: "1px solid " + d.accent,
              padding: mm(3),
            }}>
            {props.qrSvg ? (
              <div style={{
                width: mm(26), height: mm(26), background: "#fff",
                padding: mm(1.5), borderRadius: mm(2),
              }} dangerouslySetInnerHTML={{ __html: props.qrSvg }} />
            ) : (
              <div style={{
                width: mm(26), height: mm(26), background: "rgba(255,255,255,0.15)",
                borderRadius: mm(2),
              }} />
            )}
            <p style={{
              fontSize: mm(3), fontWeight: 800, letterSpacing: "0.08em",
              marginTop: mm(2), textAlign: "center", lineHeight: 1.25,
            }}>
              {d.qrLabel}
            </p>
            {props.drawDate ? (
              <p style={{ fontSize: mm(2.3), marginTop: mm(1.5), opacity: 0.75, textAlign: "center" }}>
                Draw {props.drawDate}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function VoucherBack(props: { d: VoucherDesign; site?: string; scale?: number }) {
  const d = props.d;
  const s = props.scale || 1;
  const mm = (n: number) => n * s + "mm";

  return (
    <div className="voucher relative overflow-hidden"
      style={{
        width: mm(VOUCHER.widthMm), height: mm(VOUCHER.heightMm),
        background: d.stubBg, color: d.stubInk, padding: mm(10),
      }}>
      {d.backImage ? (
        <img src={d.backImage} alt=""
          className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.12 }} />
      ) : null}

      <div className="relative">
        <p style={{ fontSize: mm(6), fontWeight: 900, color: d.bg }}>{d.backTitle}</p>
        <p style={{ fontSize: mm(3.2), lineHeight: 1.6, marginTop: mm(3), whiteSpace: "pre-line" }}>
          {d.backBody}
        </p>
        {props.site ? (
          <p style={{ fontSize: mm(4), fontWeight: 800, marginTop: mm(4), color: d.bg }}>
            {props.site}
          </p>
        ) : null}
      </div>
    </div>
  );
}
