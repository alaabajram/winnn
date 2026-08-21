import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sends a queued CRM email batch.
 *
 * Recipients are frozen at queue time, so this only walks a fixed list. Each
 * row is marked individually, which means a partial failure leaves an exact
 * record of who did and did not receive it.
 */
export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;

  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }
  if (!resendKey || !from) {
    return NextResponse.json({ skipped: true, reason: "mail not configured" });
  }

  let sendId: string | null = null;
  try {
    const body = await request.json();
    sendId = body && body.send_id ? String(body.send_id) : null;
  } catch (e) {}
  if (!sendId) return NextResponse.json({ error: "send_id required" }, { status: 400 });

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: send } = await admin
    .from("email_sends").select("id,subject,body").eq("id", sendId).maybeSingle();
  if (!send) return NextResponse.json({ error: "send not found" }, { status: 404 });

  const { data: settings } = await admin
    .from("site_settings").select("site_name,logo_url,support_email").maybeSingle();
  const st: any = settings || {};
  const brandName = st.site_name || "Winnn";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://winnn-4x9m.vercel.app";

  const { data: rows } = await admin
    .from("email_send_recipients")
    .select("id,customer_id,email,state")
    .eq("send_id", sendId)
    .eq("state", "PENDING")
    .limit(300);

  const list: any[] = (rows as any[]) || [];
  if (!list.length) return NextResponse.json({ processed: 0, sent: 0, failed: 0 });

  // Names for the {{name}} placeholder.
  const ids = list.map((r) => r.customer_id);
  const { data: profiles } = await admin
    .from("profiles").select("id,full_name").in("id", ids);
  const nameById: any = {};
  ((profiles as any[]) || []).forEach((p) => { nameById[p.id] = p.full_name; });

  const s: any = send;
  let sent = 0;
  let failed = 0;

  for (const r of list) {
    const name = nameById[r.customer_id] || "there";
    const text = String(s.body).split("{{name}}").join(name);
    const subject = String(s.subject).split("{{name}}").join(name);

    const html =
      '<!doctype html><html><body style="margin:0;padding:0;background:#f8f9fa;font-family:Helvetica,Arial,sans-serif">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">' +
      '<tr><td style="background:#0d1c32;padding:22px">' +
      (st.logo_url
        ? '<img src="' + st.logo_url + '" alt="' + brandName + '" height="30" style="height:30px;display:block">'
        : '<span style="color:#fed65b;font-size:19px;font-weight:800;letter-spacing:3px;text-transform:uppercase">' + brandName + "</span>") +
      "</td></tr>" +
      '<tr><td style="padding:28px 24px">' +
      text.split("\n").map((l: string) =>
        '<p style="margin:0 0 14px;font-size:16px;line-height:24px;color:#191c1d">' + l + "</p>"
      ).join("") +
      '<a href="' + site + '" style="display:inline-block;margin-top:10px;background:#0d1c32;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Open ' + brandName + "</a>" +
      "</td></tr>" +
      '<tr><td style="padding:0 24px 26px;border-top:1px solid #e1e3e4">' +
      '<p style="margin:14px 0 0;font-size:12px;line-height:18px;color:#44474d">' +
      "You are receiving this because you have a " + brandName + " account." +
      (st.support_email ? "<br>Questions? " + st.support_email : "") +
      "</p></td></tr></table></td></tr></table></body></html>";

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [r.email], subject, html }),
      });
      if (res.ok) {
        await admin.rpc("fn_mark_send_recipient", { p_id: r.id, p_ok: true, p_error: null });
        sent++;
      } else {
        const t = await res.text();
        await admin.rpc("fn_mark_send_recipient", {
          p_id: r.id, p_ok: false, p_error: ("HTTP " + res.status + " " + t).slice(0, 300),
        });
        failed++;
      }
    } catch (e: any) {
      await admin.rpc("fn_mark_send_recipient", {
        p_id: r.id, p_ok: false, p_error: String(e && e.message ? e.message : e).slice(0, 300),
      });
      failed++;
    }
  }

  return NextResponse.json({ processed: list.length, sent, failed });
}
