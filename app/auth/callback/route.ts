import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Single landing route for every email link and OAuth return.
 *
 * Supabase sends two shapes depending on the flow:
 *   ?code=...                 PKCE (Google OAuth, and newer email links)
 *   ?token_hash=...&type=...  email confirmation / recovery links
 * Both are handled here so a user never lands on a 404 holding a valid link.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/wallet";

  const sb = await supabaseServer();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({
      type: type as any,
      token_hash: tokenHash,
    });
    if (!error) {
      const dest = type === "recovery" ? "/auth/reset" : next;
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
