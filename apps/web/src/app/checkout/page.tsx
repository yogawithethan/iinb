import type { Metadata } from "next";

import { ProductCheckoutEmbed } from "./ProductCheckoutEmbed";

export const metadata: Metadata = {
  title: "Checkout · Ignorance Is Not Bliss",
  description: "Purchase lifetime access to Ignorance Is Not Bliss by Ethan Hill.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const preview = (await searchParams).preview === "1";
  return <ProductCheckoutEmbed preview={preview} />;
}
