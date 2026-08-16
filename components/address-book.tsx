"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import AddressForm, { type Address } from "./address-form";

export default function AddressBook(props: { initial: Address[] }) {
  const [rows, setRows] = useState<Address[]>(props.initial || []);
  const [editing, setEditing] = useState<Address | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  async function reload() {
    const { data } = await supabaseBrowser()
      .from("customer_addresses").select("*").order("is_default", { ascending: false });
    setRows((data as any[]) || []);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this address?")) return;
    await supabaseBrowser().rpc("fn_delete_address", { p_id: id });
    reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between border-b-2 border-surface-variant pb-4">
        <div>
          <h2 className="font-display text-headline-md text-on-background">Delivery addresses</h2>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            Where store orders are sent.
          </p>
        </div>
        {!adding && !editing ? (
          <button onClick={() => setAdding(true)}
            className="font-label text-label-bold uppercase tracking-widest text-primary hover:underline">
            Add address
          </button>
        ) : null}
      </div>

      {adding || editing ? (
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <AddressForm
            initial={editing}
            onSaved={() => { setAdding(false); setEditing(null); reload(); }}
            onCancel={() => { setAdding(false); setEditing(null); }}
          />
        </div>
      ) : null}

      {!rows.length && !adding ? (
        <p className="font-body text-body-md text-on-surface-variant">
          No address saved yet. You will be asked for one at checkout.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((a) => (
          <div key={a.id} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-headline text-headline-sm text-on-surface">
                {a.label || a.full_name}
              </p>
              {a.is_default ? (
                <span className="rounded-full bg-secondary-container px-3 py-1 font-label text-[10px] font-semibold uppercase tracking-widest text-on-secondary-container">
                  Default
                </span>
              ) : null}
            </div>
            <p className="font-body text-body-md text-on-surface-variant">
              {[a.line1, a.line2, a.area, a.city].filter(Boolean).join(", ")}
            </p>
            <p className="num mt-1 font-body text-sm text-on-surface-variant">{a.phone}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditing(a)}
                className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container">
                Edit
              </button>
              <button onClick={() => remove(a.id as string)}
                className="rounded-lg px-3 py-1.5 font-label text-[12px] font-semibold text-error hover:bg-error-container">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
