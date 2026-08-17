import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Dynamic web app manifest.
 *
 * Served here rather than as a static file in /public so the installed app
 * icon and name follow whatever is uploaded in Admin > Settings. The uploaded
 * favicon is a 512px square (see lib/image-slots.ts), which is exactly what a
 * PWA icon needs, so it is reused at both required sizes.
 *
 * Path is /site.webmanifest, not /manifest.webmanifest, to avoid colliding
 * with the static file already in /public.
 */
export async function GET() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("site_settings")
    .select("site_name,tagline,description,favicon_url,brand_primary")
    .maybeSingle();
  const s: any = data || {};

  const name = s.site_name || "Winnn";
  const icon = s.favicon_url || null;

  const icons = icon
    ? [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  const manifest = {
    name: s.tagline ? name + " - " + s.tagline : name,
    short_name: name,
    description: s.description || "Lucky draw campaigns with local Lebanese businesses.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f9fa",
    theme_color: s.brand_primary || "#0d1c32",
    icons,
    shortcuts: [
      { name: "My wallet", url: "/wallet" },
      { name: "Store", url: "/store" },
      { name: "How it works", url: "/how-it-works" },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
