"use client";

import {
  EyeIcon,
  InfoIcon,
  PlayIcon,
  RefreshIcon,
  SparkleIcon,
  XIcon,
} from "./icons";

const PRICE_LABEL = "$22.00";
const BOOK_TITLE = "Ignorance Is Not Bliss";
const AUTHOR = "Ethan Hill";

const FEATURES: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    title: "Listen",
    desc: "Author narration with word-by-word, karaoke highlighting that follows along.",
    icon: <PlayIcon />,
  },
  {
    title: "Absorb",
    desc: "Speed reading modes that help you understand more, faster.",
    icon: <EyeIcon />,
  },
  {
    title: "Ask",
    desc: "Ask questions about what you're reading and get answers from the book.",
    icon: <SparkleIcon />,
  },
  {
    title: "Refresh",
    desc: "Tap the refresh icon to get examples rewritten for your world.",
    icon: <RefreshIcon />,
  },
];

type Props = {
  expanded: boolean;
  onToggle: () => void;
  onPurchase?: () => void;
  onAlreadyPurchased?: () => void;
  purchasePending?: boolean;
  purchaseError?: string | null;
};

export function PaywallCard({
  expanded,
  onToggle,
  onPurchase,
  onAlreadyPurchased,
  purchasePending = false,
  purchaseError = null,
}: Props) {
  function handlePurchase() {
    if (!purchasePending) onPurchase?.();
  }

  return (
    <div
      id="paywall"
      data-chapter-anchor="paywall"
      style={{ scrollMarginTop: "120px" }}
    >
      <div
        className="w-full overflow-hidden rounded-[20px] transition-[box-shadow] duration-300"
        style={{
          border: "1px solid var(--card-border)",
          background: "var(--bg-soft)",
          boxShadow: expanded
            ? "0 20px 48px rgba(0,0,0,0.10)"
            : "0 4px 14px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header row — entire row toggles the expand */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          className="paywall-header flex cursor-pointer select-none items-start justify-between gap-3 px-4 py-3.5 transition-colors sm:px-5"
        >
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[15px] font-semibold leading-tight"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
              }}
            >
              {BOOK_TITLE}
            </div>
            <div
              className="mt-0.5 truncate text-[12px] italic"
              style={{ color: "var(--ink-secondary)" }}
            >
              {AUTHOR}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Compact price pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePurchase();
              }}
              aria-hidden={expanded ? "true" : "false"}
              tabIndex={expanded ? -1 : 0}
              disabled={purchasePending}
              className="paywall-price-compact rounded-full px-4 py-2 text-[13px] font-medium transition-[opacity,transform,width,margin] duration-300 ease-out"
              style={{
                background: "var(--accent)",
                color: "#fff",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                opacity: expanded ? 0 : 1,
                transform: expanded
                  ? "scale(0.88) translateX(6px)"
                  : "scale(1)",
                pointerEvents: expanded ? "none" : "auto",
                width: expanded ? 0 : "auto",
                marginRight: expanded ? -6 : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {purchasePending ? "Opening…" : PRICE_LABEL}
            </button>
            {/* Info / X indicator (not a separate button — the row is the button) */}
            <span
              aria-hidden="true"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
              style={{
                color: "var(--ink-secondary)",
                border: "1px solid var(--pill-border)",
              }}
            >
              {expanded ? <XIcon size={16} /> : <InfoIcon size={16} />}
            </span>
          </div>
        </div>

        {/* Expandable body — grid-template-rows animates on actual content
            height. Wrap the bordered content in an overflow:hidden shell so
            the border/padding are clipped when collapsed (no 1px leak). */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: expanded ? "1fr" : "0fr",
            opacity: expanded ? 1 : 0,
            transition:
              "grid-template-rows 440ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div style={{ minHeight: 0, overflow: "hidden" }}>
          <div
            className="px-4 pb-5 pt-1 sm:px-5"
            style={{
              borderTop: "1px solid var(--card-border)",
            }}
          >
            <ul className="flex flex-col gap-4 pt-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {f.icon}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold leading-snug"
                      style={{
                        color: "var(--ink)",
                        fontFamily:
                          "var(--font-lora), ui-serif, Georgia, serif",
                      }}
                    >
                      {f.title}
                    </div>
                    <div
                      className="mt-1 text-[12.5px] leading-snug"
                      style={{
                        color: "var(--ink-secondary)",
                        fontFamily:
                          "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                      }}
                    >
                      {f.desc}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Full-width price CTA with hover lift */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePurchase();
              }}
              disabled={purchasePending}
              className="paywall-price-full mt-6 w-full rounded-full py-3.5 text-[15px] font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "var(--accent)",
                color: "#fff",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              {purchasePending ? "Opening secure checkout…" : PRICE_LABEL}
            </button>

            {purchaseError ? <p role="alert" className="mt-3 text-center text-[12px]" style={{ color: "#a23a2f" }}>{purchaseError}</p> : null}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAlreadyPurchased?.();
              }}
              className="mt-3 w-full text-center text-[12px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{
                color: "var(--ink-secondary)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Already purchased?
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
