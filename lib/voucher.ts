/**
 * Voucher design.
 *
 * Size: 190 x 120 mm, two to an A4 sheet. The reference artwork is close to
 * 3:2, and squeezing that into a letterbox strip would crush the prize
 * plaque and the ticket number - the two things the whole voucher exists to
 * communicate. Two per sheet costs more paper than four and is worth it.
 */
export const VOUCHER = {
  widthMm: 190,
  heightMm: 120,
  stubMm: 62,
  perPage: 2,
};

export type VoucherDesign = {
  bg: string;
  ink: string;
  accent: string;
  accentDeep: string;
  stubBg: string;
  stubInk: string;
  frontImage: string;
  backImage: string;

  tagline: string;
  prizeLabel: string;
  prizePrefix: string;
  prizeSuffix: string;
  entryLabel: string;
  ctaBefore: string;
  ctaEmphasis: string;
  ctaAfter: string;
  qrLabel: string;
  partnerLabel: string;
  stubTitle: string;

  backTitle: string;
  backBody: string;

  showQr: boolean;
  showLogo: boolean;
  showWriteIn: boolean;
  showPartner: boolean;
  showConfetti: boolean;
};

export const DEFAULT_DESIGN: VoucherDesign = {
  bg: "#12224a",
  ink: "#ffffff",
  accent: "#fdc82a",
  accentDeep: "#e8a800",
  stubBg: "#ffffff",
  stubInk: "#12224a",
  frontImage: "",
  backImage: "",

  tagline: "PLAY. SHOP. WIN.",
  prizeLabel: "YOU COULD",
  prizePrefix: "WIN",
  prizeSuffix: "UP TO",
  entryLabel: "YOUR TICKET NUMBER",
  ctaBefore: "Enter this number in the app to",
  ctaEmphasis: "DOUBLE",
  ctaAfter: "your chance",
  qrLabel: "SCAN TO ENTER",
  partnerLabel: "IN PARTNERSHIP WITH",
  stubTitle: "SHOP COPY",

  backTitle: "How to double your chance",
  backBody:
    "1. Scan the QR code, or open the Winnn app\n2. Tap Enter my ticket\n3. Type the 16-digit number from the front\n\nYour shop copy is already in the drum. Entering the number online adds a second slip with your name on it.\n\nDraws are physical and recorded on video. Ticket counts are published after every draw.",

  showQr: true,
  showLogo: true,
  showWriteIn: true,
  showPartner: true,
  showConfetti: true,
};

export function mergeDesign(...layers: any[]): VoucherDesign {
  const out: any = { ...DEFAULT_DESIGN };
  layers.forEach((l) => {
    if (!l) return;
    Object.keys(l).forEach((k) => {
      if (l[k] !== null && l[k] !== undefined && l[k] !== "") out[k] = l[k];
    });
  });
  return out as VoucherDesign;
}

/** 5673482372911805 -> ["5673","4823","7291","1805"] */
export function numberGroups(v: string) {
  const d = String(v || "").replace(/[^0-9]/g, "");
  return [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12), d.slice(12, 16)].filter(Boolean);
}

/**
 * Split a campaign name across two lines so the second can carry the accent
 * colour, as in "SUMMER / MEGA DRAW". Splits near the middle on a word break.
 */
export function splitTitle(name: string) {
  const words = String(name || "").trim().split(/\s+/);
  if (words.length === 1) return [words[0], ""];
  if (words.length === 2) return [words[0], words[1]];
  const mid = Math.ceil(words.length / 3);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/** "Grand Prize - $100,000 cash" -> "$100,000" when there is a money value. */
export function prizeAmount(title: string | null | undefined, valueCents?: number | null) {
  const t = String(title || "");
  const m = t.match(/\$\s?[\d,.]+/);
  if (m) return m[0].replace(/\s/g, "");
  if (valueCents) return "$" + (Number(valueCents) / 100).toLocaleString("en-US");
  const after = t.split("-").slice(1).join("-").trim();
  return after || t;
}
