"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RULES, passwordIsValid } from "@/lib/password";

const FIELD =
  "w-full rounded-xl border-none bg-surface-container px-5 py-4 font-body text-body-md text-on-surface ring-1 ring-outline-variant/30 transition-shadow placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60";

export default function ResetForm() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // The recovery link puts a session in place before landing here. Without one
  // there is nothing to update, so say so rather than failing on submit.
  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then((res) => setReady(!!(res.data && res.data.session)));
  }, []);

  async function submit() {
    if (!passwordIsValid(password)) {
      setErr("Your password does not meet all the requirements below.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await supabaseBrowser().auth.updateUser({ password: password });
    setBusy(false);
    if (res.error) { setErr(res.error.message); return; }
    router.push("/wallet");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-error-container p-4 text-on-error-container">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="font-body text-body-md">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        </div>
        <a
          href="/login"
          className="block w-full rounded-xl bg-primary py-4 text-center font-label text-label-bold uppercase tracking-widest text-on-primary"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block font-label text-label-bold text-on-surface-variant">
            New password
          </label>
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="font-label text-[12px] font-semibold text-on-surface-variant hover:text-primary"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <input
          className={FIELD}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErr(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />

        <ul className="mt-3 space-y-1.5">
          {RULES.map((r) => {
            const pass = r.test(password);
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span
                  className={
                    "material-symbols-outlined text-[16px] " +
                    (pass ? "text-on-tertiary-container" : "text-outline-variant")
                  }
                >
                  {pass ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={"font-body text-sm " + (pass ? "text-on-surface" : "text-on-surface-variant")}>
                  {r.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        className="w-full rounded-xl bg-primary py-4 font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface disabled:opacity-40"
        disabled={busy || !passwordIsValid(password)}
        onClick={submit}
      >
        {busy ? "Saving" : "Save password"}
      </button>

      {err ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-container p-4 text-on-error-container">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="font-body text-body-md">{err}</p>
        </div>
      ) : null}
    </div>
  );
}
