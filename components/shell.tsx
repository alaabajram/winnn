"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartButton from "./cart-button";

const NAV = [
  { href: "/", label: "Deals", icon: "local_offer" },
  { href: "/wallet", label: "Tickets", icon: "confirmation_number" },
  { href: "/how-it-works", label: "How", icon: "help" },
  { href: "/profile", label: "Profile", icon: "person" },
];

function isActive(path: string | null, href: string) {
  if (href === "/") return path === "/";
  return !!path && path.indexOf(href) === 0;
}

export default function Shell(props: {
  children: React.ReactNode;
  name: string | null;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  siteName?: string | null;
}) {
  const path = usePathname();
  const brand = props.siteName || "Winnn";

  // Routes that render their own chrome. Without this the admin sidebar and
  // the customer sidebar both mount and one covers the other.
  const BARE = ["/login", "/auth", "/admin"];
  const bare = !!path && BARE.some((p) => path === p || path.indexOf(p + "/") === 0);
  if (bare) return <>{props.children}</>;

  const Logo = (cls: string) =>
    props.logoUrl ? (
      <img src={props.logoUrl} alt={brand} className={cls} />
    ) : (
      <span className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container">
          <span className="font-display text-headline-sm text-on-secondary-container">
            {brand.slice(0, 1).toUpperCase()}
          </span>
        </span>
        <span className="font-headline text-headline-md uppercase tracking-widest text-primary-fixed">
          {brand}
        </span>
      </span>
    );

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col bg-primary-container py-8 shadow-2xl lg:flex">
        <Link href="/" className="mb-12 flex items-center px-6">
          {Logo("h-14 w-auto max-w-[190px] object-contain")}
        </Link>

        <nav className="flex-1 space-y-2 px-4">
          {NAV.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(path, it.href) ? "page" : undefined}
              className={
                "flex items-center rounded-xl px-4 py-3 transition-all " +
                (isActive(path, it.href)
                  ? "bg-secondary-container font-label text-label-bold text-on-secondary-container"
                  : "text-on-primary-container hover:bg-surface-variant/10")
              }
            >
              <span className="material-symbols-outlined mr-4">{it.icon}</span>
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="px-6 pt-6">
          <p className="text-[10px] uppercase tracking-widest text-on-primary-container/60">
            Draws are physical and recorded
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between gap-3 bg-surface/85 px-margin-mobile shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:left-64 lg:px-margin-desktop">
          <Link href="/" className="flex items-center lg:hidden">
            {props.logoUrl ? (
              <img
                src={props.logoUrl}
                alt={brand}
                className="h-12 w-auto max-w-[170px] object-contain"
              />
            ) : (
              <span className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container">
                  <span className="font-display text-headline-sm text-secondary-fixed">
                    {brand.slice(0, 1).toUpperCase()}
                  </span>
                </span>
                <span className="font-headline text-headline-sm uppercase tracking-widest text-on-surface">
                  {brand}
                </span>
              </span>
            )}
          </Link>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <CartButton />

            {props.name === null ? (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full bg-primary-container px-5 py-3 font-label text-label-bold uppercase tracking-widest text-secondary-fixed transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            ) : (
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-surface-container sm:pr-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container">
                  {props.avatarUrl ? (
                    <img src={props.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-headline-sm text-secondary-fixed">
                      {props.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[140px] truncate font-label text-label-bold text-on-surface">
                    {props.name.split("@")[0]}
                  </span>
                  <span className="block font-body text-[11px] text-on-surface-variant">
                    View profile
                  </span>
                </span>
              </Link>
            )}
          </div>
        </header>

        <main className="relative mx-auto min-h-screen max-w-[var(--container-max)] px-margin-mobile pb-24 pt-24 lg:px-margin-desktop lg:pb-12">
          {props.children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant/10 bg-surface/95 px-4 backdrop-blur-md lg:hidden">
        {NAV.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={isActive(path, it.href) ? "page" : undefined}
            className={
              "flex flex-col items-center gap-1 rounded-xl p-2 " +
              (isActive(path, it.href)
                ? "bg-secondary-container/10 text-secondary"
                : "text-on-surface-variant")
            }
          >
            <span className="material-symbols-outlined">{it.icon}</span>
            <span className="font-label text-[10px] font-semibold">{it.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
