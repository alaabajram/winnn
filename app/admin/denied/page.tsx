import Link from "next/link";

export default function Denied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <span className="material-symbols-outlined text-[48px] text-error">lock</span>
        <h1 className="mt-4 font-display text-display-sm text-on-background">Admin only</h1>
        <p className="mt-3 font-body text-body-md text-on-surface-variant">
          Your account is signed in but is not an administrator. Ask a super admin to add you, or
          insert a row into the <span className="font-semibold">admins</span> table with your user id.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-primary px-6 py-4 font-label text-label-bold uppercase tracking-widest text-on-primary"
        >
          Back to site
        </Link>
      </div>
    </div>
  );
}
