"use client";
import { useEffect, useState } from "react";

/**
 * Install prompt for both platforms.
 *
 * Android/Chrome fires `beforeinstallprompt`, which we capture and replay when
 * the user taps Install. iOS Safari has no such API at all - the only route is
 * Share > Add to Home Screen - so that platform gets illustrated instructions
 * instead of a button.
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
  // iPadOS 13+ reports as Mac; the touch point count gives it away
  const iPadDesktop = /Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1;
  return iDevice || iPadDesktop;
}

function isSafari() {
  const ua = navigator.userAgent || "";
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
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

export default function InstallPrompt(props: { appName?: string; iconUrl?: string | null }) {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [installing, setInstalling] = useState(false);

  const name = props.appName || "Winnn";

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android and desktop Chrome
    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e);
      window.setTimeout(() => setShow(true), 2500);
    }
    window.addEventListener("beforeinstallprompt", onBip as any);

    // iOS never fires that event, so offer instructions instead
    if (isIos() && isSafari()) {
      setIos(true);
      const t = window.setTimeout(() => setShow(true), 3500);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip as any);
      };
    }

    function onInstalled() { setShow(false); }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  async function install() {
    if (!deferred) return;
    setInstalling(true);
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    setInstalling(false);
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  const Icon = (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-container shadow-lg">
      {props.iconUrl ? (
        <img src={props.iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-headline-md text-secondary-fixed">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-5 shadow-2xl ring-1 ring-outline-variant/30">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="flex items-start gap-4 pr-8">
          {Icon}
          <div className="min-w-0">
            <p className="font-headline text-headline-sm text-on-surface">Install {name}</p>
            <p className="mt-1 font-body text-body-md text-on-surface-variant">
              {ios
                ? "Add it to your home screen for faster access to your tickets."
                : "Get it on your home screen. Works offline and opens like an app."}
            </p>
          </div>
        </div>

        {ios ? (
          <>
            <ol className="mt-4 space-y-2.5 rounded-2xl bg-surface-container p-4">
              <li className="flex items-center gap-3">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container font-label text-[11px] text-secondary-fixed">
                  1
                </span>
                <span className="flex items-center gap-1.5 font-body text-body-md text-on-surface">
                  Tap
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
                    <path d="M8 1v12M8 1L4.5 4.5M8 1l3.5 3.5" stroke="#0d1c32" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 9v9h12V9" stroke="#0d1c32" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  in the Safari toolbar
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container font-label text-[11px] text-secondary-fixed">
                  2
                </span>
                <span className="font-body text-body-md text-on-surface">
                  Scroll and choose <strong>Add to Home Screen</strong>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container font-label text-[11px] text-secondary-fixed">
                  3
                </span>
                <span className="font-body text-body-md text-on-surface">
                  Tap <strong>Add</strong>
                </span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-4 w-full rounded-xl border border-outline-variant/40 py-3 font-label text-label-bold uppercase tracking-widest text-on-surface"
            >
              Got it
            </button>
          </>
        ) : (
          <div className="mt-4 flex gap-3">
            <button
              onClick={install}
              disabled={installing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-label text-label-bold uppercase tracking-widest text-on-primary disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              {installing ? "Installing" : "Install"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border border-outline-variant/40 px-5 font-label text-label-bold text-on-surface"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
