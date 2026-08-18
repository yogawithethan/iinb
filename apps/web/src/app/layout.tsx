import type { Metadata, Viewport } from "next";
import { Inter, Lora, Poppins } from "next/font/google";
import Script from "next/script";
import { createElement } from "react";
import "./globals.css";
import { ReaderSettingsProvider } from "@/components/reader/SettingsContext";
import { HeaderTuning } from "@/components/HeaderTuning";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const OG_TITLE = "Ignorance is not Bliss by Ethan Hill";
const OG_DESCRIPTION =
  "Suffering, purification, and the future of our species.";
const OG_IMAGE = "/images/iinb-featured.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://iinb.yogawithethan.com"),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  icons: {
    icon: [
      { url: "/icon.png", sizes: "1080x1080", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    url: "https://iinb.yogawithethan.com",
    siteName: OG_TITLE,
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 900,
        alt: OG_TITLE,
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "IINB",
    statusBarStyle: "default",
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#fdf9f4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${lora.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Script src="/shared-components/loader.js" strategy="beforeInteractive" />
        {createElement("ywe-header", {
          active: "iinb",
          preset: "immersive-detail",
          "mobile-title": "Ignorance Is Not Bliss",
        })}
        <HeaderTuning />
        <ReaderSettingsProvider>{children}</ReaderSettingsProvider>
      </body>
    </html>
  );
}
