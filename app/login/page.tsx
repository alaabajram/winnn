import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "@/components/auth-form";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Login() {
  const sb = await supabaseServer();
  const { data } = await sb.from("site_settings").select("site_name,logo_url").maybeSingle();
  const st: any = data || {};
  const brand = st.site_name || "Winnn";
  return (
    <div className="flex min-h-screen flex-col bg-background px-margin-mobile py-10 lg:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <Link href="/" className="mb-8 flex items-center gap-3">
          {st.logo_url ? (
            <img src={st.logo_url} alt={brand} className="h-12 w-auto max-w-[180px] object-contain" />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container">
                <span className="font-display text-headline-sm text-secondary-fixed">
                  {brand.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <span className="font-headline text-headline-md uppercase tracking-widest text-on-surface">
                {brand}
              </span>
            </>
          )}
        </Link>

        <h1 className="font-display text-display-sm text-on-background">Welcome</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Sign in to see your tickets, or create an account to enter a draw.
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-container" />}>
            <AuthForm />
          </Suspense>
        </div>

        <Link
          href="/"
          className="mt-10 flex items-center justify-center gap-1 font-label text-label-bold text-on-surface-variant transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to campaigns
        </Link>
      </div>
    </div>
  );
}
