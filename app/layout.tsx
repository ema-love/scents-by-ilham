import type { Metadata, Viewport } from "next";
import { Allura, Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers/providers";
import { brand } from "@/lib/brand";
import "./globals.css";

/** Editorial serif for headlines, a script for the "Scents" wordmark only, and a clear sans for everything you read or tap. */
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const allura = Allura({ subsets: ["latin"], weight: "400", variable: "--font-allura", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: `${brand.name} — ${brand.promise}`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  keywords: ["Scents by Ilham", "affordable fragrances", "Humrah", "Homura", "Turaren Wuta", "Kulacham", "fragrances in Nigeria"],
  openGraph: { title: `${brand.name} — ${brand.promise}`, description: brand.shortDescription, siteName: brand.name, type: "website", locale: "en_NG" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2e1f3a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${cormorant.variable} ${allura.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
