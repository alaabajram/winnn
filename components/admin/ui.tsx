"use client";
import { useState } from "react";

export const FIELD =
  "w-full rounded-xl border-none bg-surface-container px-4 py-3 font-body text-body-md text-on-surface ring-1 ring-outline-variant/30 transition-shadow placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60";

export function Field(props: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={props.wide ? "sm:col-span-2" : ""}>
      <label className="mb-2 block font-label text-label-bold text-on-surface-variant">
        {props.label}
      </label>
      {props.children}
      {props.hint ? (
        <p className="mt-1.5 font-body text-sm text-on-surface-variant">{props.hint}</p>
      ) : null}
    </div>
  );
}

export function Card(props: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
      {props.title ? (
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-headline text-headline-sm text-on-surface">{props.title}</h2>
          {props.actions}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function Btn(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const tone = props.tone || "primary";
  const cls =
    tone === "primary"
      ? "bg-primary text-on-primary hover:bg-inverse-surface"
      : tone === "danger"
      ? "bg-error-container text-on-error-container hover:opacity-90"
      : "border border-outline-variant/40 text-on-surface hover:bg-surface-container";
  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={
        "rounded-xl px-5 py-3 font-label text-label-bold uppercase tracking-widest transition-colors disabled:opacity-40 " +
        cls
      }
    >
      {props.children}
    </button>
  );
}

export function Pill(props: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={
        "inline-block rounded-full px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest " +
        (props.tone || "bg-surface-container text-on-surface-variant")
      }
    >
      {props.children}
    </span>
  );
}

export { statusTone } from "@/lib/status";

export function Banner(props: { kind: "error" | "ok"; children: React.ReactNode }) {
  const ok = props.kind === "ok";
  return (
    <div
      className={
        "flex items-start gap-2 rounded-xl p-4 " +
        (ok ? "bg-tertiary-fixed/20 text-on-tertiary-fixed" : "bg-error-container text-on-error-container")
      }
    >
      <span className="material-symbols-outlined text-[20px]">{ok ? "check_circle" : "error"}</span>
      <p className="font-body text-body-md">{props.children}</p>
    </div>
  );
}

export function Section(props: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(props.open !== false);
  return (
    <div className="rounded-2xl border border-outline-variant/30">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4">
        <span className="font-headline text-headline-sm text-on-surface">{props.title}</span>
        <span className="material-symbols-outlined text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open ? <div className="border-t border-outline-variant/30 p-5">{props.children}</div> : null}
    </div>
  );
}

export function cleanError(msg: string) {
  if (msg.indexOf("ERR_INCOMPLETE:") > -1)
    return "Cannot go live. Still missing: " + msg.split("ERR_INCOMPLETE:")[1];
  const map: any = {
    ERR_NOT_AUTHORIZED: "You are not an admin.",
    ERR_NAME_REQUIRED: "Name is required.",
    ERR_INVALID_PRICE: "Enter a price greater than zero.",
    ERR_MERCHANT_REQUIRED: "Choose a merchant.",
    ERR_NO_ITEMS: "Add at least one line item.",
    ERR_ZERO_TOTAL: "The invoice total must be greater than zero.",
    ERR_CAMPAIGN_NOT_FOUND: "Campaign not found.",
    ERR_CAMPAIGN_NOT_LIVE: "That campaign is not live.",
    ERR_OFFLINE_SERIAL_BLOCK_EXHAUSTED: "This campaign has run out of offline serial numbers.",
    ERR_DRAW_NOT_OPEN: "This draw is not open for recording.",
    ERR_DRAW_NOT_RECORDED: "Record at least one pull first.",
    ERR_DRAW_NOT_CONFIRMED: "Confirm the draw before publishing.",
    ERR_NO_WINNERS_RECORDED: "No winners recorded yet.",
  };
  const k = Object.keys(map).find((x) => msg.indexOf(x) > -1);
  return k ? map[k] : msg;
}
