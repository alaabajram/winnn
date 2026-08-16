import { winnn } from "./format";

/**
 * Receipt HTML. Deliberately table-based with inline styles: Gmail, Outlook
 * and most mobile clients strip <style> blocks and ignore flexbox.
 */
export function receiptHtml(r: any, brand: { name: string; logo?: string | null; site: string; support?: string | null }) {
  const s = r.snapshot || {};
  const navy = "#0d1c32";
  const gold = "#fed65b";
  const muted = "#44474d";
  const line = "#e1e3e4";

  const row = (label: string, value: string, strong?: boolean) =>
    '<tr><td style="padding:6px 0;color:' + muted + ';font-size:14px">' + label + '</td>' +
    '<td align="right" style="padding:6px 0;font-size:14px;' +
    (strong ? "font-weight:700;color:" + navy : "color:#191c1d") + '">' + value + "</td></tr>";

  let body = "";

  if (r.kind === "CREDIT_PURCHASE") {
    const serials: string[] = s.ticket_serials || [];
    body =
      '<p style="margin:0 0 16px;font-size:16px;line-height:24px">' +
      "Thank you. Your payment is confirmed and <strong>" + winnn(s.winnn_cents || r.total_cents) +
      " Winnn</strong> has been added to your wallet." +
      "</p>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">' +
      row("Paid", (Number(s.amount_minor || 0) / 100).toFixed(2) + " " + (s.currency || "USD")) +
      row("Credited", winnn(s.winnn_cents || r.total_cents) + " Winnn") +
      (s.campaign ? row("Campaign", s.campaign) : "") +
      (s.ticket_count ? row("Tickets issued", String(s.ticket_count)) : "") +
      row("Wallet balance", winnn(s.balance_after_cents) + " Winnn", true) +
      "</table>" +
      (serials.length
        ? '<p style="margin:20px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:' + muted + '">Your ticket numbers</p>' +
          '<p style="margin:0;font-family:monospace;font-size:14px;line-height:22px;color:' + navy + '">' +
          serials.join("<br>") + "</p>" +
          '<p style="margin:16px 0 0;font-size:13px;color:' + muted + '">' +
          "These go into the physical drum on the draw date. Spending your Winnn in the store does not cancel them." +
          "</p>"
        : "");
  }

  if (r.kind === "STORE_ORDER") {
    const items: any[] = s.items || [];
    const sh = s.shipping || {};
    body =
      '<p style="margin:0 0 16px;font-size:16px;line-height:24px">' +
      "Your order <strong>" + (s.order_no || "") + "</strong> is confirmed and paid from your Winnn wallet." +
      "</p>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid ' + line + '">' +
      items.map((i) =>
        '<tr><td style="padding:10px 0;border-bottom:1px solid ' + line + ';font-size:14px">' +
        i.name + ' <span style="color:' + muted + '">x' + i.quantity + "</span></td>" +
        '<td align="right" style="padding:10px 0;border-bottom:1px solid ' + line + ';font-size:14px">' +
        winnn(i.line_cents) + " W</td></tr>"
      ).join("") +
      '<tr><td style="padding:12px 0;font-weight:700;color:' + navy + '">Total</td>' +
      '<td align="right" style="padding:12px 0;font-weight:700;color:' + navy + '">' +
      winnn(r.total_cents) + " Winnn</td></tr>" +
      row("Wallet balance", winnn(s.balance_after_cents) + " Winnn") +
      "</table>" +
      '<p style="margin:20px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:' + muted + '">Delivering to</p>' +
      '<p style="margin:0;font-size:14px;line-height:22px">' +
      [sh.full_name, sh.phone, sh.line1, sh.line2, sh.area, sh.city].filter(Boolean).join("<br>") +
      "</p>" +
      (sh.notes ? '<p style="margin:8px 0 0;font-size:13px;color:' + muted + '">' + sh.notes + "</p>" : "");
  }

  if (r.kind === "REFUND") {
    body =
      '<p style="margin:0 0 16px;font-size:16px;line-height:24px">' +
      "We have refunded <strong>" + winnn(r.total_cents) + " Winnn</strong> to your wallet for order " +
      (s.order_no || "") + "." +
      "</p>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">' +
      (s.reason ? row("Reason", s.reason) : "") +
      row("Wallet balance", winnn(s.balance_after_cents) + " Winnn", true) +
      "</table>" +
      '<p style="margin:0;font-size:13px;color:' + muted + '">' +
      "Winnn credits are spendable in the store and are not exchangeable for cash." +
      "</p>";
  }

  const title =
    r.kind === "CREDIT_PURCHASE" ? "Payment confirmed"
    : r.kind === "STORE_ORDER" ? "Order confirmed"
    : "Refund issued";

  return (
    '<!doctype html><html><body style="margin:0;padding:0;background:#f8f9fa;font-family:Helvetica,Arial,sans-serif">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:24px 12px">' +
    '<tr><td align="center">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">' +

    '<tr><td style="background:' + navy + ';padding:24px">' +
    (brand.logo
      ? '<img src="' + brand.logo + '" alt="' + brand.name + '" height="32" style="height:32px;display:block">'
      : '<span style="color:' + gold + ';font-size:20px;font-weight:800;letter-spacing:3px;text-transform:uppercase">' + brand.name + "</span>") +
    "</td></tr>" +

    '<tr><td style="padding:28px 24px 8px">' +
    '<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:' + muted + '">' +
    r.receipt_no + "</p>" +
    '<h1 style="margin:0 0 20px;font-size:24px;color:' + navy + '">' + title + "</h1>" +
    body +
    "</td></tr>" +

    '<tr><td style="padding:24px">' +
    '<a href="' + brand.site + '/profile" style="display:block;background:' + navy + ';color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase">View in your account</a>' +
    "</td></tr>" +

    '<tr><td style="padding:0 24px 28px;border-top:1px solid ' + line + '">' +
    '<p style="margin:16px 0 0;font-size:12px;line-height:18px;color:' + muted + '">' +
    "This is a receipt for your records. Winnn credits are spendable in the Winnn store only and are not exchangeable for cash." +
    (brand.support ? "<br>Questions? " + brand.support : "") +
    "</p></td></tr>" +

    "</table></td></tr></table></body></html>"
  );
}

export function receiptSubject(r: any, brandName: string) {
  const s = r.snapshot || {};
  if (r.kind === "CREDIT_PURCHASE")
    return brandName + " receipt " + r.receipt_no +
      (s.ticket_count ? " - " + s.ticket_count + " ticket" + (s.ticket_count === 1 ? "" : "s") : "");
  if (r.kind === "STORE_ORDER") return brandName + " order " + (s.order_no || r.receipt_no) + " confirmed";
  return brandName + " refund " + r.receipt_no;
}
