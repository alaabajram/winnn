import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn, dateFmt } from "@/lib/format";

export const dynamic = "force-dynamic";

function mask(name: string | null | undefined) {
  if (!name) return "Ticket holder";
  return name.split(" ").map((p) => p[0] + "*".repeat(Math.max(p.length - 1, 1))).join(" ");
}

export default async function Results(props: any) {
  const params = await props.params;
  const slug = params.slug;
  const sb = await supabaseServer();

  const { data: campaign } = await sb.from("campaigns").select("id,name,slug").eq("slug", slug).maybeSingle();
  if (!campaign) notFound();
  const c: any = campaign;

  const { data: drawRow } = await sb
    .from("draws")
    .select("id,youtube_video_id,published_at,pool_online_count,pool_offline_count,pool_total_count,draw_winners(position,claim_status,tickets(serial,source),profiles(full_name))")
    .eq("campaign_id", c.id)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  if (!drawRow) notFound();
  const draw: any = drawRow;

  const { data: prizeRows } = await sb
    .from("campaign_prizes").select("position,title,value_cents").eq("campaign_id", c.id);
  const prizes: any[] = (prizeRows as any[]) || [];
  const winners: any[] = ((draw.draw_winners as any[]) || []).slice().sort((a, b) => a.position - b.position);

  return (
    <div className="flex w-full flex-col">
      <Link
        href="/"
        className="mb-6 flex items-center gap-1 font-label text-label-bold text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        All campaigns
      </Link>

      <div className="mb-8">
        <span className="rounded-full border border-outline-variant/30 bg-surface-container px-3 py-1 font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
          Completed {dateFmt(draw.published_at)}
        </span>
        <h1 className="mt-4 font-display text-display-sm text-on-background sm:text-display-lg">{c.name}</h1>
      </div>

      {draw.youtube_video_id ? (
        <section className="mb-10">
          <h2 className="mb-4 font-headline text-headline-md text-on-background">Watch the draw</h2>
          <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={"https://www.youtube.com/embed/" + draw.youtube_video_id}
              title="Draw video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      ) : null}

      <h2 className="mb-4 font-headline text-headline-md text-on-background">Winners</h2>
      <div className="mb-10 flex flex-col gap-4">
        {winners.map((w: any) => {
          const prize = prizes.find((p: any) => p.position === w.position);
          return (
            <div
              key={w.position}
              className="relative overflow-hidden rounded-3xl bg-primary-container p-8 text-on-primary-container shadow-xl"
            >
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                  <span className="rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
                    Prize {w.position}
                  </span>
                  <span className="num font-headline text-headline-sm text-secondary-fixed">
                    {winnn(prize ? prize.value_cents : 0)} W
                  </span>
                </div>

                <h3 className="mb-6 font-headline text-headline-md text-on-primary">
                  {prize ? prize.title : "Prize"}
                </h3>

                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                      <span className="material-symbols-outlined">emoji_events</span>
                    </div>
                    <div>
                      <p className="mb-1 font-label text-[10px] font-semibold uppercase tracking-widest opacity-70">
                        Winner
                      </p>
                      <p className="font-headline text-headline-sm text-on-primary">
                        {w.claim_status === "AWAITING_CLAIM"
                          ? "Unclaimed"
                          : mask(w.profiles ? w.profiles.full_name : null)}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center rounded-lg border-2 border-dashed border-secondary-fixed/40 px-6 py-3">
                    <div>
                      <p className="mb-0.5 text-center font-label text-[10px] font-semibold uppercase tracking-widest text-secondary-fixed">
                        Winning ticket
                      </p>
                      <p className="num text-center font-headline text-[16px] tracking-widest text-on-primary">
                        {w.tickets ? w.tickets.serial : "-"}
                      </p>
                      <p className="mt-1 text-center font-label text-[10px] uppercase tracking-widest opacity-60">
                        {w.tickets ? w.tickets.source : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-surface-container p-8 shadow-inner">
        <h2 className="font-headline text-headline-sm text-on-surface">Draw reconciliation</h2>
        <p className="mt-2 max-w-2xl font-body text-body-md text-on-surface-variant">
          The draw was physical. Online ticket serials were printed after sales closed and placed in the
          same drum as the store copies collected from partner businesses. Every ticket counted below was in
          that drum at the moment of the draw.
        </p>
        <dl className="num mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-surface p-5 text-center">
            <dt className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Online
            </dt>
            <dd className="mt-2 font-headline text-headline-md text-on-surface">{draw.pool_online_count}</dd>
          </div>
          <div className="rounded-2xl bg-surface p-5 text-center">
            <dt className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              In store
            </dt>
            <dd className="mt-2 font-headline text-headline-md text-on-surface">{draw.pool_offline_count}</dd>
          </div>
          <div className="rounded-2xl bg-primary-container p-5 text-center">
            <dt className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-primary-container">
              Total
            </dt>
            <dd className="mt-2 font-headline text-headline-md text-secondary-fixed">
              {draw.pool_total_count}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
