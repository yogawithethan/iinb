"use client";

import { useReaderSettings, type ReadingWidth } from "./SettingsContext";
import { PaywallCard } from "./PaywallCard";

const WIDTH_PX: Record<ReadingWidth, number> = {
  narrow: 560,
  medium: 680,
  wide: 820,
};

type Props = {
  expanded: boolean;
  onToggle: () => void;
  onOpenLicense?: () => void;
};

export function PaywallSticky({ expanded, onToggle, onOpenLicense }: Props) {
  const { purchased, readingWidth } = useReaderSettings();
  if (purchased) return null;

  return (
    <>
      {/* Blur backdrop while expanded — same pattern as settings/TOC.
          Click anywhere outside the card to collapse. */}
      {expanded && (
        <div
          aria-hidden="true"
          onClick={onToggle}
          className="pointer-events-auto fixed inset-0 z-[48] transition-opacity duration-[220ms]"
          style={{
            backdropFilter: "blur(14px) saturate(1.1)",
            WebkitBackdropFilter: "blur(14px) saturate(1.1)",
            background: "color-mix(in srgb, var(--bg) 35%, transparent)",
          }}
        />
      )}

      {/* Paywall card — above the chrome (z-50) so its CTAs are clickable.
          Sides are transparent so the corner bubbles (Play / Search / Share)
          remain visible and tappable. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[52]">
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
          className="pointer-events-auto mx-auto w-full px-6 md:px-10"
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
