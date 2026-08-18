"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const MESSAGES: any = {
  ERR_INVALID_TICKET: "That number and code do not match. Check both and try again.",
  ERR_TICKET_ALREADY_REDEEMED: "This voucher has already been registered.",
  ERR_TICKET_CANCELLED: "This voucher was cancelled.",
  ERR_TICKET_EXPIRED: "This voucher has expired.",
  ERR_CAMPAIGN_NOT_LIVE: "That campaign is not accepting entries right now.",
  ERR_SALES_CLOSED: "Entries for that campaign have closed.",
  ERR_CUSTOMER_TICKET_CAP: "You have reached the limit for this campaign.",
  ERR_NOT_AUTHENTICATED: "Sign in to register your voucher.",
};

const F =
  "w-full rounded-xl border-none bg-surface px-4 py-3.5 font-label text-label-bold uppercase tracking-widest text-on-surface ring-1 ring-outline-variant/30 placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary";

export default function VoucherEntry(props: { signedIn: boolean }) {
  const [serial, setSerial] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<any>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setErr(null);
    setOk(null);
    const res = await supabaseBrowser().rpc("fn_register_voucher", {
      p_serial: serial, p_code: code,
    });
    setBusy(false);
    if (res.error) {
      const k = Object.keys(MESSAGES).find((x) => res.error!.message.indexOf(x) > -1);
      setErr(k ? MESSAGES[k] : "Something went wrong. Try again.");
      return;
    }
    setOk(res.data);
    setSerial("");
    setCode("");
    router.refresh();
  }

  if (ok) {
    return (
      <div className="overflow-hidden rounded-[24px] bg-tertiary-container p-8 text-center">
        <span className="material-symbols-outlined text-[44px] text-tertiary-fixed">
          how_to_reg
        </span>
        <h2 className="mt-3 font-display text-display-sm text-tertiary-fixed">
          You are in the drum twice
        </h2>
        <p className="mx-auto mt-3 max-w-md font-body text-body-lg text-tertiary-fixed-dim">
          Your shop copy was already entered. Registering online adds a second slip, so your chance
          just doubled.
        </p>
        <p className="num mt-4 font-headline text-headline-sm text-tertiary-fixed">{ok.serial}</p>
        <p className="mt-1 font-body text-body-md text-tertiary-fixed-dim">{ok.campaign_name}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/wallet"
            className="rounded-xl bg-tertiary-fixed px-6 py-3.5 font-label text-label-bold uppercase tracking-widest text-on-tertiary-fixed">
            My tickets
          </Link>
          <button onClick={() => setOk(null)}
            className="rounded-xl bg-surface/10 px-6 py-3.5 font-label text-label-bold uppercase tracking-widest text-tertiary-fixed">
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-primary-container p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <span className="inline-block rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
            Double your chance
          </span>
          <h2 className="mt-3 font-display text-display-sm text-on-primary">
            Got a voucher from a shop?
          </h2>
          <p className="mt-2 max-w-md font-body text-body-lg text-on-primary-container">
            The shop keeps one half for the drum. Register your half here and we add a second slip.
          </p>
        </div>

        <div className="w-full lg:max-w-sm">
          {props.signedIn ? (
            <div className="space-y-3">
              <input className={F} placeholder="TICKET NUMBER" value={serial}
                onChange={(e) => { setSerial(e.target.value); setErr(null); }}
                autoCapitalize="characters" />
              <input className={F} placeholder="SECRET CODE" value={code}
                onChange={(e) => { setCode(e.target.value); setErr(null); }}
                autoCapitalize="characters" />
              <button onClick={submit} disabled={busy || !serial || !code}
                className="w-full rounded-xl bg-secondary-container py-4 font-label text-label-bold uppercase tracking-widest text-on-secondary-container disabled:opacity-40">
                {busy ? "Checking" : "Enter my ticket"}
              </button>
              {err ? (
                <p className="rounded-xl bg-error-container p-3 font-body text-body-md text-on-error-container">
                  {err}
                </p>
              ) : null}
            </div>
          ) : (
            <Link href="/login?next=/"
              className="block rounded-xl bg-secondary-container py-4 text-center font-label text-label-bold uppercase tracking-widest text-on-secondary-container">
              Sign in to register
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
