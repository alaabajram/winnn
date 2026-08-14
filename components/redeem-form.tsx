"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const MESSAGES: any = {
  ERR_INVALID_TICKET: "That serial and code combination is not valid. Check both and try again.",
  ERR_TICKET_ALREADY_REDEEMED: "This voucher has already been added to a wallet.",
  ERR_TICKET_CANCELLED: "This voucher was cancelled and cannot be used.",
  ERR_TICKET_EXPIRED: "This voucher has expired.",
  ERR_CAMPAIGN_NOT_LIVE: "That campaign is not accepting entries right now.",
  ERR_SALES_CLOSED: "Entries for that campaign have closed.",
  ERR_CUSTOMER_TICKET_CAP: "You have reached the ticket limit for this campaign.",
  ERR_NOT_AUTHENTICATED: "Please sign in first.",
};

export default function RedeemForm() {
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
    const res = await supabaseBrowser().rpc("fn_redeem_offline_ticket", {
      p_serial: serial,
      p_code: code,
    });
    setBusy(false);
    if (res.error) {
      const keys = Object.keys(MESSAGES);
      let msg = "Something went wrong. Please try again.";
      for (let i = 0; i < keys.length; i++) {
        if (res.error.message.indexOf(keys[i]) > -1) { msg = MESSAGES[keys[i]]; break; }
      }
      setErr(msg);
      return;
    }
    setOk(res.data);
    setSerial("");
    setCode("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-surface-container p-8 shadow-md">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[28px] text-primary">qr_code_scanner</span>
        <h2 className="font-headline text-headline-md text-on-surface">Redeem voucher</h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <input
          className="num flex-1 rounded-xl border-none bg-surface px-6 py-4 font-label text-label-bold uppercase tracking-widest text-on-surface ring-1 ring-outline-variant/30 transition-shadow placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="SUM26-000123"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          autoCapitalize="characters"
        />
        <input
          className="num flex-1 rounded-xl border-none bg-surface px-6 py-4 font-label text-label-bold uppercase tracking-widest text-on-surface ring-1 ring-outline-variant/30 transition-shadow placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="VOUCHER CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
        />
        <button
          onClick={submit}
          disabled={busy || !serial || !code}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-8 py-4 font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface disabled:opacity-40"
        >
          {busy ? "Checking" : "Redeem"}
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>

      <p className="font-body text-sm text-on-surface-variant/70">
        Both the serial and the code are printed on your voucher. The code is what proves it is yours.
      </p>

      {err ? (
        <div className="flex items-start gap-3 rounded-xl bg-error-container p-4 text-on-error-container">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="font-body text-body-md">{err}</p>
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-xl border border-tertiary-fixed-dim bg-tertiary-fixed/20 p-4">
          <p className="flex items-center gap-2 font-headline text-headline-sm text-on-tertiary-fixed">
            <span className="material-symbols-outlined">check_circle</span>
            Ticket added
          </p>
          <p className="num mt-2 font-label text-label-bold text-on-surface">{ok.serial}</p>
          <p className="mt-1 font-body text-body-md text-on-surface-variant">
            {ok.campaign_name}
            {ok.merchant ? " / " + ok.merchant : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
