import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * QR as inline SVG. Generated server-side so the print sheet has no runtime
 * dependency on an external image host - a voucher run must not fail
 * because a third party is down.
 */
export async function POST(request: NextRequest) {
  let items: string[] = [];
  try {
    const body = await request.json();
    items = Array.isArray(body.items) ? body.items.slice(0, 500) : [];
  } catch (e) {}

  const out: Record<string, string> = {};
  for (const t of items) {
    try {
      out[t] = await QRCode.toString(t, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        width: 120,
      });
    } catch (e) {}
  }
  return NextResponse.json({ svg: out });
}
