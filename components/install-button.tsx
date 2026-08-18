"use client";
import { useEffect, useState } from "react";

/**
 * Always-available install entry point.
 *
 * The floating pill is a nudge and can be dismissed. This lives in Profile so
 * there is a permanent, findable way to install - no timing, no dismissal
 * memory, no auto-detection deciding whether to appear.
 */
export default function InstallButton() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );
  }, []);

  if (standalone) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-tertiary-fixed/20 p-4">
        <span className="material-symbols-outlined text-on-tertiary-fixed">check_circle</span>
        <p className="font-body text-body-md text-on-surface">App installed on this device.</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        // Reopen the prompt by reloading with the force flag. Simpler and more
        // reliable than sharing state across the tree for a rare action.
        try { window.localStorage.removeItem("winnn.install.dismissed"); } catch (e) {}
        const u = new URL(window.location.href);
        u.searchParams.set("install", "1");
        window.location.href = u.toString();
      }}
      className="flex w-full items-center gap-4 rounded-2xl bg-primary-container p-4 text-left text-on-primary-container transition-transform hover:scale-[1.01]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
        <span className="material-symbols-outlined">install_mobile</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-label text-label-bold text-on-primary">Install the app</span>
        <span className="block font-body text-sm text-on-primary-container">
          Add Winnn to your home screen
        </span>
      </span>
      <span className="material-symbols-outlined text-on-primary-container">chevron_right</span>
    </button>
  );
}
