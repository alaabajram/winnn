import "./globals.css";
import type { Metadata, Viewport } from "next";
import Shell from "@/components/shell";
import RegisterSW from "@/components/register-sw";
import { supabaseServer } from "@/lib/supabase/server";
import { winnn } from "@/lib/format";

export const metadata: Metadata = {
  title: "Winnn - Buy Credits. Get Tickets. Win.",
  description:
    "Lucky draw campaigns with local Lebanese businesses. Buy Winnn credits or scan a voucher from a partner store.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Winnn" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#f8f9fa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  let balance: string | null = null;
  let name: string | null = null;
  if (auth && auth.user) {
    const { data: w } = await sb.from("wallets").select("balance_cents").maybeSingle();
    balance = winnn(w ? (w as any).balance_cents : 0);
    const { data: p } = await sb.from("profiles").select("full_name,email").maybeSingle();
    const prof: any = p;
    name = (prof && (prof.full_name || prof.email)) || auth.user.email || "Member";
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
        <Shell balance={balance} name={name}>
          {children}
        </Shell>
        <RegisterSW />
      </body>
    </html>
  );
}
