"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { savedDistrict, saveDistrict, detectPosition, type District } from "@/lib/geo";

export default function DistrictPicker(props: { districts: District[]; active: string }) {
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  const current = props.districts.find((d) => d.slug === props.active);

  // On a first visit with no choice in the URL, adopt whatever was picked last.
  useEffect(() => {
    if (params.get("d")) return;
    const s = savedDistrict();
    if (s) go(s, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(slug: string | null, remember = true) {
    if (remember) saveDistrict(slug);
    const u = new URLSearchParams(Array.from(params.entries()));
    if (slug) u.set("d", slug);
    else u.delete("d");
    router.push("/?" + u.toString());
    setOpen(false);
  }

  async function locate() {
    setLocating(true);
    setHint(null);
    const pos = await detectPosition();
    if (!pos) {
      setLocating(false);
      setHint("Location unavailable. Choose your district below.");
      return;
    }
    const res = await supabaseBrowser().rpc("fn_nearest_district", {
      p_lat: pos.lat, p_lng: pos.lng,
    });
    setLocating(false);
    const d: any = res.data;
    if (res.error || !d) {
      setHint("Could not match your location. Choose below.");
      return;
    }
    go(d.slug);
  }

  const grouped: Record<string, District[]> = {};
  props.districts.forEach((d) => {
    if (!grouped[d.governorate]) grouped[d.governorate] = [];
    grouped[d.governorate].push(d);
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-surface-container px-4 py-2.5 transition-colors hover:bg-surface-variant"
      >
        <span className="material-symbols-outlined text-[20px] text-secondary">location_on</span>
        <span className="font-label text-label-bold text-on-surface">
          {current ? current.name : "All Lebanon"}
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          expand_more
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-primary/60 backdrop-blur-sm sm:items-center sm:justify-center">
          <button className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Close" />

          <div className="anim-slide-up relative max-h-[85vh] w-full overflow-hidden rounded-t-[28px] bg-surface sm:max-w-lg sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
              <h2 className="font-headline text-headline-sm text-on-surface">Your district</h2>
              <button onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "65vh" }}>
              <button
                onClick={locate}
                disabled={locating}
                className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-primary-container p-4 text-left text-on-primary-container disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-secondary-fixed">
                  {locating ? "progress_activity" : "my_location"}
                </span>
                <span>
                  <span className="block font-label text-label-bold text-on-primary">
                    {locating ? "Finding you" : "Use my location"}
                  </span>
                  <span className="block font-body text-sm">Snap to the nearest district</span>
                </span>
              </button>

              {hint ? (
                <p className="mb-3 rounded-xl bg-secondary-container/40 p-3 font-body text-sm text-on-surface">
                  {hint}
                </p>
              ) : null}

              <button
                onClick={() => go(null)}
                className={
                  "mb-4 flex w-full items-center justify-between rounded-xl p-3.5 text-left transition-colors " +
                  (!props.active ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface")
                }
              >
                <span className="font-label text-label-bold">All Lebanon</span>
                {!props.active ? <span className="material-symbols-outlined text-[20px]">check</span> : null}
              </button>

              {Object.keys(grouped).map((gov) => (
                <div key={gov} className="mb-4">
                  <p className="mb-2 font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    {gov}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {grouped[gov].map((d) => (
                      <button
                        key={d.slug}
                        onClick={() => go(d.slug)}
                        className={
                          "rounded-xl p-3 text-left font-body text-body-md transition-colors " +
                          (props.active === d.slug
                            ? "bg-secondary-container font-semibold text-on-secondary-container"
                            : "bg-surface-container text-on-surface hover:bg-surface-variant")
                        }
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
