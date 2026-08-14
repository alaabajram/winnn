/** All money is stored as integer minor units of Winnn. 1 Winnn = 1 USD = 100. */
export const winnn = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export function countdown(to: string | null) {
  if (!to) return null;
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export const dateFmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
