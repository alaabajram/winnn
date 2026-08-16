"use client";
import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SLOTS, aspectClass, type Slot } from "@/lib/image-slots";

const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/avif", "image/x-icon"];

function readDimensions(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (file.type === "image/svg+xml") return resolve(null); // vector, no fixed size
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export default function ImageUpload(props: {
  slot: keyof typeof SLOTS;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const slot: Slot = SLOTS[props.slot];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function handle(file: File) {
    setErr(null);
    setWarn(null);

    if (OK_TYPES.indexOf(file.type) === -1) {
      setErr("Use a PNG, JPG, WebP or SVG file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("That file is over 5 MB. Compress it and try again.");
      return;
    }

    const dim = await readDimensions(file);
    if (dim) {
      const want = slot.w / slot.h;
      const got = dim.w / dim.h;
      if (Math.abs(want - got) / want > 0.12) {
        setWarn(
          "This is " + dim.w + "x" + dim.h + ". Recommended is " + slot.w + "x" + slot.h +
          ", so it will be cropped to fit."
        );
      } else if (dim.w < slot.w * 0.6) {
        setWarn(
          "This is " + dim.w + "px wide, smaller than the recommended " + slot.w +
          "px. It may look soft on large screens."
        );
      }
    }

    setBusy(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path =
      (props.folder || slot.key) + "/" +
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8) + "." + ext;

    const sb = supabaseBrowser();
    const up = await sb.storage.from("media").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    setBusy(false);

    if (up.error) {
      setErr(
        up.error.message.indexOf("row-level security") > -1 ||
        up.error.message.indexOf("Unauthorized") > -1
          ? "Upload refused. Your account needs to be an admin."
          : up.error.message
      );
      return;
    }

    const { data } = sb.storage.from("media").getPublicUrl(up.data.path);
    props.onChange(data.publicUrl);
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="font-label text-label-bold text-on-surface-variant">{slot.label}</label>
        <span className="num font-label text-[11px] font-semibold text-on-surface-variant">
          {slot.w} x {slot.h}
        </span>
      </div>

      {props.value ? (
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container">
          <div className={aspectClass(slot.shape) + " w-full"}>
            <img src={props.value} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-outline-variant/30 bg-surface-container-lowest px-3 py-2">
            <button
              onClick={() => input.current && input.current.click()}
              className="font-label text-[12px] font-semibold uppercase tracking-widest text-primary hover:underline"
            >
              Replace
            </button>
            <button
              onClick={() => { props.onChange(""); setWarn(null); setErr(null); }}
              className="font-label text-[12px] font-semibold uppercase tracking-widest text-error hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => input.current && input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) handle(f);
          }}
          className={
            aspectClass(slot.shape) +
            " flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-colors " +
            (drag
              ? "border-primary bg-primary/5"
              : "border-outline-variant/50 bg-surface-container hover:border-outline")
          }
        >
          {busy ? (
            <>
              <span className="material-symbols-outlined animate-pulse text-[28px] text-on-surface-variant">
                cloud_upload
              </span>
              <span className="font-label text-label-bold text-on-surface-variant">Uploading</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                add_photo_alternate
              </span>
              <span className="font-label text-label-bold text-on-surface">
                Choose a file or drag it here
              </span>
              <span className="num font-body text-sm text-on-surface-variant">
                {slot.w} x {slot.h} px, under {slot.maxKb} KB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept={OK_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />

      <p className="mt-2 font-body text-sm text-on-surface-variant">{slot.note}</p>

      {warn ? (
        <p className="mt-2 flex items-start gap-1.5 font-body text-sm text-on-secondary-container">
          <span className="material-symbols-outlined text-[16px]">info</span>
          {warn}
        </p>
      ) : null}
      {err ? (
        <p className="mt-2 flex items-start gap-1.5 font-body text-sm text-error">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {err}
        </p>
      ) : null}
    </div>
  );
}
