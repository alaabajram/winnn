"use client";
import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Pull a new worker in immediately rather than waiting for every tab
        // to close. Matters here because v2 shipped a worker that could break
        // navigation, and users need the fix without clearing site data.
        reg.update();
      })
      .catch(() => {});
  }, []);
  return null;
}
