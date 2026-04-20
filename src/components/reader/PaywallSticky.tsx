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
  /** Hide the paywall while another popover (TOC / Settings / Search) is open. */
  hidden?: boolean;
};

export function PaywallSticky({
  expanded,
  onToggle,
  onOpenLicense,
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

      {/* Paywall card — above the chrome (z-50) so its CTAs are clickable.
          Sides are transparent so the corner bubbles (Play / Search / Share)
          remain visible and tappable. When a popover is open we fade this
          out so it doesn't peek through behind the popover's backdrop. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[52]"
        style={{
          opacity: hidden ? 0 : 1,
          transition: "opacity 220ms ease-out",
        }}
      >
        {/* Soft fade so text keeps going behind the card, no hard cut */}
        <div
          aria-hidden="true"
          style={{
            height: 110,
            background: `linear-gradient(
              to top,
              var(--bg) 0%,
              var(--bg) 30%,
              color-mix(in srgb, var(--bg) 72%, transparent) 60%,
              color-mix(in srgb, var(--bg) 36%, transparent) 82%,
              color-mix(in srgb, var(--bg) 0%, transparent) 100%
            )`,
          }}
        />
        <div
          className={`${hidden ? "pointer-events-none" : "pointer-events-auto"} mx-auto w-full px-6 md:px-10`}
          style={{ maxWidth: `${WIDTH_PX[readingWidth]}px` }}
        >
          <div className="pb-[24px] md:pb-[28px]">
            <PaywallCard
              expanded={expanded}
              onToggle={onToggle}
              onAlreadyPurchased={onOpenLicense}
            />
          </div>
        </div>
      </div>
    </>
  );
}
