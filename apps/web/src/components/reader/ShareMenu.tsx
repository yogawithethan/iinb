"use client";

import { useEffect, useRef, useState } from "react";

// Compact share popover anchored above the Share bubble. Copy-link always;
// native share sheet where the platform offers one.
export function ShareMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

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
      setTimeout(() => setCopied(false), 1600);
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

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[55] flex justify-center px-4 md:justify-end md:px-8 lg:px-12">
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="glass-capsule pointer-events-auto w-full max-w-[280px] overflow-hidden rounded-[18px] p-1.5"
      >
        <div
          className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.1em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Share the book
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[14px] transition-opacity hover:opacity-70"
          style={{ color: "var(--ink)" }}
        >
          <span>Copy link</span>
          <span
            className="text-[12px]"
            style={{ color: "var(--accent-ink, var(--ink-tertiary))" }}
          >
            {copied ? "Copied!" : ""}
          </span>
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="w-full rounded-[12px] px-3 py-2.5 text-left text-[14px] transition-opacity hover:opacity-70"
            style={{ color: "var(--ink)" }}
          >
            Share via&hellip;
          </button>
        )}
      </div>
    </div>
  );
}
