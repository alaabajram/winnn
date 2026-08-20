"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  cta_label: string | null;
};

export default function BannerCarousel(props: { banners: Banner[] }) {
  const items = props.banners || [];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), 6000);
    return () => window.clearInterval(t);
  }, [items.length, paused]);

  if (!items.length) return null;

  function go(n: number) {
    setI(((n % items.length) + items.length) % items.length);
  }

  const b = items[i];

  const Inner = (
    <div className="relative h-full w-full">
      <img src={b.image_url} alt={b.title || ""} className="h-full w-full object-cover" />
      {b.title || b.subtitle ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/40 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center p-6 sm:p-10">
            {b.title ? (
              <h2 className="font-display text-[26px] leading-tight text-on-primary drop-shadow sm:text-display-sm">
                {b.title}
              </h2>
            ) : null}
            {b.subtitle ? (
              <p className="mt-2 font-body text-body-md text-primary-fixed-dim sm:text-body-lg">
                {b.subtitle}
              </p>
            ) : null}
            {b.cta_label ? (
              <span className="mt-4 w-fit rounded-xl bg-secondary-container px-5 py-3 font-label text-label-bold uppercase tracking-widest text-on-secondary-container">
                {b.cta_label}
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <div
      className="relative mb-8 overflow-hidden rounded-[24px] bg-surface-container shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) go(dx < 0 ? i + 1 : i - 1);
        touchX.current = null;
      }}
    >
      <div className="aspect-[16/7] w-full sm:aspect-[21/8]">
        {b.link_url ? (
          <Link href={b.link_url} className="block h-full w-full">{Inner}</Link>
        ) : (
          Inner
        )}
      </div>

      {items.length > 1 ? (
        <>
          <button
            onClick={() => go(i - 1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface backdrop-blur-sm hover:bg-surface sm:flex"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={() => go(i + 1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface backdrop-blur-sm hover:bg-surface sm:flex"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {items.map((x, n) => (
              <button
                key={x.id}
                onClick={() => go(n)}
                aria-label={"Slide " + (n + 1)}
                className={
                  "h-2 rounded-full transition-all " +
                  (n === i ? "w-7 bg-secondary-fixed" : "w-2 bg-surface/70")
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
