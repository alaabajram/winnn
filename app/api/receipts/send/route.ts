import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { receiptHtml, receiptSubject } from "@/lib/receipt-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sends queued receipts.
 *
 * Called two ways:
 *   POST /api/receipts/send            - drain the queue (cron or manual)
 *   POST /api/receipts/send {id:"..."} - send one, right after checkout
 *
 * Uses the service role because it must read receipts belonging to any
 * customer and write back the send status. Never expose this key client-side.
 *
 * Email is deliberately decoupled from the checkout transaction: a mail
 * outage must never roll back an order that already took someone's money.
 */
export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;

  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }
  if (!resendKey || !from) {
    // Not an error: receipts stay PENDING and will send once mail is configured.
    return NextResponse.json({ skipped: true, reason: "mail not configured" });
  }

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let only: string | null = null;
  try {
    const body = await request.json();
    only = body && body.id ? String(body.id) : null;
  } catch (e) {}

  let q = admin
    .from("receipts")
    .select("id,receipt_no,kind,email,total_cents,snapshot,email_attempts")
    .eq("email_status", "PENDING")
    .lt("email_attempts", 4)
    .order("created_at", { ascending: true })
    .limit(only ? 1 : 25);
  if (only) q = q.eq("id", only);

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: settings } = await admin
    .from("site_settings")
    .select("site_name,logo_url,support_email")
    .maybeSingle();
  const st: any = settings || {};
  const brand = {
    name: st.site_name || "Winnn",
    logo: st.logo_url || null,
    support: st.support_email || null,
    site: process.env.NEXT_PUBLIC_SITE_URL || "https://winnn-4x9m.vercel.app",
  };

  let sent = 0;
  let failed = 0;

  for (const r of (rows as any[]) || []) {
    if (!r.email) {
      await admin.rpc("fn_mark_receipt_sent", { p_id: r.id, p_ok: false, p_error: "no email on profile" });
      failed++;
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + resendKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [r.email],
          subject: receiptSubject(r, brand.name),
          html: receiptHtml(r, brand),
        }),
      });
      if (res.ok) {
        await admin.rpc("fn_mark_receipt_sent", { p_id: r.id, p_ok: true, p_error: null });
        sent++;
      } else {
        const text = await res.text();
        await admin.rpc("fn_mark_receipt_sent", {
          p_id: r.id, p_ok: false, p_error: ("HTTP " + res.status + " " + text).slice(0, 400),
        });
        failed++;
      }
    } catch (e: any) {
      await admin.rpc("fn_mark_receipt_sent", {
        p_id: r.id, p_ok: false, p_error: String(e && e.message ? e.message : e).slice(0, 400),
      });
      failed++;
    }
  }

  return NextResponse.json({ processed: ((rows as any[]) || []).length, sent, failed });
}

/** GET is a convenience for a cron ping. */
export async function GET(request: NextRequest) {
  return POST(request);
}
