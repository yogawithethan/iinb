"use client";

import { useReaderSettings, type ReadingWidth } from "./SettingsContext";

const WIDTH_PX: Record<ReadingWidth, number> = {
  narrow: 560,
  medium: 680,
  wide: 820,
};

type Props = {
  onLogin: () => void;
  /** Hide while another popover (TOC / Settings / Search / auth) is open. */
  hidden?: boolean;
};

// Sticky gate shown to signed-out readers at the end of the Ch 0 teaser:
// Chapters 0 & 1 are free with an account. Distinct from the purchase paywall.
export function LoginGate({ onLogin, hidden = false }: Props) {
  const { readingWidth } = useReaderSettings();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[52]"
      style={{
        opacity: hidden ? 0 : 1,
        transition: "opacity 220ms ease-out",
      }}
    >
      <div
        className={`${hidden ? "pointer-events-none" : "pointer-events-auto"} mx-auto w-full px-6 md:px-10`}
        style={{ maxWidth: `${WIDTH_PX[readingWidth]}px` }}
      >
        <div className="pb-[24px] md:pb-[28px]">
          <div
            className="w-full overflow-hidden rounded-[20px] px-5 py-4"
            style={{
              border: "1px solid var(--card-border)",
              background: "var(--bg-soft)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="text-[15px] font-semibold leading-tight"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
              }}
            >
              Chapters 0 &amp; 1 are free
            </div>
            <div
              className="mt-1 text-[12.5px] leading-snug"
              style={{
                color: "var(--ink-secondary)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Create a free account or log in to keep reading &mdash; no purchase
              needed.
            </div>
            <button
              type="button"
              onClick={onLogin}
              className="mt-4 w-full rounded-full py-3 text-[14px] font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "var(--accent)",
                color: "#fff",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              Log in or create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
