"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GlossaryEntry } from "@/content/glossary";

type Props = {
  entry: GlossaryEntry;
  anchor: HTMLElement;
  entries: GlossaryEntry[];
  onSwitch: (next: GlossaryEntry, anchor?: HTMLElement) => void;
  onClose: () => void;
};

type Pos = { top: number; left: number; flipped: boolean };

const TOOLTIP_WIDTH = 280;

export function GlossaryTooltip({
  entry,
  anchor,
  entries,
  onSwitch,
  onClose,
}: Props) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [animate, setAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recompute = () => {
    if (!tooltipRef.current) return;
    const anchorRect = anchor.getBoundingClientRect();
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const center = anchorRect.left + anchorRect.width / 2;
    let left = center - tt.width / 2;
    left = Math.max(8, Math.min(vw - tt.width - 8, left));

    const below = anchorRect.bottom + 8;
    const above = anchorRect.top - tt.height - 8;
    const overflowsBottom = below + tt.height > vh - 8;
    const flipped = overflowsBottom && above >= 8;
    const top = flipped ? above : below;

    setPos({ top, left, flipped });
  };

  // Position + enter animation on mount.
  useLayoutEffect(() => {
    recompute();
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimate(true)),
    );
    return () => cancelAnimationFrame(raf);
    // Re-run when the entry or anchor changes (also-see navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, anchor]);

  // Recompute on resize / scroll so the tooltip stays pinned to its word.
  useEffect(() => {
    function onUpdate() {
      recompute();
    }
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, { passive: true });
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, anchor]);

  // Outside-click + Escape dismissal.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (tooltipRef.current?.contains(target)) return;
      if (anchor.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Delay the click listener by a tick so the click that opened us doesn't close us.
    const id = window.setTimeout(() => {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className="glass-capsule fixed rounded-2xl p-4 shadow-lg"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: TOOLTIP_WIDTH,
        zIndex: 70,
        opacity: animate && pos ? 1 : 0,
        transform: animate && pos ? "translateY(0)" : "translateY(4px)",
        transition:
          "opacity 150ms ease-out, transform 150ms ease-out",
      }}
    >
      <div className="flex items-baseline gap-2">
        <span
          className="text-[17px] italic"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          }}
        >
          {entry.display}
        </span>
        {entry.pronunciation ? (
          <span
            className="text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            {entry.pronunciation}
          </span>
        ) : null}
      </div>
      <div
        className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        {entry.lang}
      </div>
      <p
        className="mt-2 text-[13px] leading-snug"
        style={{
          color: "var(--ink-secondary)",
          fontFamily:
            "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {entry.definition}
      </p>
      {entry.also_see.length > 0 ? (
        <div
          className="mt-3 text-[11px]"
          style={{
            color: "var(--ink-tertiary)",
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          See also:{" "}
          {entry.also_see.map((t, i) => {
            const ref = entries.find(
              (g) => g.term.toLowerCase() === t.toLowerCase(),
            );
            if (!ref) {
              return (
                <span key={t}>
                  {t}
                  {i < entry.also_see.length - 1 ? ", " : ""}
                </span>
              );
            }
            return (
              <span key={t}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitch(ref);
                  }}
                  className="underline underline-offset-2 transition-opacity hover:opacity-80"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {ref.display}
                </button>
                {i < entry.also_see.length - 1 ? ", " : ""}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
