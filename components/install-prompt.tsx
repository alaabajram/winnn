"use client";
import { useEffect, useState } from "react";

/**
 * Install prompt for both platforms.
 *
 * Android/Chrome fires `beforeinstallprompt`, which we capture and replay when
 * the user taps Install - a real one-tap install.
 *
 * iOS Safari has NO install API. Apple has never shipped one, so no website can
 * trigger the install dialog. The only route is Share > Add to Home Screen.
 * What we do instead: a floating "Download app" pill, which opens a full-screen
 * sheet with the steps and a bouncing arrow pointing at the Share button in the
 * Safari toolbar. It instructs; it cannot install.
 */

const DISMISS_KEY = "winnn.install.dismissed";
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Macintosh; touch points give it away
  const iPadDesktop = /Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1;
  return iDevice || iPadDesktop;
}

/** Another browser's engine, or an in-app webview. Cannot install. */
function iosOtherBrowser() {
  const ua = navigator.userAgent || "";
  return isIos() && /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|Twitter/.test(ua);
}

function iosSafari() {
  const ua = navigator.userAgent || "";
  return isIos() && /Safari/.test(ua) && !iosOtherBrowser();
}

/** iPhone puts the share button in the bottom toolbar; iPad puts it top right. */
function shareIsAtBottom() {
  const ua = navigator.userAgent || "";
  if (/iPad/.test(ua)) return false;
  if (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1) return false;
  return true;
}

function recentlyDismissed() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISS_DAYS * 86400000;
  } catch (e) {
    return false;
  }
}

function ShareIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 24" width="22" height="26" fill="none" className={props.className} aria-hidden="true">
      <path d="M10 1.5v13M10 1.5L6 5.5M10 1.5l4 4" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v11h14V11" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InstallPrompt(props: { appName?: string; iconUrl?: string | null }) {
  const [mode, setMode] = useState<"hidden" | "pill" | "sheet">("hidden");
  const [ios, setIos] = useState(false);
  const [bottomShare, setBottomShare] = useState(true);
  const [wrongBrowser, setWrongBrowser] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [installing, setInstalling] = useState(false);

  const name = props.appName || "Winnn";

  useEffect(() => {
    // ?install=1 forces the prompt open regardless of dismissal or timing.
    // Handy for testing on a device with no console.
    const forced =
      typeof window !== "undefined" &&
      window.location.search.indexOf("install=1") > -1;

    if (!forced && (isStandalone() || recentlyDismissed())) return;

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e);
      window.setTimeout(() => setMode("pill"), 2500);
    }
    window.addEventListener("beforeinstallprompt", onBip as any);

    function onInstalled() { setMode("hidden"); }
    window.addEventListener("appinstalled", onInstalled);

    let t = 0;
    if (isIos()) {
      setIos(true);
      setWrongBrowser(iosOtherBrowser());
      setBottomShare(shareIsAtBottom());
      t = window.setTimeout(() => setMode(forced ? "sheet" : "pill"), forced ? 0 : 1500);
    } else if (forced) {
      t = window.setTimeout(() => setMode("pill"), 0);
    }

    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBip as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setMode("hidden");
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  async function androidInstall() {
    if (!deferred) return;
    setInstalling(true);
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    setInstalling(false);
    setDeferred(null);
    setMode("hidden");
  }

  if (mode === "hidden") return null;

  const AppIcon = (size: string) => (
    <div className={"flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-container shadow-lg " + size}>
      {props.iconUrl ? (
        <img src={props.iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-secondary-fixed">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );

  // ---------------------------------------------------------------- the pill
  if (mode === "pill") {
    return (
      <div className="anim-slide-up fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 pb-[calc(4.75rem_+_env(safe-area-inset-bottom))] lg:pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
        <div className="relative flex items-center gap-3 rounded-full bg-primary-container py-2 pl-2 pr-3 shadow-2xl">
          <span className="absolute inset-0 -z-10 rounded-full bg-secondary-container anim-ring" />

          <button
            onClick={() => (ios ? setMode("sheet") : androidInstall())}
            disabled={installing}
            className="flex items-center gap-3"
          >
            {AppIcon("h-10 w-10 text-headline-sm")}
            <span className="text-left">
              <span className="block font-label text-label-bold uppercase tracking-widest text-secondary-fixed">
                {installing ? "Installing" : "Download app"}
              </span>
              <span className="block font-body text-[11px] text-on-primary-container">
                {ios ? "Add to your home screen" : "Install " + name}
              </span>
            </span>
            <span className="material-symbols-outlined ml-1 text-secondary-fixed anim-bounce">
              {ios ? "arrow_downward" : "download"}
            </span>
          </button>

          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex h-7 w-7 items-center justify-center rounded-full text-on-primary-container hover:bg-surface/10"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------- iOS instructions
  const steps = [
    {
      n: 1,
      text: "Tap the Share button in the Safari toolbar",
      icon: <ShareIcon className="text-primary-container" />,
    },
    { n: 2, text: "Scroll down and choose Add to Home Screen", icon: null },
    { n: 3, text: "Tap Add, top right", icon: null },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-primary/70 backdrop-blur-sm">
      <button className="flex-1" onClick={dismiss} aria-label="Close" />

      <div className="anim-slide-up relative rounded-t-[32px] bg-surface px-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-outline-variant" />

        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-6 flex items-center gap-4">
          {AppIcon("h-16 w-16 text-headline-md")}
          <div>
            <p className="font-headline text-headline-md text-on-surface">Install {name}</p>
            <p className="mt-0.5 font-body text-body-md text-on-surface-variant">
              Free, no App Store needed
            </p>
          </div>
        </div>

        {wrongBrowser ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-secondary-container/40 p-4">
            <span className="material-symbols-outlined text-on-secondary-container">info</span>
            <p className="font-body text-body-md text-on-surface">
              This browser cannot add apps to the home screen on iPhone. Open{" "}
              <strong>{typeof window !== "undefined" ? window.location.host : "this site"}</strong>{" "}
              in <strong>Safari</strong> first, then follow the steps below.
            </p>
          </div>
        ) : null}

        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex items-center gap-4 rounded-2xl bg-surface-container p-4">
              <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-label text-[13px] font-semibold text-secondary-fixed">
                {s.n}
              </span>
              <span className="flex flex-1 items-center gap-2 font-body text-body-md text-on-surface">
                {s.text}
              </span>
              {s.icon}
            </li>
          ))}
        </ol>

        <p className="mt-5 text-center font-body text-sm text-on-surface-variant">
          Look for this icon
          <span className="mx-1.5 inline-flex translate-y-1 text-primary-container">
            <ShareIcon />
          </span>
          {bottomShare ? "at the bottom of your screen" : "at the top right of your screen"}
        </p>

        {/* The arrow points at the real Safari toolbar, which is below this sheet
            on iPhone and above it on iPad. */}
        {bottomShare ? (
          <div className="mt-3 flex justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary-container anim-bounce">
              arrow_downward
            </span>
          </div>
        ) : null}

        <button
          onClick={dismiss}
          className="mt-5 w-full rounded-xl border border-outline-variant/40 py-3.5 font-label text-label-bold uppercase tracking-widest text-on-surface"
        >
          Close
        </button>
      </div>
    </div>
  );
}
