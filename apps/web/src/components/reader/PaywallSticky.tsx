"use client";

import { useReaderSettings, type ReadingWidth } from "./SettingsContext";
import { PaywallCard } from "./PaywallCard";
import { useOpenableState } from "@/hooks/useOpenableState";

const WIDTH_PX: Record<ReadingWidth, number> = {
  narrow: 560,
  medium: 680,
  wide: 820,
};

type Props = {
  expanded: boolean;
  onToggle: () => void;
  onOpenLicense?: () => void;
  onPurchase?: () => void;
  purchasePending?: boolean;
  purchaseError?: string | null;
  /** Hide the paywall while another popover (TOC / Settings / Search) is open. */
  hidden?: boolean;
};

export function PaywallSticky({
  expanded,
  onToggle,
  onOpenLicense,
  onPurchase,
  purchasePending,
  purchaseError,
  hidden = false,
}: Props) {
  const { purchased, readingWidth } = useReaderSettings();
  const backdropAnim = useOpenableState(expanded && !hidden, 360);
  if (purchased) return null;

  return (
    <>
      {/* Blur backdrop — fades in/out smoothly. Click to collapse. */}
      {backdropAnim.mounted && (
        <div
          aria-hidden="true"
          onClick={onToggle}
          className="pointer-events-auto fixed inset-0 z-[48]"
          style={{
            backdropFilter: "blur(16px) saturate(1.1)",
            WebkitBackdropFilter: "blur(16px) saturate(1.1)",
            background: "color-mix(in srgb, var(--bg) 30%, transparent)",
            opacity: backdropAnim.animate ? 1 : 0,
            transition:
              "opacity 340ms cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 340ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}

      {/* Paywall — fixed at the viewport bottom. No top fade: text scrolls
          cleanly behind the card's top edge and the card's own bg-soft
          boundary does the visual separation. Sides stay transparent so
          the corner chrome bubbles remain visible beside the card. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[52]"
        style={{
          opacity: hidden ? 0 : 1,
          transition: "opacity 220ms ease-out",
        }}
      >
        <div
          className={`${hidden ? "pointer-events-none" : "pointer-events-auto"} mx-auto w-full px-6 md:px-10`}
          style={{ maxWidth: `${Math.min(WIDTH_PX[readingWidth], 460)}px` }}
        >
          <div className="pb-[24px] md:pb-[28px]">
            <PaywallCard
              expanded={expanded}
              onToggle={onToggle}
              onPurchase={onPurchase}
              onAlreadyPurchased={onOpenLicense}
              purchasePending={purchasePending}
              purchaseError={purchaseError}
            />
          </div>
        </div>
      </div>
    </>
  );
}
