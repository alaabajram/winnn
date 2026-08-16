import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn, dateFmt } from "@/lib/format";
import { artFor, splitCountdown } from "@/lib/art";

export const dynamic = "force-dynamic";

export default async function Campaign(props: any) {
  const params = await props.params;
  const slug = params.slug;
  const sb = await supabaseServer();

  const { data } = await sb
    .from("campaigns")
    .select("id,name,slug,description,type,terms,draw_date,sales_close_at,ticket_price_cents,hero_image_url,sponsor_logo_url,campaign_prizes(position,title,value_cents),campaign_merchants(merchants(name,category,address))")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  const c: any = data;

  const { data: auth } = await sb.auth.getUser();
  const user = auth ? auth.user : null;
  let myTickets = 0;
  if (user) {
    const { count } = await sb
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .eq("status", "ELIGIBLE");
    myTickets = count || 0;
  }

  const prizes: any[] = ((c.campaign_prizes as any[]) || []).slice().sort((a, b) => a.position - b.position);
  const merchants: any[] = (c.campaign_merchants as any[]) || [];
  const cd = splitCountdown(c.sales_close_at);

  return (
    <div className="flex w-full flex-col">
      <Link
        href="/"
        className="mb-6 flex items-center gap-1 font-label text-label-bold text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        All campaigns
      </Link>

      <section className="relative mb-8 w-full overflow-hidden rounded-[24px] shadow-2xl">
        {c.hero_image_url ? (
          <img src={c.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={"absolute inset-0 " + artFor(c.slug)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-primary/10" />
        <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-8 sm:p-12">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-surface/20 bg-surface/10 px-4 py-1.5 backdrop-blur-md">
            <span className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-primary">
              {c.type === "HYBRID" ? "Online + In store" : c.type === "ONLINE" ? "Online only" : "In store only"}
            </span>
          </div>
          <h1 className="mb-3 font-display text-display-sm text-on-primary drop-shadow-md sm:text-display-lg">
            {c.name}
          </h1>
          <p className="max-w-2xl font-body text-body-lg text-primary-fixed-dim">{c.description}</p>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="rounded-3xl bg-primary-container p-6 text-on-primary-container shadow-lg">
          <p className="font-label text-[10px] font-semibold uppercase tracking-widest opacity-70">
            Your tickets
          </p>
          <p className="num mt-2 font-display text-display-sm text-secondary-fixed">
            {user ? myTickets : 0}
          </p>
          {!user ? (
            <Link
              href="/login"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-surface/10 py-3 font-label text-label-bold text-on-primary backdrop-blur-sm transition-colors hover:bg-surface/20"
            >
              Sign in to see yours
            </Link>
          ) : null}
        </div>

        <div className="rounded-3xl bg-surface-container p-6 shadow-sm">
          <p className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Entry closes in
          </p>
          {cd ? (
            <div className="num mt-3 flex gap-2">
              {[
                { v: cd.days, l: "Days" },
                { v: cd.hours, l: "Hrs" },
                { v: cd.mins, l: "Min" },
              ].map((b) => (
                <div key={b.l} className="flex flex-col items-center rounded-lg bg-surface px-3 py-2">
                  <span className="font-headline text-headline-sm text-on-surface">{b.v}</span>
                  <span className="font-label text-[9px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    {b.l}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 font-headline text-headline-sm text-on-surface">Closed</p>
          )}
        </div>

        <div className="rounded-3xl bg-surface-container p-6 shadow-sm">
          <p className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Draw date
          </p>
          <p className="mt-2 font-headline text-headline-md text-on-surface">{dateFmt(c.draw_date)}</p>
          <p className="mt-1 font-body text-sm text-on-surface-variant">
            Drawn physically and recorded on video.
          </p>
        </div>
      </div>

      <h2 className="mb-4 font-headline text-headline-md text-on-background">Prizes</h2>
      <div className="mb-10 flex flex-col gap-3">
        {prizes.map((p: any) => (
          <div
            key={p.position}
            className="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container font-headline text-on-secondary-container">
                {p.position}
              </div>
              <span className="font-headline text-headline-sm text-on-surface">{p.title}</span>
            </div>
            <span className="num font-headline text-headline-sm text-secondary">
              {winnn(p.value_cents)} W
            </span>
          </div>
        ))}
      </div>

      <h2 className="mb-4 font-headline text-headline-md text-on-background">How to enter</h2>
      <div className="mb-10 grid grid-cols-1 gap-gutter md:grid-cols-2">
        {c.type !== "OFFLINE" ? (
          <div className="flex flex-col rounded-3xl bg-surface-container-lowest p-8 shadow-md">
            <span className="material-symbols-outlined mb-4 text-[40px] text-primary">smartphone</span>
            <h3 className="mb-2 font-headline text-headline-sm text-on-surface">Online</h3>
            <p className="mb-6 flex-1 font-body text-body-md text-on-surface-variant">
              Choose how many tickets you want. You pay {winnn(c.ticket_price_cents)} Winnn per ticket, and
              that full amount lands in your wallet to spend in the store.
            </p>
            <Link
              href="/wallet"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface"
            >
              Buy tickets
            </Link>
          </div>
        ) : null}

        {c.type !== "ONLINE" ? (
          <div className="flex flex-col rounded-3xl bg-surface-container-lowest p-8 shadow-md">
            <span className="material-symbols-outlined mb-4 text-[40px] text-secondary">storefront</span>
            <h3 className="mb-2 font-headline text-headline-sm text-on-surface">In store</h3>
            <p className="mb-6 flex-1 font-body text-body-md text-on-surface-variant">
              Shop with a participating business and they hand you a physical voucher. Enter the serial and
              code in your wallet to turn it into a ticket.
            </p>
            <Link
              href="/wallet"
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/40 py-4 font-label text-label-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container-low"
            >
              Enter a voucher
            </Link>
          </div>
        ) : null}
      </div>

      {merchants.length > 0 ? (
        <div className="mb-10">
          <h2 className="mb-4 font-headline text-headline-md text-on-background">
            Participating businesses
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {merchants.map((cm: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-variant text-on-surface-variant">
                    <span className="material-symbols-outlined">storefront</span>
                  </div>
                  <div>
                    <p className="font-label text-label-bold text-on-surface">
                      {cm.merchants ? cm.merchants.name : null}
                    </p>
                    <p className="font-body text-sm text-on-surface-variant">
                      {cm.merchants ? cm.merchants.address : null}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-surface-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  {cm.merchants ? cm.merchants.category : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {c.terms ? (
        <div className="rounded-3xl bg-surface-container p-8">
          <h2 className="mb-3 font-headline text-headline-sm text-on-surface">Terms and conditions</h2>
          <p className="font-body text-body-md leading-relaxed text-on-surface-variant">{c.terms}</p>
        </div>
      ) : null}
    </div>
  );
}
