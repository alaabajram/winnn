"use client";
import { VOUCHER, numberGroups, splitTitle, prizeAmount, type VoucherDesign } from "@/lib/voucher";

/**
 * The voucher at real millimetre size, so preview and print are identical.
 *
 * At 210 x 74 the customer half runs as two columns - branding left, prize
 * and number right - because a single vertical stack cannot fit 74mm
 * without shrinking the ticket number, which has to stay readable across a
 * shop counter.
 */

function Confetti(props: { accent: string; scale: number }) {
  const s = props.scale;
  const bits = [
    { x: 6, y: 12, r: -20, w: 2.6, h: 3.6, c: "#3b82f6" },
    { x: 30, y: 6, r: 35, w: 2.2, h: 3.0, c: props.accent },
    { x: 52, y: 10, r: -12, w: 2.0, h: 2.8, c: "#60a5fa" },
    { x: 70, y: 5, r: 25, w: 2.4, h: 3.2, c: props.accent },
    { x: 4, y: 62, r: 18, w: 2.2, h: 3.0, c: props.accent },
    { x: 46, y: 76, r: -28, w: 2.0, h: 2.8, c: "#3b82f6" },
    { x: 66, y: 70, r: 40, w: 2.2, h: 3.0, c: "#60a5fa" },
  ];
  return (
    <>
      {bits.map((b, i) => (
        <span key={i} aria-hidden="true"
          style={{
            position: "absolute", left: b.x + "%", top: b.y + "%",
            width: b.w * s + "mm", height: b.h * s + "mm",
            background: b.c, transform: "rotate(" + b.r + "deg)",
            borderRadius: 0.3 * s + "mm", opacity: 0.8,
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

  /** Label above a write-in rule. */
  const WriteIn = (label: string, icon: string) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div className="flex items-center" style={{ gap: mm(1.2) }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: mm(2.8), opacity: 0.7 }}>{icon}</span>
        <span style={{ fontSize: mm(2.1), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>
          {label}
        </span>
      </div>
      <div style={{ borderBottom: "1px dashed rgba(0,0,0,0.3)", marginTop: mm(2.4) }} />
    </div>
  );

  const Value = (label: string, icon: string, value: string) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div className="flex items-center" style={{ gap: mm(1.2) }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: mm(2.8), opacity: 0.7 }}>{icon}</span>
        <span style={{ fontSize: mm(2.1), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: mm(3.1), fontWeight: 700, marginTop: mm(0.8), fontFamily: "monospace" }}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="voucher relative flex"
      style={{ width: mm(VOUCHER.widthMm), height: mm(VOUCHER.heightMm), background: "#ffffff" }}>

      {/* ---------- SHOP ENTRY ---------- */}
      <div className="relative flex flex-col"
        style={{
          width: mm(VOUCHER.stubMm), flexShrink: 0, background: d.stubBg, color: d.stubInk,
          padding: mm(4.5), borderRight: "1px dashed rgba(0,0,0,0.32)",
        }}>
        <div className="flex items-center justify-center" style={{ gap: mm(1.2) }}>
          <Star size={mm(2.8)} color={d.accent} />
          <span style={{ fontSize: mm(3), fontWeight: 800, letterSpacing: "0.08em" }}>
            {d.stubTitle}
          </span>
          <Star size={mm(2.8)} color={d.accent} />
        </div>

        <p style={{
          fontSize: mm(3.6), fontWeight: 800, lineHeight: 1.15,
          marginTop: mm(1.6), textAlign: "center",
        }}>
          {props.campaign}
        </p>

        {/* Fills the remaining height so there is no dead white space. */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          gap: mm(1.5), marginTop: mm(2.5),
        }}>
          {d.showWriteIn ? (
            <>
              {WriteIn("NAME", "person")}
              {WriteIn("MOBILE", "call")}
            </>
          ) : null}
          {Value("SERIAL", "confirmation_number", props.serial)}
          {props.merchant ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div className="flex items-center" style={{ gap: mm(1.2) }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: mm(2.8), opacity: 0.7 }}>storefront</span>
                <span style={{ fontSize: mm(2.1), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>
                  MERCHANT
                </span>
              </div>
              <p style={{ fontSize: mm(2.9), fontWeight: 700, marginTop: mm(0.8) }}>
                {props.merchant}
              </p>
            </div>
          ) : null}
        </div>

        {d.showLogo && props.logo ? (
          <div className="flex items-center" style={{ gap: mm(2), marginTop: mm(2) }}>
            <img src={props.logo} alt="" style={{ height: mm(9), width: "auto" }} />
            <span style={{
              fontSize: mm(2.2), fontWeight: 800, lineHeight: 1.25,
              borderLeft: "1px solid rgba(0,0,0,0.2)", paddingLeft: mm(2),
            }}>
              {d.tagline.split(" ").map((w, i) => <span key={i} style={{ display: "block" }}>{w}</span>)}
            </span>
          </div>
        ) : null}
      </div>

      {/* ---------- CUSTOMER COPY ---------- */}
      <div className="relative flex flex-1 overflow-hidden"
        style={{ background: d.bg, color: d.ink, minWidth: 0 }}>
        {d.frontImage ? (
          <img src={d.frontImage} alt=""
            className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.3 }} />
        ) : null}
        {d.showConfetti ? <Confetti accent={d.accent} scale={s} /> : null}

        {/* Left: brand and campaign */}
        <div className="relative flex flex-col"
          style={{
            width: mm(VOUCHER.brandMm), flexShrink: 0, minWidth: 0,
            padding: mm(4), paddingRight: mm(2),
          }}>
          {d.showLogo && props.logo ? (
            <img src={props.logo} alt="" style={{ height: mm(13), width: "auto", alignSelf: "flex-start" }} />
          ) : null}
          <p style={{
            fontSize: mm(2.4), fontWeight: 800, letterSpacing: "0.2em",
            marginTop: mm(1), opacity: 0.9,
          }}>
            {d.tagline}
          </p>

          <p style={{ fontSize: mm(6.4), fontWeight: 900, lineHeight: 1.0, marginTop: mm(1.8) }}>
            {l1}
          </p>
          {l2 ? (
            <p style={{ fontSize: mm(6.4), fontWeight: 900, lineHeight: 1.0, color: d.accent }}>
              {l2}
            </p>
          ) : null}

          {d.showPartner && props.merchant ? (
            <div style={{
              background: "#ffffff", color: d.stubInk, borderRadius: mm(1.6),
              padding: mm(1.4) + " " + mm(2.5), marginTop: "auto", textAlign: "center",
            }}>
              <p style={{ fontSize: mm(1.9), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>
                {d.partnerLabel}
              </p>
              {props.merchantLogo ? (
                <img src={props.merchantLogo} alt=""
                  style={{ height: mm(6.5), margin: mm(0.6) + " auto 0", objectFit: "contain" }} />
              ) : (
                <p style={{ fontSize: mm(2.9), fontWeight: 800, marginTop: mm(0.4) }}>
                  {props.merchant}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Right: prize and number */}
        <div className="relative flex flex-1 flex-col justify-center"
          style={{ minWidth: 0, padding: mm(4), paddingLeft: mm(1) }}>

          {amount ? (
            <>
              <span style={{
                alignSelf: "flex-start",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: mm(1.4),
                padding: mm(0.5) + " " + mm(2.2),
                fontSize: mm(2.2), fontWeight: 800, letterSpacing: "0.14em",
              }}>
                {d.prizeLabel}
              </span>

              <div style={{
                background: "linear-gradient(180deg," + d.accent + " 0%," + d.accentDeep + " 100%)",
                color: d.bg, borderRadius: mm(1.8), padding: mm(1.4) + " " + mm(3),
                marginTop: mm(1.2), textAlign: "center",
              }}>
                <p style={{ fontSize: mm(2.3), fontWeight: 800, letterSpacing: "0.12em" }}>
                  {d.prizePrefix}{d.prizeSuffix ? " " + d.prizeSuffix : ""}
                </p>
                <p style={{ fontSize: mm(9.5), fontWeight: 900, lineHeight: 1, marginTop: mm(0.2) }}>
                  {amount}
                </p>
              </div>
            </>
          ) : null}

          <div className="flex items-center" style={{ gap: mm(1.5), marginTop: mm(2.4) }}>
            <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.28)" }} />
            <span style={{ fontSize: mm(2.2), fontWeight: 800, letterSpacing: "0.12em" }}>
              {d.entryLabel}
            </span>
            <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.28)" }} />
          </div>

          <div className="flex justify-center" style={{ gap: mm(1.4), marginTop: mm(1) }}>
            {groups.map((g, i) => (
              <span key={i} style={{
                fontSize: mm(5.2), fontWeight: 900, color: d.accent,
                fontFamily: "monospace", letterSpacing: 0, whiteSpace: "nowrap",
              }}>
                {g}
              </span>
            ))}
          </div>

          <p style={{ fontSize: mm(2.2), marginTop: mm(1), textAlign: "center" }}>
            {d.ctaBefore}{" "}
            <span style={{ color: d.accent, fontWeight: 800 }}>{d.ctaEmphasis}</span>{" "}
            {d.ctaAfter}
          </p>
        </div>

        {/* QR column - fixed width so it can never overflow */}
        {d.showQr ? (
          <div className="relative flex flex-col items-center justify-center"
            style={{
              width: mm(VOUCHER.qrMm), flexShrink: 0, flexGrow: 0, minWidth: 0,
              padding: mm(2.5) + " " + mm(2),
            }}>
            {props.qrSvg ? (
              <div style={{
                width: mm(24), height: mm(24), background: "#fff",
                padding: mm(1.2), borderRadius: mm(1.6),
              }} dangerouslySetInnerHTML={{ __html: props.qrSvg }} />
            ) : (
              <div style={{
                width: mm(24), height: mm(24), background: "rgba(255,255,255,0.15)",
                borderRadius: mm(1.6),
              }} />
            )}
            <p style={{
              fontSize: mm(2.2), fontWeight: 800, letterSpacing: "0.05em",
              marginTop: mm(1.2), textAlign: "center", lineHeight: 1.15,
            }}>
              {d.qrLabel}
            </p>

            {props.drawDate ? (
              <div style={{
                marginTop: mm(1.6), textAlign: "center",
                borderTop: "1px solid rgba(255,255,255,0.25)",
                paddingTop: mm(1.2), width: "100%",
              }}>
                <p style={{
                  fontSize: mm(1.9), fontWeight: 700, letterSpacing: "0.1em", opacity: 0.75,
                }}>
                  DRAW DATE
                </p>
                <p style={{
                  fontSize: mm(2.9), fontWeight: 800, color: d.accent,
                  marginTop: mm(0.4), lineHeight: 1.1,
                }}>
                  {props.drawDate}
                </p>
              </div>
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
        background: d.stubBg, color: d.stubInk, padding: mm(7),
      }}>
      {d.backImage ? (
        <img src={d.backImage} alt=""
          className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.12 }} />
      ) : null}

      <div className="relative">
        <p style={{ fontSize: mm(4.4), fontWeight: 900, color: d.bg }}>{d.backTitle}</p>
        <p style={{ fontSize: mm(2.5), lineHeight: 1.5, marginTop: mm(2), whiteSpace: "pre-line" }}>
          {d.backBody}
        </p>
        {props.site ? (
          <p style={{ fontSize: mm(3.2), fontWeight: 800, marginTop: mm(2.5), color: d.bg }}>
            {props.site}
          </p>
        ) : null}
      </div>
    </div>
  );
}
