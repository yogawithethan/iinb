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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[30]">
      {/* Very soft edge so the card's top border isn't a hard cut.
          Text above simply continues behind the card. */}
      <div
        aria-hidden="true"
        style={{
          height: 28,
          background:
            "linear-gradient(to top, var(--bg) 0%, color-mix(in srgb, var(--bg) 50%, transparent) 100%)",
        }}
      />
      <div className="w-full" style={{ background: "var(--bg)" }}>
        <div
          className="pointer-events-auto mx-auto w-full px-6 md:px-10"
          style={{ maxWidth: `${WIDTH_PX[readingWidth]}px` }}
        >
          <div className="pb-[104px] md:pb-[112px]">
            <PaywallCard
              expanded={expanded}
              onToggle={onToggle}
              onAlreadyPurchased={onOpenLicense}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
