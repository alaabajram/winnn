"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD, Field, Card, Btn, Pill, statusTone, Banner, cleanError } from "./ui";
import { winnn, dateFmt } from "@/lib/format";
import { toCents } from "@/lib/money";

const EMPTY: any = {
  id: "", name: "", slug: "", description: "", category_id: "", price: "",
  stock: "0", sku: "", status: "DRAFT", is_featured: false,
  meta_title: "", meta_description: "", image1: "", image2: "", image3: "",
};

export default function StoreClient(props: { products: any[]; cats: any[]; orders: any[] }) {
  const [tab, setTab] = useState<"products" | "categories" | "orders">("products");
  const [products, setProducts] = useState<any[]>(props.products);
  const [cats, setCats] = useState<any[]>(props.cats);
  const [form, setForm] = useState<any>(null);
  const [catForm, setCatForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  function set(k: string, v: any) { setForm({ ...form, [k]: v }); }

  async function saveProduct() {
    setBusy(true);
    setMsg(null);
    const images = [form.image1, form.image2, form.image3].filter((x: string) => x && x.trim());
    const payload = {
      id: form.id || null,
      name: form.name,
      slug: form.slug || null,
      description: form.description,
      category_id: form.category_id || null,
      price_cents: String(toCents(form.price)),
      stock: String(form.stock || 0),
      sku: form.sku,
      status: form.status,
      is_featured: form.is_featured,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      images,
    };
    const res = await supabaseBrowser().rpc("fn_admin_upsert_product", { p: payload });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setMsg({ kind: "ok", text: "Product saved." });
    setForm(null);
    const fresh = await supabaseBrowser().from("products").select("*").order("created_at", { ascending: false });
    setProducts((fresh.data as any[]) || []);
    router.refresh();
  }

  async function saveCat() {
    setBusy(true);
    const res = await supabaseBrowser().rpc("fn_admin_upsert_category", { p: catForm });
    setBusy(false);
    if (res.error) { setMsg({ kind: "error", text: cleanError(res.error.message) }); return; }
    setCatForm(null);
    const fresh = await supabaseBrowser().from("product_categories").select("*").order("sort_order");
    setCats((fresh.data as any[]) || []);
    router.refresh();
  }

  if (form) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setForm(null)} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display text-display-sm text-on-background">
            {form.id ? "Edit product" : "New product"}
          </h1>
        </div>

        {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

        <Card title="Product">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Name" wide>
              <input className={FIELD} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Description" wide>
              <textarea className={FIELD} rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Category">
              <select className={FIELD} value={form.category_id || ""} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Uncategorised</option>
                {props.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="SKU">
              <input className={FIELD} value={form.sku || ""} onChange={(e) => set("sku", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Price and stock">
          <div className="mb-5 rounded-xl bg-primary-container p-4">
            <p className="font-body text-body-md text-on-primary-container">
              Customers pay in <span className="font-semibold text-secondary-fixed">Winnn</span>, taken
              from their wallet at checkout. 1 Winnn = 1 USD. Enter the price in Winnn.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Price (Winnn)">
              <input className={FIELD + " num"} inputMode="decimal" placeholder="45.00"
                value={form.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label="Stock">
              <input className={FIELD + " num"} inputMode="numeric" value={form.stock}
                onChange={(e) => set("stock", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={FIELD} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
          </div>
          <label className="mt-5 flex items-center gap-3">
            <input type="checkbox" className="h-5 w-5 rounded" checked={!!form.is_featured}
              onChange={(e) => set("is_featured", e.target.checked)} />
            <span className="font-body text-body-md text-on-surface">Feature on the store front page</span>
          </label>
        </Card>

        <Card title="Images">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {["image1", "image2", "image3"].map((k, i) => (
              <Field key={k} label={"Image " + (i + 1) + (i === 0 ? " (main)" : "")}>
                <input className={FIELD} placeholder="https://" value={form[k] || ""}
                  onChange={(e) => set(k, e.target.value)} />
              </Field>
            ))}
          </div>
          <p className="mt-3 font-body text-sm text-on-surface-variant">
            Leave blank to use the generated gradient tile.
          </p>
        </Card>

        <Card title="Search listing">
          <div className="grid grid-cols-1 gap-5">
            <Field label="Meta title" hint="Under 60 characters. Falls back to the product name.">
              <input className={FIELD} value={form.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} />
            </Field>
            <Field label="Meta description" hint="Under 160 characters.">
              <textarea className={FIELD} rows={2} value={form.meta_description || ""}
                onChange={(e) => set("meta_description", e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Btn onClick={saveProduct} disabled={busy || !form.name || toCents(form.price) <= 0}>
            {busy ? "Saving" : "Save product"}
          </Btn>
          <Btn tone="ghost" onClick={() => setForm(null)}>Cancel</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-on-background">Store</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">
            Products priced in Winnn. Customers check out from their wallet balance.
          </p>
        </div>
        {tab === "products" ? (
          <Btn onClick={() => { setForm({ ...EMPTY }); setMsg(null); }}>New product</Btn>
        ) : null}
        {tab === "categories" ? (
          <Btn onClick={() => setCatForm({ id: "", name: "", sort_order: "0", is_active: true })}>
            New category
          </Btn>
        ) : null}
      </div>

      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}

      <div className="flex gap-2 rounded-xl bg-surface-container p-1">
        {(["products", "categories", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-lg py-2.5 font-label text-label-bold capitalize transition-colors " +
              (tab === t ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {catForm ? (
        <Card title={catForm.id ? "Edit category" : "New category"}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Name">
              <input className={FIELD} value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </Field>
            <Field label="Sort order">
              <input className={FIELD + " num"} value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <label className="flex items-center gap-3 pb-3">
                <input type="checkbox" className="h-5 w-5" checked={!!catForm.is_active}
                  onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} />
                <span className="font-body text-body-md">Active</span>
              </label>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Btn onClick={saveCat} disabled={busy || !catForm.name}>Save</Btn>
            <Btn tone="ghost" onClick={() => setCatForm(null)}>Cancel</Btn>
          </div>
        </Card>
      ) : null}

      {tab === "products" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-headline text-headline-sm text-on-surface">{p.name}</p>
                  <p className="num font-body text-body-md text-secondary">{winnn(p.price_cents)} Winnn</p>
                </div>
                <Pill tone={statusTone(p.status)}>{p.status}</Pill>
              </div>
              <div className="mb-4 flex gap-4 font-body text-sm text-on-surface-variant">
                <span className="num">{p.stock} in stock</span>
                {p.is_featured ? <span className="text-secondary">Featured</span> : null}
                {p.sku ? <span className="num">{p.sku}</span> : null}
              </div>
              <button
                onClick={() => {
                  const imgs: any[] = (p.images as any[]) || [];
                  setForm({
                    ...EMPTY, ...p,
                    price: (Number(p.price_cents) / 100).toString(),
                    stock: String(p.stock),
                    image1: imgs[0] || "", image2: imgs[1] || "", image3: imgs[2] || "",
                  });
                  setMsg(null);
                }}
                className="rounded-lg border border-outline-variant/40 px-3 py-2 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
              >
                Edit
              </button>
            </div>
          ))}
          {!products.length ? (
            <p className="py-12 text-center font-body text-body-md text-on-surface-variant">No products yet.</p>
          ) : null}
        </div>
      ) : null}

      {tab === "categories" ? (
        <Card>
          <div className="divide-y divide-outline-variant/20">
            {cats.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-label text-label-bold text-on-surface">{c.name}</p>
                  <p className="num font-body text-sm text-on-surface-variant">
                    Order {c.sort_order} {c.is_active ? "" : " / hidden"}
                  </p>
                </div>
                <button
                  onClick={() => setCatForm({ ...c, sort_order: String(c.sort_order) })}
                  className="rounded-lg border border-outline-variant/40 px-3 py-1.5 font-label text-[12px] font-semibold text-on-surface hover:bg-surface-container"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "orders" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  {["Order", "Customer", "Items", "Total", "Status", "Date"].map((h) => (
                    <th key={h} className="pb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {props.orders.map((o) => {
                  const items: any[] = (o.order_items as any[]) || [];
                  return (
                    <tr key={o.id}>
                      <td className="num py-4 font-label text-label-bold text-on-surface">{o.order_no}</td>
                      <td className="py-4 font-body text-body-md text-on-surface">
                        {o.profiles ? (o.profiles.full_name || o.profiles.email) : "-"}
                      </td>
                      <td className="py-4 font-body text-sm text-on-surface-variant">
                        {items.length ? items[0].name_snapshot : "-"}
                        {items.length > 1 ? " +" + (items.length - 1) : ""}
                      </td>
                      <td className="num py-4 font-label text-label-bold text-on-surface">{winnn(o.total_cents)} W</td>
                      <td className="py-4"><Pill tone={statusTone(o.status)}>{o.status}</Pill></td>
                      <td className="num py-4 font-body text-sm text-on-surface-variant">{dateFmt(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!props.orders.length ? (
            <p className="py-12 text-center font-body text-body-md text-on-surface-variant">
              No orders yet. Checkout is wired to the wallet but has no customer-facing cart yet.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
