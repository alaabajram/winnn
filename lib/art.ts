/** Deterministic artwork class for a record, until real image URLs exist. */
const ART = ["art-navy", "art-gold", "art-green", "art-slate"];

export function artFor(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % 997;
  return ART[n % ART.length];
}

export function splitCountdown(to: string | null) {
  if (!to) return null;
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return null;
  return {
    days: String(Math.floor(ms / 86400000)).padStart(2, "0"),
    hours: String(Math.floor((ms % 86400000) / 3600000)).padStart(2, "0"),
    mins: String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0"),
  };
}
