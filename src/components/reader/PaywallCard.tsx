"use client";

import { useState } from "react";
import {
  EyeIcon,
  InfoIcon,
  PlayIcon,
  RefreshIcon,
  SparkleIcon,
  XIcon,
} from "./icons";

// When you set up the Lemon Squeezy product, export the checkout URL as
// NEXT_PUBLIC_LS_CHECKOUT_URL. Until then the price button opens a stub.
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_LS_CHECKOUT_URL ?? "";

const PRICE_LABEL = "$14.99";
const BOOK_TITLE = "Ignorance is not Bliss";
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
  onPurchase?: () => void;
  onAlreadyPurchased?: () => void;
};

export function PaywallCard({ onPurchase, onAlreadyPurchased }: Props) {
  const [expanded, setExpanded] = useState(false);

  function handlePurchase() {
    if (onPurchase) onPurchase();
    else if (CHECKOUT_URL) window.open(CHECKOUT_URL, "_blank");
    else alert("Lemon Squeezy checkout URL not yet configured");
  }

  return (
    <div className="my-16">
      <div
        className="w-full overflow-hidden rounded-[20px] transition-[box-shadow] duration-200"
        style={{
          border: "1px solid var(--card-border)",
          background: "var(--bg-soft)",
          boxShadow: expanded
            ? "0 12px 32px rgba(0,0,0,0.08)"
            : "0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <div
              className="truncate text-[15px] font-semibold leading-tight"
              style={{
                color: "var(--ink)",
                fontFamily:
                  "var(--font-lora), ui-serif, Georgia, serif",
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
            <button
              type="button"
              onClick={handlePurchase}
              className="rounded-full px-4 py-2 text-[13px] font-medium transition-transform active:scale-95"
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {PRICE_LABEL}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Hide features" : "Show features"}
              aria-expanded={expanded}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{
                color: "var(--ink-secondary)",
                border: "1px solid var(--pill-border)",
              }}
            >
              {expanded ? <XIcon size={16} /> : <InfoIcon size={16} />}
            </button>
          </div>
        </div>

        {/* Expandable feature list with spring easing */}
        <div
          style={{
            maxHeight: expanded ? "640px" : "0px",
            opacity: expanded ? 1 : 0,
            transition:
              "max-height 420ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 240ms ease-out",
            overflow: "hidden",
          }}
        >
          <div
            className="px-4 pb-5 pt-1 sm:px-5"
            style={{ borderTop: "1px solid var(--card-border)" }}
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

            <button
              type="button"
              onClick={onAlreadyPurchased}
              className="mt-5 text-[12px] underline underline-offset-4 transition-opacity hover:opacity-70"
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
  );
}
