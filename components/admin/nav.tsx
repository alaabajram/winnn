"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const GROUPS = [
  {
    label: "Operate",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/admin/campaigns", label: "Campaigns", icon: "campaign" },
      { href: "/admin/vouchers", label: "Vouchers", icon: "confirmation_number" },
      { href: "/admin/draws", label: "Draws", icon: "event_available" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/store", label: "Store", icon: "shopping_bag" },
      { href: "/admin/merchants", label: "Merchants", icon: "storefront" },
      { href: "/admin/invoices", label: "Invoices", icon: "receipt_long" },
      { href: "/admin/customers", label: "Customers", icon: "group" },
    ],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/seo", label: "SEO", icon: "travel_explore" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export default function AdminNav(props: { logoUrl?: string | null; siteName?: string | null }) {
  const brand = props.siteName || "Winnn";
  const path = usePathname();
  const [open, setOpen] = useState(false);

  function active(href: string, exact?: boolean) {
    if (exact) return path === href;
    return !!path && path.indexOf(href) === 0;
  }

  const body = (
    <>
      <div className="mb-10 flex items-center gap-3 px-6">
        {props.logoUrl ? (
          <img src={props.logoUrl} alt={brand} className="h-10 w-auto max-w-[140px] object-contain" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container">
            <span className="font-display text-headline-sm text-on-secondary-container">
              {brand.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        {!props.logoUrl ? (
          <div>
            <p className="font-headline text-headline-sm uppercase tracking-widest text-primary-fixed">
              {brand}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-primary-container">Admin</p>
          </div>
        ) : (
          <p className="text-[10px] uppercase tracking-widest text-on-primary-container">Admin</p>
        )}
      </div>

      <nav className="flex-1 space-y-6 px-3">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-2 px-3 font-label text-[10px] font-semibold uppercase tracking-widest text-on-primary-container/60">
              {g.label}
            </p>
            <div className="space-y-1">
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={
                    "flex items-center rounded-xl px-3 py-2.5 font-label text-label-bold transition-colors " +
                    (active(it.href, (it as any).exact)
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-on-primary-container hover:bg-surface-variant/10")
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-[20px]">{it.icon}</span>
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-secondary-fixed shadow-2xl lg:hidden"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-primary-container py-8">
            {body}
          </aside>
        </div>
      ) : null}

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-72 flex-col overflow-y-auto bg-primary-container py-8 lg:flex">
        {body}
      </aside>
    </>
  );
}
