"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Address = {
  id?: string;
  label?: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  area?: string;
  notes?: string;
  is_default?: boolean;
};

const BLANK: Address = {
  full_name: "", phone: "", line1: "", line2: "", city: "", area: "", notes: "", label: "",
};

const F =
  "w-full rounded-xl border-none bg-surface-container px-4 py-3 font-body text-body-md text-on-surface ring-1 ring-outline-variant/30 placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary";

const ERRORS: any = {
  ERR_NAME_REQUIRED: "Enter the name of the person receiving the order.",
  ERR_PHONE_REQUIRED: "A phone number is required for delivery.",
  ERR_ADDRESS_REQUIRED: "Enter the street address.",
  ERR_CITY_REQUIRED: "Enter the city.",
  ERR_NOT_AUTHENTICATED: "Please sign in first.",
};

export default function AddressForm(props: {
  initial?: Address | null;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [a, setA] = useState<Address>(props.initial || { ...BLANK });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: keyof Address, v: any) { setA({ ...a, [k]: v }); }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await supabaseBrowser().rpc("fn_save_address", { p: a });
    setBusy(false);
    if (res.error) {
      const k = Object.keys(ERRORS).find((x) => res.error!.message.indexOf(x) > -1);
      setErr(k ? ERRORS[k] : res.error.message);
      return;
    }
    props.onSaved({ ...a, id: (res.data as any).id });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
            Full name
          </label>
          <input className={F} value={a.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
            Phone
          </label>
          <input className={F} type="tel" placeholder="+961 ..." value={a.phone}
            onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
          Street address
        </label>
        <input className={F} placeholder="Street, building, floor" value={a.line1}
          onChange={(e) => set("line1", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
            City
          </label>
          <input className={F} placeholder="Beirut" value={a.city}
            onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
            Area <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input className={F} placeholder="Hamra" value={a.area || ""}
            onChange={(e) => set("area", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
          Delivery notes <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <input className={F} placeholder="Near the pharmacy, ring twice" value={a.notes || ""}
          onChange={(e) => set("notes", e.target.value)} />
      </div>

      {!props.compact ? (
        <div>
          <label className="mb-1.5 block font-label text-label-bold text-on-surface-variant">
            Label <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input className={F} placeholder="Home, Office" value={a.label || ""}
            onChange={(e) => set("label", e.target.value)} />
        </div>
      ) : null}

      {err ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-container p-4 text-on-error-container">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="font-body text-body-md">{err}</p>
        </div>
      ) : null}

      <div className="flex gap-3">
        <button onClick={save} disabled={busy}
          className="flex-1 rounded-xl bg-primary py-3.5 font-label text-label-bold uppercase tracking-widest text-on-primary disabled:opacity-40">
          {busy ? "Saving" : "Save address"}
        </button>
        {props.onCancel ? (
          <button onClick={props.onCancel}
            className="rounded-xl border border-outline-variant/40 px-5 font-label text-label-bold text-on-surface">
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
