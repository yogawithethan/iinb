import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import Script from "next/script";
import { createElement } from "react";
import "./globals.css";
import { ReaderSettingsProvider } from "@/components/reader/SettingsContext";

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

export const metadata: Metadata = {
  title: "Ignorance Is Not Bliss",
  description:
    "An interactive reader for Ethan Hill's Ignorance Is Not Bliss.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Script src="/shared-components/loader.js" strategy="beforeInteractive" />
        {createElement("ywe-header", {
          active: "iinb",
          preset: "immersive-detail",
          "mobile-title": "Ignorance Is Not Bliss",
        })}
        <ReaderSettingsProvider>{children}</ReaderSettingsProvider>
      </body>
    </html>
  );
}
