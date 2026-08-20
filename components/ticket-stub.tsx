"use client";
import Link from "next/link";
import { useState } from "react";
import { artFor } from "@/lib/art";

/**
 * A ticket that looks like a ticket.
 *
 * Real perforation, a torn edge, a stub carrying the count, and the serials
 * set in a monospaced block. The barcode is drawn from the serial itself so
 * two tickets never look the same.
 */
function Barcode(props: { seed: string }) {
  const bars: number[] = [];
  let n = 0;
  for (let i = 0; i < props.seed.length; i++) n = (n * 31 + props.seed.charCodeAt(i)) % 100000;
  for (let i = 0; i < 34; i++) {
    n = (n * 1103515245 + 12345) % 2147483648;
    bars.push(1 + (n % 3));
  }
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => (
        <span key={i}
          className="block h-full bg-on-surface/70"
          style={{ width: w + "px" }} />
      ))}
    </div>
  );
}

export default function TicketStub(props: {
  campaign: string;
  slug: string;
  drawDate: string;
  image: string | null;
  slips: number;
  online: number;
  offline: number;
  doubled: number;
  winner: boolean;
  onlineSerials: string[];
  offlineSerials: { serial: string; doubled: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const all = props.onlineSerials.length + props.offlineSerials.length;

  return (
    <div className="relative">
      {/* Body */}
      <div className="relative overflow-hidden rounded-[20px] bg-surface-container-lowest shadow-lg">
        <div className="flex">
          {/* Left: artwork */}
          <div className="relative w-28 shrink-0 sm:w-36">
            {props.image ? (
              <img src={props.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className={"h-full w-full " + artFor(props.slug)} />
            )}
            {props.winner ? (
              <span className="absolute left-2 top-2 rounded-full bg-secondary-container px-2 py-0.5 font-label text-[9px] font-semibold uppercase tracking-widest text-on-secondary-container">
                Winner
              </span>
            ) : null}
          </div>

          {/* Perforation */}
          <div className="relative w-0">
            <div className="absolute -left-[1px] top-0 h-full border-l-2 border-dashed border-outline-variant/50" />
            <span className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-background" />
            <span className="absolute -left-[9px] -bottom-2 h-4 w-4 rounded-full bg-background" />
          </div>

          {/* Middle: detail */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <p className="font-label text-[10px] font-semibold uppercase tracking-widest text-secondary">
              Draw ticket
            </p>
            <h2 className="mt-0.5 truncate font-headline text-headline-sm text-on-surface">
              {props.campaign}
            </h2>
            <p className="num mt-1 font-body text-sm text-on-surface-variant">
              Draw {props.drawDate}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {props.online ? (
                <span className="num rounded bg-surface-container px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  {props.online} bought
                </span>
              ) : null}
              {props.offline ? (
                <span className="num rounded bg-surface-container px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  {props.offline} voucher
                </span>
              ) : null}
              {props.doubled ? (
                <span className="num rounded bg-tertiary-fixed/30 px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-tertiary-fixed">
                  {props.doubled} doubled
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <Barcode seed={props.slug + props.slips} />
            </div>
          </div>

          {/* Right: stub */}
          <div className="relative flex w-20 shrink-0 flex-col items-center justify-center bg-primary-container px-2 sm:w-24">
            <span className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-background" />
            <span className="absolute -left-[9px] -bottom-2 h-4 w-4 rounded-full bg-background" />
            <span className="absolute left-0 top-0 h-full border-l-2 border-dashed border-surface/20" />

            <span className="num font-display text-[32px] leading-none text-secondary-fixed">
              {props.slips}
            </span>
            <span className="mt-1 text-center font-label text-[8px] font-semibold uppercase tracking-widest text-on-primary-container">
              {props.slips === 1 ? "slip in" : "slips in"}
              <br />
              the drum
            </span>
          </div>
        </div>
      </div>

      {all ? (
        <div className="px-1">
          <button
            onClick={() => setOpen(!open)}
            className="mt-2 flex w-full items-center justify-center gap-1 font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant hover:text-primary"
          >
            {open ? "Hide numbers" : "Show numbers"}
            <span className={
              "material-symbols-outlined text-[16px] transition-transform " + (open ? "rotate-180" : "")
            }>
              expand_more
            </span>
          </button>

          {open ? (
            <div className="mt-2 rounded-2xl bg-surface-container p-4">
              {props.onlineSerials.length ? (
                <div className="mb-3">
                  <p className="mb-1.5 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Bought online / already in the drum
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {props.onlineSerials.map((s) => (
                      <span key={s}
                        className="num rounded bg-surface px-2 py-1 font-label text-[11px] text-on-surface-variant">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {props.offlineSerials.length ? (
                <div>
                  <p className="mb-1.5 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    From a shop voucher
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {props.offlineSerials.map((o) => (
                      <span key={o.serial}
                        className={
                          "num rounded px-2 py-1 font-label text-[11px] " +
                          (o.doubled
                            ? "bg-tertiary-fixed/30 text-on-tertiary-fixed"
                            : "bg-surface text-on-surface-variant")
                        }>
                        {o.serial}{o.doubled ? " x2" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="mt-3 font-body text-sm text-on-surface-variant">
                Only paper vouchers from a shop can be entered to double. Tickets you bought are
                already counted.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
