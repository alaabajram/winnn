"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/store", label: "Store", icon: "shopping_bag" },
  { href: "/wallet", label: "Wallet", icon: "account_balance_wallet" },
  { href: "/profile", label: "Profile", icon: "person" },
];

function isActive(path: string | null, href: string) {
  if (href === "/") return path === "/";
  return !!path && path.indexOf(href) === 0;
}

export default function Shell(props: {
  children: React.ReactNode;
  balance: string | null;
  name: string | null;
}) {
  const path = usePathname();
  const onLogin = !!path && path.indexOf("/login") === 0;
  if (onLogin) return <>{props.children}</>;

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col bg-primary-container py-8 shadow-2xl lg:flex">
        <div className="mb-12 flex items-center gap-3 px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container">
            <span className="font-display text-headline-sm text-on-secondary-container">W</span>
          </div>
          <span className="font-headline text-headline-md uppercase tracking-widest text-primary-fixed">
            Winnn
          </span>
        </div>
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
        <div className="px-8 pt-6">
          <p className="text-[10px] uppercase tracking-widest text-on-primary-container/60">
            Draws are physical and recorded
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between bg-surface/80 px-margin-mobile shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:left-64 lg:px-margin-desktop">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container">
              <span className="font-display text-label-bold text-secondary-fixed">W</span>
            </div>
            <span className="font-headline text-headline-sm uppercase tracking-widest text-on-surface">
              Winnn
            </span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-6 lg:flex-none">
            <Link
              href="/wallet"
              className="flex items-center gap-3 rounded-full border border-outline-variant/20 bg-primary-container py-1 pl-4 pr-1 shadow-lg"
            >
              <span className="num font-label text-label-bold uppercase tracking-tighter text-secondary-fixed-dim">
                {props.balance === null ? "Sign in" : props.balance + " Winnn"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container transition-transform active:scale-90">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </span>
            </Link>

            <Link href="/profile" className="flex items-center gap-3 border-l border-outline-variant pl-4">
              <div className="hidden text-right sm:block">
                <p className="font-label text-label-bold text-on-surface">
                  {props.name === null ? "Guest" : props.name}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {props.name === null ? "Not signed in" : "Member"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-container bg-primary-container text-on-primary shadow-md">
                <span className="font-display text-label-bold">
                  {props.name === null ? "?" : props.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            </Link>
          </div>
        </header>

        <main className="relative mx-auto min-h-screen max-w-[var(--container-max)] px-margin-mobile pb-24 pt-20 lg:px-margin-desktop lg:pb-12">
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
