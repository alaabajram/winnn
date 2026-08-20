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

/**
 * Deadline label. A day counter reads as noise a month out, so show the date
 * and only switch to a live countdown inside the final 24 hours, where the
 * urgency is real.
 */
export function endsLabel(to: string | null) {
  if (!to) return null;
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return { urgent: false, text: "Entries closed", closed: true };
  if (ms < 86400000) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return {
      urgent: true,
      closed: false,
      text: h > 0 ? h + "h " + m + "m left" : m + "m left",
    };
  }
  return {
    urgent: false,
    closed: false,
    text: "Ends " + new Date(to).toLocaleDateString("en-GB", {
      day: "numeric", month: "short",
    }),
  };
}
