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

// Compact sticky gate for signed-out readers at the end of the Ch 0 teaser.
// Kept deliberately small and opaque so it never fights the cover art.
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
            className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3"
            style={{
              border: "1px solid var(--card-border)",
              background: "var(--card-bg, var(--bg-soft))",
              boxShadow: "0 8px 28px rgba(26, 23, 18, 0.14)",
            }}
          >
            <div className="min-w-0 flex-1">
              <div
                className="text-[14px] font-semibold leading-tight"
                style={{
                  color: "var(--ink)",
                  fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
                }}
              >
                Keep reading
              </div>
              <div
                className="mt-0.5 truncate text-[12px]"
                style={{
                  color: "var(--ink-secondary)",
                  fontFamily:
                    "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                }}
              >
                The next two chapters are free with an account.
              </div>
            </div>
            <button
              type="button"
              onClick={onLogin}
              className="flex-shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-transform active:scale-95"
              style={{
                background: "var(--accent)",
                color: "#fff",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
