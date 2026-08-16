"use client";
import Link from "next/link";
import { useState } from "react";

type Step = {
  n: number;
  title: string;
  body: string;
  icon: string;
  tone: string;      // card background
  text: string;      // text colour on that card
  screen: "campaign" | "tickets" | "draw" | "store" | "voucher" | "scan";
  detail: string[];
};

const ONLINE: Step[] = [
  {
    n: 1, title: "Choose a campaign and buy tickets", icon: "campaign",
    tone: "bg-primary-container", text: "text-on-primary",
    screen: "campaign",
    body: "Pick the draw you want to enter and how many tickets. You pay the ticket price in Winnn.",
    detail: [
      "Every campaign sets its own price per ticket",
      "The full amount you pay lands in your wallet as Winnn",
      "1 Winnn = 1 USD",
    ],
  },
  {
    n: 2, title: "Your tickets appear instantly", icon: "confirmation_number",
    tone: "bg-secondary-container", text: "text-on-secondary-container",
    screen: "tickets",
    body: "Each ticket gets a printed serial number. They sit in your wallet until the draw.",
    detail: [
      "Serials look like SUM26-500123",
      "Visible any time under Wallet",
      "Nothing expires before the draw date",
    ],
  },
  {
    n: 3, title: "Spend your Winnn in the store", icon: "shopping_bag",
    tone: "bg-tertiary-container", text: "text-tertiary-fixed",
    screen: "store",
    body: "The credits you paid are still yours. Buy real products with them, and your tickets stay valid.",
    detail: [
      "Spending credits never cancels a ticket",
      "Paid straight from your wallet, no card needed",
      "Stock and prices are checked at checkout",
    ],
  },
  {
    n: 4, title: "Watch the draw and see if you won", icon: "emoji_events",
    tone: "bg-surface-tint", text: "text-on-primary",
    screen: "draw",
    body: "Online serials are printed and put into the same physical drum as the in-store tickets.",
    detail: [
      "The draw is physical, recorded on video",
      "Winning serial and ticket counts are published",
      "Losing tickets move to your activity history",
    ],
  },
];

const OFFLINE: Step[] = [
  {
    n: 1, title: "Shop at a participating business", icon: "storefront",
    tone: "bg-primary-container", text: "text-on-primary",
    screen: "voucher",
    body: "Buy something at a partner shop and they hand you a printed Winnn voucher. No purchase of credits.",
    detail: [
      "Each business decides when it gives a voucher",
      "Nothing to install or sign up for in the shop",
      "The voucher is free with your purchase",
    ],
  },
  {
    n: 2, title: "Keep your half of the voucher", icon: "content_cut",
    tone: "bg-secondary-container", text: "text-on-secondary-container",
    screen: "voucher",
    body: "The voucher tears in two. The shop keeps one half for the drum, you keep the half with the secret code.",
    detail: [
      "Your half carries the serial and a secret code",
      "The shop's half goes into the physical drum",
      "Keep it safe, it is your proof of the ticket",
    ],
  },
  {
    n: 3, title: "Add it to your wallet", icon: "qr_code_scanner",
    tone: "bg-tertiary-container", text: "text-tertiary-fixed",
    screen: "scan",
    body: "Open Winnn, enter the serial and code from your voucher, and it becomes a digital ticket.",
    detail: [
      "Both the serial and the code are required",
      "Each voucher can only be added once",
      "You can check it any time under Wallet",
    ],
  },
  {
    n: 4, title: "Same drum, same draw", icon: "emoji_events",
    tone: "bg-surface-tint", text: "text-on-primary",
    screen: "draw",
    body: "In-store tickets go into exactly the same drum as the online ones. One pool, one draw.",
    detail: [
      "No separate draw for in-store entries",
      "If your voucher wins before you add it, claim it with your half",
      "Ticket counts from both routes are published",
    ],
  },
];

function Phone(props: { screen: Step["screen"] }) {
  const s = props.screen;
  return (
    <div className="relative mx-auto w-[190px] shrink-0 sm:w-[210px]">
      <div className="rounded-[28px] border-[6px] border-[#111] bg-surface shadow-2xl">
        <div className="relative h-[380px] overflow-hidden rounded-[22px] bg-background">
          <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-[#111]" />

          <div className="flex items-center justify-between border-b border-outline-variant/30 px-3 pb-2 pt-7">
            <span className="font-headline text-[11px] uppercase tracking-widest text-on-surface">
              Winnn
            </span>
            <span className="num rounded-full bg-primary-container px-2 py-0.5 font-label text-[9px] text-secondary-fixed">
              250 W
            </span>
          </div>

          <div className="space-y-2 p-3">
            {s === "campaign" ? (
              <>
                <div className="relative h-24 overflow-hidden rounded-lg bg-primary-container p-2">
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-secondary/30 blur-xl" />
                  <p className="font-label text-[8px] uppercase tracking-widest text-secondary-fixed">
                    Summer Mega Draw
                  </p>
                  <p className="mt-1 font-display text-[18px] leading-tight text-on-primary">
                    Win $100,000
                  </p>
                  <p className="num mt-1 font-label text-[8px] text-primary-fixed-dim">
                    Closes in 04d 12h
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container p-2">
                  <p className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant">
                    Tickets
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 5, 10].map((n) => (
                        <span key={n}
                          className={"num rounded px-2 py-1 font-label text-[9px] " +
                            (n === 5 ? "bg-primary text-on-primary" : "bg-surface text-on-surface-variant")}>
                          {n}
                        </span>
                      ))}
                    </div>
                    <span className="num font-label text-[10px] font-semibold text-on-surface">50 W</span>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary-container py-2 text-center font-label text-[9px] font-semibold uppercase tracking-widest text-on-secondary-container">
                  Buy 5 tickets
                </div>
              </>
            ) : null}

            {s === "tickets" ? (
              <>
                <p className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant">
                  Your tickets
                </p>
                {["SUM26-500118", "SUM26-500119", "SUM26-500120"].map((t) => (
                  <div key={t} className="relative flex items-center gap-2 overflow-hidden rounded-lg bg-surface-container-lowest p-2 shadow-sm">
                    <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-background" />
                    <div className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-background" />
                    <div className="h-8 w-8 rounded bg-primary-container" />
                    <div>
                      <p className="num font-label text-[9px] font-semibold text-on-surface">{t}</p>
                      <p className="font-label text-[7px] uppercase tracking-widest text-secondary">
                        Online
                      </p>
                    </div>
                  </div>
                ))}
              </>
            ) : null}

            {s === "store" ? (
              <>
                <div className="rounded-lg bg-primary-container p-2">
                  <p className="font-label text-[7px] uppercase tracking-widest text-on-primary-container">
                    Balance
                  </p>
                  <p className="num font-display text-[20px] text-secondary-fixed">250</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Earbuds", "Coffee 1kg"].map((n) => (
                    <div key={n} className="rounded-lg bg-surface-container-lowest p-2 shadow-sm">
                      <div className="mb-1 h-10 rounded bg-surface-variant" />
                      <p className="font-label text-[8px] text-on-surface">{n}</p>
                      <p className="num font-label text-[9px] font-semibold text-secondary">45 W</p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {s === "draw" ? (
              <>
                <div className="relative h-24 overflow-hidden rounded-lg bg-[#111]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px] text-white/80">
                      play_circle
                    </span>
                  </div>
                  <span className="absolute bottom-1 left-2 font-label text-[7px] uppercase tracking-widest text-white/70">
                    Draw video
                  </span>
                </div>
                <div className="rounded-lg bg-primary-container p-2">
                  <p className="font-label text-[7px] uppercase tracking-widest text-on-primary-container">
                    Winning ticket
                  </p>
                  <p className="num font-headline text-[13px] tracking-widest text-secondary-fixed">
                    SUM26-004821
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[["Online", "5"], ["Store", "100"], ["Total", "105"]].map(([l, v]) => (
                    <div key={l} className="rounded bg-surface-container p-1">
                      <p className="font-label text-[6px] uppercase text-on-surface-variant">{l}</p>
                      <p className="num font-label text-[10px] font-semibold text-on-surface">{v}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {s === "voucher" ? (
              <div className="pt-4">
                <div className="relative rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest p-3">
                  <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
                  <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
                  <p className="font-label text-[7px] uppercase tracking-widest text-secondary">
                    Customer copy
                  </p>
                  <p className="num mt-1 font-headline text-[13px] tracking-widest text-on-surface">
                    SUM26-004821
                  </p>
                  <p className="num mt-1 font-label text-[8px] text-on-surface-variant">
                    CODE 7A3F 9C21
                  </p>
                  <div className="mt-2 h-10 w-10 rounded bg-[#111]" />
                </div>
                <p className="mt-2 text-center font-label text-[7px] uppercase tracking-widest text-on-surface-variant">
                  tear here
                </p>
                <div className="mt-1 rounded-lg bg-surface-container p-2 opacity-60">
                  <p className="font-label text-[7px] uppercase tracking-widest text-on-surface-variant">
                    Store copy - goes in the drum
                  </p>
                  <p className="num mt-1 font-label text-[10px] text-on-surface">SUM26-004821</p>
                </div>
              </div>
            ) : null}

            {s === "scan" ? (
              <>
                <p className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant">
                  Redeem voucher
                </p>
                <div className="rounded-lg bg-surface-container p-2">
                  <p className="num font-label text-[9px] text-on-surface">SUM26-004821</p>
                </div>
                <div className="rounded-lg bg-surface-container p-2">
                  <p className="num font-label text-[9px] text-on-surface">7A3F9C21</p>
                </div>
                <div className="rounded-lg bg-primary py-2 text-center font-label text-[9px] font-semibold uppercase tracking-widest text-on-primary">
                  Add ticket
                </div>
                <div className="rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed/20 p-2">
                  <p className="font-label text-[9px] font-semibold text-on-tertiary-fixed">
                    Ticket added
                  </p>
                  <p className="font-label text-[7px] text-on-surface-variant">
                    Abou Hassan Restaurant
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks(props: { merchants: any[]; hasLive: boolean }) {
  const [path, setPath] = useState<"online" | "offline">("online");
  const [active, setActive] = useState(1);
  const steps = path === "online" ? ONLINE : OFFLINE;
  const step = steps.find((s) => s.n === active) || steps[0];

  function switchPath(p: "online" | "offline") {
    setPath(p);
    setActive(1);
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10 text-center">
        <span className="inline-block rounded-full bg-tertiary-fixed px-6 py-2 font-headline text-headline-sm uppercase tracking-widest text-on-tertiary-fixed">
          How it works
        </span>
        <h1 className="mx-auto mt-6 max-w-2xl font-display text-display-sm text-on-background sm:text-display-lg">
          Two ways in. One drum.
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-body text-body-lg text-on-surface-variant">
          Buy Winnn credits online, or pick up a free voucher when you shop with a partner business.
          Both routes put a ticket in the same physical draw.
        </p>
      </header>

      <div className="mx-auto mb-10 flex w-full max-w-md rounded-2xl bg-surface-container p-1.5">
        {([
          { k: "online", label: "Online", icon: "smartphone" },
          { k: "offline", label: "In store", icon: "storefront" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => switchPath(t.k)}
            className={
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-label text-label-bold uppercase tracking-widest transition-all " +
              (path === t.k
                ? "bg-primary-container text-secondary-fixed shadow-lg"
                : "text-on-surface-variant hover:text-on-surface")
            }
          >
            <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-10 grid grid-cols-4 gap-2 sm:gap-3">
        {steps.map((s) => (
          <button
            key={s.n}
            onClick={() => setActive(s.n)}
            className="group flex flex-col items-start gap-2 text-left"
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className={
                  "h-full rounded-full transition-all duration-500 " +
                  (s.n <= active ? "w-full bg-secondary" : "w-0")
                }
              />
            </div>
            <span
              className={
                "font-label text-[10px] font-semibold uppercase tracking-widest transition-colors sm:text-[11px] " +
                (s.n === active ? "text-on-surface" : "text-on-surface-variant")
              }
            >
              Step {s.n}
            </span>
          </button>
        ))}
      </div>

      <div
        className={
          "relative mb-8 overflow-hidden rounded-[28px] p-6 shadow-2xl transition-colors duration-500 sm:p-10 " +
          step.tone
        }
      >
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-14">
          <div className={"flex flex-1 flex-col justify-center " + step.text}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <span className="material-symbols-outlined">{step.icon}</span>
              </span>
              <span className="rounded-full bg-white/15 px-4 py-1.5 font-label text-label-bold uppercase tracking-widest backdrop-blur-sm">
                Step {step.n}
              </span>
            </div>

            <h2 className="font-display text-[28px] leading-tight sm:text-display-sm">{step.title}</h2>
            <p className="mt-4 max-w-md font-body text-body-lg opacity-90">{step.body}</p>

            <ul className="mt-6 space-y-2.5">
              {step.detail.map((d) => (
                <li key={d} className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] opacity-80">check</span>
                  <span className="font-body text-body-md opacity-90">{d}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setActive(Math.max(1, active - 1))}
                disabled={active === 1}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm transition-opacity disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              {active < 4 ? (
                <button
                  onClick={() => setActive(active + 1)}
                  className="flex items-center gap-2 rounded-xl bg-white/15 px-5 font-label text-label-bold uppercase tracking-widest backdrop-blur-sm"
                >
                  Next step
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              ) : (
                <Link
                  href={path === "online" ? "/" : "/wallet"}
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-label text-label-bold uppercase tracking-widest text-on-surface"
                >
                  {path === "online" ? "See campaigns" : "Add a voucher"}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>

          <Phone screen={step.screen} />
        </div>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-4">
        {steps.map((s) => (
          <button
            key={s.n}
            onClick={() => setActive(s.n)}
            className={
              "rounded-2xl border p-5 text-left transition-all " +
              (s.n === active
                ? "border-primary bg-surface-container-lowest shadow-md"
                : "border-outline-variant/30 bg-surface hover:border-outline")
            }
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="num font-display text-headline-md text-on-surface-variant">
                0{s.n}
              </span>
              <span className="material-symbols-outlined text-on-surface-variant">{s.icon}</span>
            </div>
            <p className="font-headline text-[15px] leading-snug text-on-surface">{s.title}</p>
          </button>
        ))}
      </div>

      <section className="mb-12 rounded-[28px] bg-primary-container p-8 text-on-primary-container sm:p-12">
        <h2 className="font-display text-display-sm text-on-primary">One drum, both routes</h2>
        <p className="mt-4 max-w-2xl font-body text-body-lg text-on-primary-container">
          This is the part people ask about most. Tickets bought online are printed onto slips after
          entries close, and go into the same physical drum as the store copies collected from partner
          businesses. Nobody is drawn by a computer.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { i: "smartphone", t: "Online tickets", d: "Printed after entries close" },
            { i: "storefront", t: "Store copies", d: "Collected from each business" },
            { i: "featured_seasonal_and_gifts", t: "One drum", d: "Drawn on camera, counts published" },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl bg-surface/10 p-5 backdrop-blur-sm">
              <span className="material-symbols-outlined text-secondary-fixed">{x.i}</span>
              <p className="mt-3 font-headline text-headline-sm text-on-primary">{x.t}</p>
              <p className="mt-1 font-body text-body-md text-on-primary-container">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {props.merchants.length ? (
        <section className="mb-12">
          <h2 className="mb-2 font-display text-headline-md text-on-background">
            Where to find vouchers
          </h2>
          <p className="mb-6 font-body text-body-md text-on-surface-variant">
            Partner businesses hand out vouchers with a qualifying purchase. Each decides its own rule.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {props.merchants.map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                {m.logo_url ? (
                  <img src={m.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-secondary-fixed">
                    <span className="font-display">{m.name.slice(0, 1)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-label text-label-bold text-on-surface">{m.name}</p>
                  <p className="truncate font-body text-sm text-on-surface-variant">
                    {m.address || m.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-12">
        <h2 className="mb-6 font-display text-headline-md text-on-background">Common questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "Do I lose my tickets if I spend my Winnn?",
              a: "No. Tickets are issued when you buy them and stay valid regardless of what you do with the credits afterwards. Spending in the store never cancels a ticket.",
            },
            {
              q: "Is the in-store voucher really free?",
              a: "Yes. Partner businesses give them out with a qualifying purchase at their own discretion. You do not buy Winnn credits to get one.",
            },
            {
              q: "What if I never scan my voucher and it wins?",
              a: "The store copy is still in the drum, so it can still be drawn. Hold on to your half: you claim the prize by entering the serial and secret code printed on it.",
            },
            {
              q: "How do I know the draw is fair?",
              a: "It is physical and recorded. After each draw we publish how many online tickets and how many store copies were in the drum, so the counts can be checked against the video.",
            },
            {
              q: "Can I get my money back?",
              a: "Winnn credits are spendable in the store and are not exchangeable for cash. If a store order arrives wrong or not at all, the value is returned to your wallet as Winnn.",
            },
          ].map((f) => (
            <details key={f.q} className="group rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-headline text-headline-sm text-on-surface">
                {f.q}
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                  expand_more
                </span>
              </summary>
              <p className="mt-3 font-body text-body-md leading-relaxed text-on-surface-variant">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-secondary-container p-8 text-center sm:p-12">
        <h2 className="font-display text-display-sm text-on-secondary-container">Ready to enter?</h2>
        <p className="mx-auto mt-3 max-w-md font-body text-body-lg text-on-secondary-container/80">
          {props.hasLive
            ? "There are live campaigns open right now."
            : "New campaigns open regularly. Check back soon."}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-xl bg-primary-container px-8 py-4 font-label text-label-bold uppercase tracking-widest text-on-primary">
            See campaigns
          </Link>
          <Link href="/wallet" className="rounded-xl bg-surface px-8 py-4 font-label text-label-bold uppercase tracking-widest text-on-surface">
            Add a voucher
          </Link>
        </div>
      </section>
    </div>
  );
}
