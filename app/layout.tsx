import "./globals.css";
import type { Metadata, Viewport } from "next";
import Shell from "@/components/shell";
import { CartProvider } from "@/components/cart-provider";
import InstallPrompt from "@/components/install-prompt";
import RegisterSW from "@/components/register-sw";
import { supabaseServer } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("site_settings")
    .select("site_name,tagline,description,favicon_url,default_og_image_url")
    .maybeSingle();
  const s: any = data || {};
  const name = s.site_name || "Winnn";
  const title = s.tagline ? name + " - " + s.tagline : name;
  const description =
    s.description ||
    "Lucky draw campaigns with local Lebanese businesses. Buy Winnn credits or scan a voucher from a partner store.";

  return {
    title,
    description,
    manifest: "/site.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: name },
    icons: {
      icon: s.favicon_url || "/icon-192.png",
      apple: s.favicon_url || "/icon-192.png",
    },
    openGraph: {
      title,
      description,
      images: s.default_og_image_url ? [s.default_og_image_url] : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f8f9fa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  const { data: settingsRow } = await sb
    .from("site_settings").select("site_name,logo_url,favicon_url,brand_primary,brand_accent").maybeSingle();
  const settings: any = settingsRow || {};

  let name: string | null = null;
  let avatar: string | null = null;
  if (auth && auth.user) {
    const { data: p } = await sb.from("profiles").select("full_name,email,avatar_url").maybeSingle();
    const prof: any = p;
    name = (prof && (prof.full_name || prof.email)) || auth.user.email || "Member";
    avatar = (prof && prof.avatar_url) || null;
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>
        {/* The colour picker in Admin > Settings writes these. Overriding the
            theme variables here is what makes it take effect site-wide. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              ":root{" +
              (settings.brand_primary ? "--color-primary-container:" + settings.brand_primary + ";" : "") +
              (settings.brand_primary ? "--color-on-primary-fixed:" + settings.brand_primary + ";" : "") +
              (settings.brand_accent ? "--color-secondary-container:" + settings.brand_accent + ";" : "") +
              (settings.brand_accent ? "--color-secondary-fixed:" + settings.brand_accent + ";" : "") +
              "}",
          }}
        />
        <CartProvider>
          <Shell
            name={name}
            avatarUrl={avatar}
            logoUrl={settings.logo_url || null}
            siteName={settings.site_name || "Winnn"}
          >
            {children}
          </Shell>
          <InstallPrompt
            appName={settings.site_name || "Winnn"}
            iconUrl={settings.favicon_url || settings.logo_url || null}
          />
        </CartProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
