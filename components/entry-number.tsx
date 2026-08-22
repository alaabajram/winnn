"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const MESSAGES: any = {
  ERR_BAD_LENGTH: "A ticket number is 16 digits. Check you have typed them all.",
  ERR_INVALID_TICKET: "That number is not valid. Check it against your paper ticket.",
  ERR_NOT_A_VOUCHER: "ONLINE_TICKET",
  ERR_TICKET_ALREADY_REDEEMED: "ALREADY_ENTERED",
  ERR_TICKET_CANCELLED: "This ticket was cancelled.",
  ERR_TICKET_EXPIRED: "This ticket has expired.",
  ERR_CAMPAIGN_NOT_LIVE: "That draw is not open right now.",
  ERR_SALES_CLOSED: "Entries for that draw have closed.",
  ERR_CUSTOMER_TICKET_CAP: "You have reached the limit for that draw.",
  ERR_NOT_AUTHENTICATED: "Sign in to enter your ticket.",
};

/** 1234567890123456 -> "1234 5678 9012 3456" */
function group(v: string) {
  const d = v.replace(/[^0-9]/g, "").slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

export default function EntryNumber(props: { signedIn: boolean; campaignName?: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<any>(null);
  const [used, setUsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useSearchParams();

  // The QR on a printed voucher links to /?entry=NUMBER. Prefill and scroll
  // into view so a scan is one tap, not a retype.
  useEffect(() => {
    const e = params.get("entry");
    if (!e) return;
    const digits = e.replace(/[^0-9]/g, "").slice(0, 16);
    if (digits.length !== 16) return;
    setValue(group(digits));
    window.setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        inputRef.current.focus();
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const digits = value.replace(/[^0-9]/g, "");
  const complete = digits.length === 16;

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await supabaseBrowser().rpc("fn_register_entry", { p_number: digits });
    setBusy(false);
    if (res.error) {
      const k = Object.keys(MESSAGES).find((x) => res.error!.message.indexOf(x) > -1);
      const m = k ? MESSAGES[k] : "Something went wrong. Try again.";
      if (m === "ALREADY_ENTERED") {
        setUsed(true);
        setErr(null);
      } else if (m === "ONLINE_TICKET") {
        setErr(
          "That is a ticket you bought online. It is already in the drum, so there is nothing to double. This box is for the number printed on a paper voucher from a shop."
        );
      } else {
        setErr(m);
      }
      return;
    }
    setOk(res.data);
    setValue("");
    router.refresh();
  }

  if (ok) {
    return (
      <section className="overflow-hidden rounded-[24px] bg-tertiary-container p-8 text-center">
        <span className="material-symbols-outlined text-[44px] text-tertiary-fixed">how_to_reg</span>
        <h2 className="mt-3 font-display text-display-sm text-tertiary-fixed">
          You are in the drum twice
        </h2>
        <p className="mx-auto mt-3 max-w-md font-body text-body-lg text-tertiary-fixed-dim">
          Your shop copy was already entered. This adds a second slip, so your chance just doubled.
        </p>
        <p className="mt-4 font-headline text-headline-sm text-tertiary-fixed">{ok.campaign_name}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/wallet"
            className="rounded-xl bg-tertiary-fixed px-6 py-3.5 font-label text-label-bold uppercase tracking-widest text-on-tertiary-fixed">
            My tickets
          </Link>
          <button onClick={() => setOk(null)}
            className="rounded-xl bg-surface/10 px-6 py-3.5 font-label text-label-bold uppercase tracking-widest text-tertiary-fixed">
            Enter another
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-primary-container p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <span className="inline-block rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
            Double your chances
          </span>
          <h2 className="mt-3 font-display text-display-sm text-on-primary">
            Already have a ticket?
          </h2>
          <p className="mt-2 max-w-md font-body text-body-lg text-on-primary-container">
            Enter the 16-digit number printed on a paper voucher from a partner shop. The shop copy
            is already in the drum, and this adds a second slip with your name on it.
          </p>
          <p className="mt-2 font-body text-sm text-on-primary-container/70">
            The number knows which draw it belongs to, so there is nothing else to choose. Tickets
            you bought online are already counted and cannot be entered here.
          </p>
        </div>

        <div className="w-full lg:max-w-sm">
          {props.signedIn ? (
            <div className="space-y-3">
              <input
                ref={inputRef}
                className="num w-full rounded-xl border-none bg-surface px-4 py-4 text-center font-headline text-[22px] tracking-[0.15em] text-on-surface ring-1 ring-outline-variant/30 placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-secondary-fixed"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0000 0000 0000 0000"
                value={value}
                onChange={(e) => { setValue(group(e.target.value)); setErr(null); setUsed(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && complete) submit(); }}
              />

              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i}
                    className={
                      "h-1.5 w-10 rounded-full transition-colors " +
                      (digits.length >= (i + 1) * 4 ? "bg-secondary-fixed" : "bg-surface/20")
                    } />
                ))}
              </div>

              <button onClick={submit} disabled={busy || !complete}
                className="w-full rounded-xl bg-secondary-container py-4 font-label text-label-bold uppercase tracking-widest text-on-secondary-container disabled:opacity-40">
                {busy ? "Checking" : "Enter my ticket"}
              </button>

              {used ? (
                <div className="flex items-start gap-3 rounded-xl bg-secondary-container p-4">
                  <span className="material-symbols-outlined text-on-secondary-container">
                    task_alt
                  </span>
                  <div>
                    <p className="font-label text-label-bold text-on-secondary-container">
                      Already entered
                    </p>
                    <p className="font-body text-body-md text-on-secondary-container">
                      This ticket is in the drum twice already. Each number can only be entered once.
                    </p>
                  </div>
                </div>
              ) : null}

              {err ? (
                <p className="rounded-xl bg-error-container p-3 font-body text-body-md text-on-error-container">
                  {err}
                </p>
              ) : null}
            </div>
          ) : (
            <Link href="/login"
              className="block rounded-xl bg-secondary-container py-4 text-center font-label text-label-bold uppercase tracking-widest text-on-secondary-container">
              Sign in to enter
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
