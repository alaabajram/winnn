/**
 * Money helpers. Everything is USD minor units (cents) as bigint in the
 * database. Winnn credits are retired - products are sold for real money.
 */

/** "12.50" -> 1250 */
export function toCents(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** 1250 -> "12.50" */
export function usd(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 1250 -> "$12.50" */
export const price = (cents: number | null | undefined) => "$" + usd(cents);
