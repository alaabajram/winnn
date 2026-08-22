/**
 * Voucher design defaults.
 *
 * Size: 210 x 74 mm. That is full A4 width and exactly a quarter of its
 * height, so four vouchers fit a sheet with no wasted paper and a single
 * guillotine cut between each. The stub is 62mm, leaving 148mm for the
 * customer half - wide enough for the entry number at a size readable
 * across a shop counter.
 */
export const VOUCHER = {
  widthMm: 210,
  heightMm: 74,
  stubMm: 62,
  perPage: 4,
};

export type VoucherDesign = {
  bg: string;
  ink: string;
  accent: string;
  stubBg: string;
  stubInk: string;
  frontImage: string;
  backImage: string;
  headline: string;
  subheadline: string;
  entryLabel: string;
  ctaText: string;
  backTitle: string;
  backBody: string;
  showQr: boolean;
  showLogo: boolean;
  showPrizeImage: boolean;
};

export const DEFAULT_DESIGN: VoucherDesign = {
  bg: "#0d1c32",
  ink: "#ffffff",
  accent: "#fed65b",
  stubBg: "#f8f9fa",
  stubInk: "#191c1d",
  frontImage: "",
  backImage: "",
  headline: "YOU ARE IN THE DRAW",
  subheadline: "Keep this half. The shop keeps the other.",
  entryLabel: "YOUR TICKET NUMBER",
  ctaText: "Enter this number in the app to DOUBLE your chance",
  backTitle: "How to double your chance",
  backBody:
    "1. Open the Winnn app or website\n2. Tap Enter my ticket\n3. Type the 16-digit number from the front\n\nYour shop copy is already in the drum. Entering the number online adds a second slip with your name on it.\n\nNo purchase of credits is needed. Draws are physical and recorded on video.",
  showQr: true,
  showLogo: true,
  showPrizeImage: true,
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

/** 5673482372911805 -> "5673 4823 7291 1805" */
export function groupNumber(v: string) {
  return String(v || "").replace(/(.{4})/g, "$1 ").trim();
}
