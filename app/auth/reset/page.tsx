import { Suspense } from "react";
import ResetForm from "@/components/reset-form";

export const dynamic = "force-dynamic";

export default function Reset() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-margin-mobile py-10 lg:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container">
            <span className="font-display text-headline-sm text-secondary-fixed">W</span>
          </div>
          <span className="font-headline text-headline-md uppercase tracking-widest text-on-surface">
            Winnn
          </span>
        </div>

        <h1 className="font-display text-display-sm text-on-background">New password</h1>
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          Choose a password you have not used before.
        </p>

        <div className="mt-8">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-container" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
