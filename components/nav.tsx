"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", d: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" },
  { href: "/store", label: "Store", d: "M4 8h16l-1 12H5zM8 8V6a4 4 0 0 1 8 0v2" },
  { href: "/wallet", label: "Wallet", d: "M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm13 6h3" },
  { href: "/profile", label: "Profile", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9a8 8 0 0 1 16 0" },
];

export default function Nav() {
  const path = usePathname();
  if (path && path.indexOf("/login") === 0) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur"
      style={{ borderColor: "var(--color-line)", background: "rgba(8,17,15,.92)" }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : !!path && path.indexOf(it.href) === 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-col items-center gap-1 py-3"
              style={{ color: active ? "var(--color-teal)" : "var(--color-mute)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={it.d} />
              </svg>
              <span className="text-[11px] font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
