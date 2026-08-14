/**
 * Client-safe money helpers. Kept out of lib/admin.ts because that module
 * imports next/headers, which cannot be pulled into a client bundle.
 */

/** "12.50" -> 1250 minor units. */
export function toCents(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}
