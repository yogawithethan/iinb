"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, ShareIcon } from "./icons";

// Centered share modal. The page blur behind it is the shared panel backdrop
// (driven by anyPanelOpen in Chrome), same as Search.
export function ShareMenu({
  animate,
  isDesktop,
  onClose,
}: {
  animate: boolean;
  isDesktop: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const url =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://iinb.yogawithethan.com";
  const shareData = {
    title: "Ignorance Is Not Bliss",
    text: "Ignorance Is Not Bliss — by Ethan Hill",
    url,
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }
  async function nativeShare() {
    try {
      await navigator.share(shareData);
      onClose();
    } catch {
      /* dismissed */
    }
  }

  const steps = [
    "Tap the Share button in Safari’s toolbar (the square with an arrow pointing up).",
    "Pick a person or app — Messages, Mail, WhatsApp, or Copy.",
    "They open the link and sign in with their email to start reading.",
  ];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[76px] z-[55] flex justify-center px-4 md:px-8 lg:px-12"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Share Ignorance Is Not Bliss"
        onClick={(e) => e.stopPropagation()}
        className="glass-capsule pointer-events-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-[22px] transition-[opacity,transform] duration-[220ms] ease-out"
        style={{
          opacity: animate ? 1 : 0,
          transform: animate ? "scale(1) translateY(0)" : "scale(0.95) translateY(-8px)",
          transformOrigin: isDesktop ? "top" : "top center",
        }}
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <div>
            <div
              className="text-[16px] font-semibold leading-tight"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
              }}
            >
              Share the book
            </div>
            <div
              className="mt-1 text-[12.5px] leading-snug"
              style={{
                color: "var(--ink-secondary)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Send someone the link to Ignorance Is Not Bliss.
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center justify-between rounded-[14px] px-4 py-3 text-left text-[14px] font-medium transition-transform active:scale-[0.99]"
              style={{
                color: "#fff",
                background: "var(--accent)",
                cursor: "pointer",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              <span>{copied ? "Link copied" : "Copy link"}</span>
              <span aria-hidden="true">
                {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              </span>
            </button>

            {canNativeShare && (
              <button
                type="button"
                onClick={nativeShare}
                className="flex items-center justify-between rounded-[14px] px-4 py-3 text-left text-[14px] font-medium transition-colors"
                style={{
                  color: "var(--ink)",
                  border: "1px solid var(--card-border)",
                  cursor: "pointer",
                  fontFamily:
                    "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                }}
              >
                <span>Share sheet…</span>
                <span aria-hidden="true">
                  <ShareIcon size={16} />
                </span>
              </button>
            )}
          </div>

          <div
            className="rounded-[14px] px-4 py-3"
            style={{ background: "var(--bg-soft)" }}
          >
            <div
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              Sharing from Safari
            </div>
            <ol className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="mt-[1px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-[12.5px] leading-snug"
                    style={{
                      color: "var(--ink-secondary)",
                      fontFamily:
                        "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
