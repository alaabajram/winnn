"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RULES, passwordIsValid, passwordScore } from "@/lib/password";

type Mode = "signin" | "signup" | "forgot";

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.indexOf("invalid login credentials") > -1)
    return "Email or password is not correct.";
  if (m.indexOf("email not confirmed") > -1)
    return "Confirm your email first. Check your inbox for the verification link.";
  if (m.indexOf("already registered") > -1 || m.indexOf("already been registered") > -1)
    return "An account with this email already exists. Sign in instead.";
  if (m.indexOf("rate limit") > -1 || m.indexOf("too many") > -1 || m.indexOf("after") > -1)
    return "Too many attempts. Wait a minute and try again.";
  if (m.indexOf("password") > -1 && m.indexOf("weak") > -1)
    return "That password does not meet the requirements.";
  if (m.indexOf("fetch") > -1 || m.indexOf("network") > -1)
    return "Could not reach the server. Check your connection.";
  return message;
}

const FIELD =
  "w-full rounded-xl border-none bg-surface-container px-5 py-4 font-body text-body-md text-on-surface ring-1 ring-outline-variant/30 transition-shadow placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60";

export default function AuthForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/wallet";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentMail, setSentMail] = useState<string | null>(null);
  const router = useRouter();

  const linkError = params.get("error") === "link";

  function origin() {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  async function google() {
    setBusy(true);
    setErr(null);
    const res = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: origin() + "/auth/callback?next=" + encodeURIComponent(next) },
    });
    if (res.error) {
      setBusy(false);
      setErr(friendly(res.error.message));
    }
    // on success the browser navigates away to Google
  }

  async function signIn() {
    setBusy(true);
    setErr(null);
    const res = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (res.error) { setErr(friendly(res.error.message)); return; }
    router.push(next);
    router.refresh();
  }

  async function signUp() {
    if (!passwordIsValid(password)) {
      setErr("Your password does not meet all the requirements below.");
      return;
    }
    setBusy(true);
    setErr(null);
    const clean = email.trim().toLowerCase();
    const res = await supabaseBrowser().auth.signUp({
      email: clean,
      password,
      options: {
        data: {
          full_name: name.trim() || null,
          mobile: mobile.trim() || null,
        },
        emailRedirectTo: origin() + "/auth/callback?next=" + encodeURIComponent(next),
      },
    });
    setBusy(false);
    if (res.error) { setErr(friendly(res.error.message)); return; }

    // With email confirmation switched off in Supabase, a session comes back
    // immediately and there is nothing to verify.
    if (res.data.session) {
      router.push(next);
      router.refresh();
      return;
    }
    setSentMail(clean);
  }

  async function forgot() {
    setBusy(true);
    setErr(null);
    const clean = email.trim().toLowerCase();
    const res = await supabaseBrowser().auth.resetPasswordForEmail(clean, {
      redirectTo: origin() + "/auth/reset",
    });
    setBusy(false);
    if (res.error) { setErr(friendly(res.error.message)); return; }
    setSentMail(clean);
  }

  if (sentMail) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-tertiary-fixed/20 p-5">
          <span className="material-symbols-outlined text-[24px] text-on-tertiary-fixed">
            mark_email_read
          </span>
          <div>
            <p className="font-headline text-headline-sm text-on-surface">Check your email</p>
            <p className="mt-1 font-body text-body-md text-on-surface-variant">
              We sent a link to <span className="font-semibold text-on-surface">{sentMail}</span>.
              Open it to {mode === "forgot" ? "set a new password" : "activate your account"}.
            </p>
          </div>
        </div>

        <p className="font-body text-sm text-on-surface-variant">
          The link can take a minute. Check your spam folder before trying again.
        </p>

        <button
          className="w-full rounded-xl border border-outline-variant/40 py-3 font-label text-label-bold text-on-surface transition-colors hover:bg-surface-container"
          onClick={() => { setSentMail(null); setPassword(""); }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const score = passwordScore(password);
  const scoreLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][score];
  const scoreTone = [
    "bg-error",
    "bg-error",
    "bg-secondary-fixed-dim",
    "bg-on-tertiary-container",
    "bg-on-tertiary-container",
  ][score];

  return (
    <div className="space-y-5">
      {linkError ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-container p-4 text-on-error-container">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="font-body text-body-md">
            That link was invalid or has already been used. Sign in, or request a new one.
          </p>
        </div>
      ) : null}

      <button
        onClick={google}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest py-4 font-label text-label-bold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.4-4.6 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4z"/>
          <path fill="#FBBC05" d="M10.3 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.8l7.8-6.1z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.8-3.7-13.7-9.9l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-outline-variant/40" />
        <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
          or
        </span>
        <div className="h-px flex-1 bg-outline-variant/40" />
      </div>

      {mode !== "forgot" ? (
        <div className="flex rounded-xl bg-surface-container p-1">
          <button
            onClick={() => { setMode("signin"); setErr(null); }}
            className={
              "flex-1 rounded-lg py-2.5 font-label text-label-bold transition-colors " +
              (mode === "signin" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant")
            }
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode("signup"); setErr(null); }}
            className={
              "flex-1 rounded-lg py-2.5 font-label text-label-bold transition-colors " +
              (mode === "signup" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant")
            }
          >
            Create account
          </button>
        </div>
      ) : null}

      {mode === "signup" ? (
        <>
          <div>
            <label className="mb-2 block font-label text-label-bold text-on-surface-variant">
              Full name
            </label>
            <input
              className={FIELD}
              type="text"
              autoComplete="name"
              placeholder="So we know who won"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block font-label text-label-bold text-on-surface-variant">
              Mobile number
            </label>
            <input
              className={FIELD}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+961 ..."
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <p className="mt-2 font-body text-sm text-on-surface-variant">
              How we reach you if you win. Not used to sign in.
            </p>
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-2 block font-label text-label-bold text-on-surface-variant">
          Email address
        </label>
        <input
          className={FIELD}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErr(null); }}
        />
      </div>

      {mode !== "forgot" ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block font-label text-label-bold text-on-surface-variant">
              Password
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
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "Create a password" : "Your password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErr(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { mode === "signup" ? signUp() : signIn(); }
            }}
          />

          {mode === "signup" ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-variant">
                  <div
                    className={"h-full rounded-full transition-all " + scoreTone}
                    style={{ width: (password ? (score + 1) * 20 : 0) + "%" }}
                  />
                </div>
                <span className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  {password ? scoreLabel : ""}
                </span>
              </div>

              <ul className="space-y-1.5">
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
                      <span
                        className={
                          "font-body text-sm " +
                          (pass ? "text-on-surface" : "text-on-surface-variant")
                        }
                      >
                        {r.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {mode === "signin" ? (
            <button
              onClick={() => { setMode("forgot"); setErr(null); }}
              className="mt-3 font-label text-[13px] font-semibold text-on-surface-variant underline-offset-4 hover:text-primary hover:underline"
            >
              Forgot your password?
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-label text-label-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-inverse-surface disabled:opacity-40"
        disabled={
          busy ||
          !email ||
          (mode !== "forgot" && !password) ||
          (mode === "signup" && !passwordIsValid(password))
        }
        onClick={mode === "signup" ? signUp : mode === "forgot" ? forgot : signIn}
      >
        {busy
          ? "Please wait"
          : mode === "signup"
          ? "Create account"
          : mode === "forgot"
          ? "Send reset link"
          : "Sign in"}
      </button>

      {mode === "forgot" ? (
        <button
          className="w-full rounded-xl border border-outline-variant/40 py-3 font-label text-label-bold text-on-surface transition-colors hover:bg-surface-container"
          onClick={() => { setMode("signin"); setErr(null); }}
        >
          Back to sign in
        </button>
      ) : null}

      {err ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-container p-4 text-on-error-container">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="font-body text-body-md">{err}</p>
        </div>
      ) : null}

      <p className="font-body text-sm text-on-surface-variant">
        By continuing you agree to the campaign terms. Winnn credits are spendable in the store only
        and are not exchangeable for cash.
      </p>
    </div>
  );
}
