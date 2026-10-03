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
  // No maximumScale: locking zoom fails WCAG 1.4.4 for low-vision readers.
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
      <head>
        {/* Apply the saved theme/font/accent before first paint. Without
            this every load painted the light theme, then faded to dark or
            sepia once React hydrated. Mirrors SettingsContext's effect. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem("iinb:reader-settings:v2")||"null");if(s&&typeof s==="object"){var r=document.documentElement,t=s.theme;if(["light","dark","sepia","oled"].indexOf(t)>-1){r.setAttribute("data-theme",t);var a=s.accentByTheme&&s.accentByTheme[t];if(typeof a==="string"&&/^#[0-9a-f]{6}$/i.test(a))r.style.setProperty("--accent",a)}if(s.fontFamily==="serif"||s.fontFamily==="sans")r.setAttribute("data-reading-font",s.fontFamily);if(s.bionicReading)r.setAttribute("data-bionic","on")}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <Script src="/shared-components/loader.js" strategy="beforeInteractive" />
        <Script src="/ywe-pixel.js?v=20260906-base-only" strategy="afterInteractive" />
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
