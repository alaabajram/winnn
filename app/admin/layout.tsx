import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/admin/nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, user, sb } = await requireAdmin();
  const { data: settingsRow } = await sb
    .from("site_settings").select("site_name,logo_url").maybeSingle();
  const settings: any = settingsRow || {};

  return (
    <div className="min-h-screen bg-background">
      <AdminNav logoUrl={settings.logo_url || null} siteName={settings.site_name || "Winnn"} />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface/90 px-5 backdrop-blur-xl lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-1 font-label text-label-bold text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            View site
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-label text-label-bold text-on-surface">{user.email}</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                {admin.role}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container">
              <span className="font-display text-label-bold text-secondary-fixed">
                {(user.email || "A").slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        <main className="px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
