import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { winnn, dateFmt } from "@/lib/format";
import { Pill, statusTone, Card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { sb } = await requireAdmin();
  const { data } = await sb
    .from("campaigns")
    .select("id,name,slug,status,type,ticket_price_cents,draw_date,sales_close_at,serial_prefix,campaign_prizes(title,position)")
    .order("created_at", { ascending: false });
  const rows: any[] = (data as any[]) || [];

  const { data: counts } = await sb.from("tickets").select("campaign_id,status");
  const byCampaign: any = {};
  ((counts as any[]) || []).forEach((t) => {
    if (!byCampaign[t.campaign_id]) byCampaign[t.campaign_id] = 0;
    if (t.status !== "CANCELLED") byCampaign[t.campaign_id] += 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Campaigns</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            A campaign must have a description, prize, dates and terms before it can go live.
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="rounded-xl bg-primary px-5 py-3 font-label text-label-bold uppercase tracking-widest text-on-primary hover:bg-inverse-surface"
        >
          New campaign
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                {["Campaign", "Type", "Prize", "Per ticket", "Tickets", "Draw", "Status", ""].map((h) => (
                  <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {rows.map((c) => {
                const prizes: any[] = (c.campaign_prizes as any[]) || [];
                const first = prizes.slice().sort((a, b) => a.position - b.position)[0];
                return (
                  <tr key={c.id} className="hover:bg-surface-container/50">
                    <td className="py-4">
                      <p className="font-label text-label-bold text-on-surface">{c.name}</p>
                      <p className="num font-body text-sm text-on-surface-variant">{c.serial_prefix}</p>
                    </td>
                    <td className="py-4"><Pill>{c.type}</Pill></td>
                    <td className="py-4 font-body text-sm text-on-surface-variant">
                      {first ? first.title : "No prize set"}
                    </td>
                    <td className="num py-4 font-body text-body-md text-on-surface">{winnn(c.ticket_price_cents)} W</td>
                    <td className="num py-4 font-label text-label-bold text-on-surface">{byCampaign[c.id] || 0}</td>
                    <td className="num py-4 font-body text-sm text-on-surface-variant">{dateFmt(c.draw_date)}</td>
                    <td className="py-4"><Pill tone={statusTone(c.status)}>{c.status}</Pill></td>
                    <td className="py-4 text-right">
                      <Link
                        href={"/admin/campaigns/" + c.id}
                        className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="py-12 text-center font-body text-body-md text-on-surface-variant">No campaigns yet.</p>
        ) : null}
      </Card>
    </div>
  );
}
