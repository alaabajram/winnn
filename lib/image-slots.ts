/**
 * Every image slot in the product, with the size it is actually rendered at.
 *
 * `w`/`h` are the recommended pixels. `ratio` is enforced loosely - an upload
 * that is off-aspect is accepted with a warning rather than rejected, because
 * a merchant with a slightly wrong logo should not be blocked from saving.
 * `maxKb` is a soft guide; the bucket enforces 5 MB hard.
 */
export type Slot = {
  key: string;
  label: string;
  w: number;
  h: number;
  note: string;
  maxKb: number;
  /** how the preview should be framed */
  shape: "square" | "wide" | "banner" | "portrait";
};

export const SLOTS: Record<string, Slot> = {
  site_logo: {
    key: "site_logo", label: "Site logo", w: 512, h: 512, shape: "square", maxKb: 300,
    note: "Square. Shown in the header and sidebar. PNG or SVG with a transparent background works best.",
  },
  favicon: {
    key: "favicon", label: "Favicon", w: 512, h: 512, shape: "square", maxKb: 100,
    note: "Square PNG. Browsers scale it down to 32px, so keep the mark simple and avoid fine detail.",
  },
  og_default: {
    key: "og_default", label: "Default share image", w: 1200, h: 630, shape: "wide", maxKb: 500,
    note: "1200x630 is the WhatsApp and social standard. Keep text away from the outer 60px, which gets cropped.",
  },
  merchant_logo: {
    key: "merchant_logo", label: "Merchant logo", w: 512, h: 512, shape: "square", maxKb: 300,
    note: "Square. Appears in merchant lists and is printed on vouchers.",
  },
  merchant_cover: {
    key: "merchant_cover", label: "Merchant cover", w: 1600, h: 600, shape: "banner", maxKb: 800,
    note: "Wide banner for the merchant profile. The centre stays visible on mobile.",
  },
  campaign_hero: {
    key: "campaign_hero", label: "Campaign hero", w: 1920, h: 1080, shape: "wide", maxKb: 1200,
    note: "16:9. A dark gradient sits over the bottom half, so put the subject in the upper two thirds.",
  },
  campaign_thumb: {
    key: "campaign_thumb", label: "Campaign card image", w: 800, h: 600, shape: "wide", maxKb: 400,
    note: "4:3. Used on the campaign card on the home page.",
  },
  campaign_banner: {
    key: "campaign_banner", label: "Ticket banner", w: 1200, h: 400, shape: "banner", maxKb: 500,
    note: "3:1. Printed across the physical voucher and shown on the digital ticket.",
  },
  sponsor_logo: {
    key: "sponsor_logo", label: "Sponsor logo", w: 512, h: 512, shape: "square", maxKb: 300,
    note: "Square, transparent background. Printed on the voucher next to the campaign name.",
  },
  campaign_og: {
    key: "campaign_og", label: "Campaign share image", w: 1200, h: 630, shape: "wide", maxKb: 500,
    note: "Shown when the campaign link is shared on WhatsApp. Falls back to the site default.",
  },
  banner_home: {
    key: "banner_home", label: "Home banner", w: 1600, h: 700, shape: "banner", maxKb: 900,
    note: "Wide promotional banner for the Deals carousel. Keep important detail in the middle third, the edges crop on mobile.",
  },
  prize_image: {
    key: "prize_image", label: "Prize image", w: 1000, h: 1000, shape: "square", maxKb: 500,
    note: "Square photo of the prize itself.",
  },
  product_image: {
    key: "product_image", label: "Product image", w: 1000, h: 1000, shape: "square", maxKb: 500,
    note: "Square. The first image is the one shown on the store grid.",
  },
};

export const aspectClass = (shape: Slot["shape"]) =>
  shape === "square" ? "aspect-square"
  : shape === "banner" ? "aspect-[3/1]"
  : shape === "portrait" ? "aspect-[3/4]"
  : "aspect-video";
