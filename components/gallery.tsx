"use client";
import { useState } from "react";
import { artFor } from "@/lib/art";

/**
 * Product gallery. Products carry up to three images; showing only the first
 * wasted two thirds of what the admin uploaded.
 */
export default function Gallery(props: { images: string[]; slug: string; alt?: string }) {
  const imgs = (props.images || []).filter(Boolean);
  const [active, setActive] = useState(0);

  if (!imgs.length) {
    return (
      <div className={"aspect-square w-full overflow-hidden rounded-[28px] " + artFor(props.slug)} />
    );
  }

  return (
    <div>
      <div className="aspect-square w-full overflow-hidden rounded-[28px] bg-surface-container">
        <img src={imgs[active]} alt={props.alt || ""} className="h-full w-full object-cover" />
      </div>

      {imgs.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={"Image " + (i + 1)}
              className={
                "aspect-square overflow-hidden rounded-2xl bg-surface-container transition-all " +
                (i === active
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-70 hover:opacity-100")
              }
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
