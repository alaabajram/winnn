/**
 * The project URL and publishable key are public by design - they ship in the
 * client bundle regardless. Environment variables take precedence so you can
 * point a deployment at a different project without touching code.
 *
 * The service_role key must NEVER appear here. It belongs only in a server-side
 * environment variable, used by the payment webhook handler.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hryebohnzyyokidxsczl.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_cnh6nMHCEdXz-MWbGUEzWg_dTflUzMO";
