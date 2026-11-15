import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import PrimeReactCtx from "@/contexts/PrimeReactContext";
import { PrimeReactToastContext } from "@/contexts/PrimeReactToastContext";
import TanstackContext from "@/contexts/TanstackContext";
import NextJsProgressBar from "@/utils/NextJsProgressBar";
import { THEME_BOOT_SCRIPT } from "@/lib/themeBoot";
import { APP_NAME as appName } from "@/lib/brand";

// Headlines in a confident geometric sans, everything read at length in Inter.
// Each shop will set its own fonts (D19); these are the platform's.
const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: appName,
  title: {
    template: `%s | ${appName}`,
    default: `${appName}: shop from local sellers, pay on delivery`,
  },
  description:
    "Buy from shops near you with Mobile Money or cash on delivery. No account needed: order in a minute and track it by phone.",
  openGraph: {
    type: "website",
    siteName: appName,
    locale: "en_UG",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0e5e45",
};

/**
 * Static on purpose: no cookies or headers are read here, so with Cache Components every
 * storefront page can be served from its prerendered shell. Signed-in providers (theme,
 * session, PrimeReact's theme, sidebar) live in components/auth/SessionProviders.tsx, mounted by
 * the dashboard and sign-in layouts and read in the browser.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the theme script below may add `dark` and a color-scheme to <html>
    // before React hydrates, on purpose. React's documented exception for exactly this; it covers
    // <html>'s own attributes only, so a real mismatch anywhere inside the page is still reported.
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Dark mode before the first paint on dashboard and sign-in pages (lib/themeBoot.ts). Inline
            and in the root layout on purpose: it must run while the HTML is parsed (next/script's
            beforeInteractive queues it until later), and the root layout is never drawn again in
            the browser, so React never has to create a <script> during navigation. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextJsProgressBar />
        <PrimeReactCtx>
          <PrimeReactToastContext>
            <TanstackContext>{children}</TanstackContext>
          </PrimeReactToastContext>
        </PrimeReactCtx>
      </body>
    </html>
  );
}
