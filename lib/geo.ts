"use client";

const KEY = "winnn.district";

export type District = {
  id: string;
  slug: string;
  name: string;
  governorate: string;
};

export function savedDistrict(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
}

export function saveDistrict(slug: string | null) {
  try {
    if (slug) window.localStorage.setItem(KEY, slug);
    else window.localStorage.removeItem(KEY);
  } catch (e) {}
}

/**
 * Ask the browser where we are, then snap to the nearest district.
 * Resolves to null on refusal or timeout - location is a convenience, never
 * a requirement, so the caller falls back to manual choice.
 */
export function detectPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  });
}
