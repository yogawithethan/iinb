"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReaderSettings } from "./SettingsContext";
import { XIcon } from "./icons";
import type { ReaderNode } from "@/content/stream";

type WordEntry = {
  word: string;
  anchor: string; // "{chapterId}::{blockIdx}"
};

function htmlToText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

function buildStream(nodes: ReaderNode[]): WordEntry[] {
  const out: WordEntry[] = [];
  for (const node of nodes) {
    if (node.kind !== "chapter") continue; // skip dedication + part title pages
    const { chapter } = node;
    for (let i = 0; i < chapter.blocks.length; i++) {
      const b = chapter.blocks[i];
      if (b.type === "separator" || b.type === "audio") continue;
      const text = htmlToText(b.html);
      const words = text.split(/\s+/).filter(Boolean);
      const anchor = `${chapter.id}::${i}`;
      for (const w of words) out.push({ word: w, anchor });
    }
  }
  return out;
}

export function RsvpOverlay({ nodes }: { nodes: ReaderNode[] }) {
  const { rsvpEnabled, rsvpWpm, update } = useReaderSettings();
  const words = useMemo(() => buildStream(nodes), [nodes]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  // Pick starting index from current scroll position when RSVP enables.
  useEffect(() => {
    if (!rsvpEnabled || typeof window === "undefined") return;
    const scrollThreshold = window.scrollY + 140;
    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>("[data-p-anchor]"),
    );
    let chosenAnchor = anchors[0]?.dataset.pAnchor ?? "";
    for (const a of anchors) {
      if (a.offsetTop >= scrollThreshold) {
        chosenAnchor = a.dataset.pAnchor ?? chosenAnchor;
        break;
      }
      chosenAnchor = a.dataset.pAnchor ?? chosenAnchor;
    }
    const start = words.findIndex((w) => w.anchor === chosenAnchor);
    setIdx(start >= 0 ? start : 0);
    setPlaying(true);
  }, [rsvpEnabled, words]);

  // Advance timer
  useEffect(() => {
    if (!rsvpEnabled || !playing) return;
    if (idx >= words.length - 1) {
      setPlaying(false);
      return;
    }
    const base = 60000 / rsvpWpm;
    const current = words[idx];
    // Hold long words slightly longer so the reader can register them.
    const extra = Math.max(0, current.word.length - 6) * 12;
    // Punctuation at the end: brief extra pause for phrasing.
    const punct = /[.!?,;:]$/.test(current.word) ? 120 : 0;
    timerRef.current = window.setTimeout(
      () => setIdx((i) => Math.min(words.length - 1, i + 1)),
      base + extra + punct,
    );
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [rsvpEnabled, playing, idx, rsvpWpm, words]);

  const exit = useCallback(() => {
    update({ rsvpEnabled: false });
    const entry = words[idx];
    if (!entry) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-p-anchor="${CSS.escape(entry.anchor)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [idx, update, words]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!rsvpEnabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 10));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIdx((i) => Math.min(words.length - 1, i + 10));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        update({ rsvpWpm: Math.min(800, rsvpWpm + 25) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        update({ rsvpWpm: Math.max(200, rsvpWpm - 25) });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rsvpEnabled, exit, rsvpWpm, update, words.length]);

  if (!rsvpEnabled) return null;

  const current = words[idx]?.word ?? "";
  const next = words[idx + 1]?.word ?? "";
  const prev = words[idx - 1]?.word ?? "";
  const progress = words.length
    ? ((idx + 1) / words.length) * 100
    : 0;

  // Optimal Recognition Point — accent color on roughly the 35% character.
  const orp = Math.max(0, Math.min(current.length - 1, Math.floor((current.length - 1) * 0.35)));

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "var(--bg)" }}
      role="dialog"
      aria-label="RSVP reader"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div
          className="text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          RSVP · {rsvpWpm} wpm
        </div>
        <button
          type="button"
          onClick={exit}
          aria-label="Exit RSVP"
          className="glass-bubble flex h-[34px] w-[34px] items-center justify-center rounded-full"
          style={{ color: "var(--ink)" }}
        >
          <XIcon />
        </button>
      </div>

      {/* Center word */}
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Resume"}
        className="flex flex-1 flex-col items-center justify-center px-6 outline-none"
      >
        <div
          className="mb-3 text-[13px] italic"
          style={{ color: "var(--ink-tertiary)", minHeight: "1.4em" }}
        >
          {prev}
        </div>
        <div
          className="font-serif leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
            fontSize: "clamp(40px, 9vw, 88px)",
            letterSpacing: "0.02em",
          }}
        >
          <span>{current.slice(0, orp)}</span>
          <span style={{ color: "var(--accent)" }}>{current.charAt(orp)}</span>
          <span>{current.slice(orp + 1)}</span>
        </div>
        <div
          className="mt-6 h-[2px] w-12"
          style={{
            background:
              "color-mix(in srgb, var(--ink-tertiary) 50%, transparent)",
          }}
        />
        <div
          className="mt-3 text-[13px]"
          style={{ color: "var(--ink-tertiary)", minHeight: "1.4em" }}
        >
          {next}
        </div>
        {!playing && (
          <div
            className="mt-10 text-[11px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Paused · tap to resume
          </div>
        )}
      </button>

      {/* Hints + progress */}
      <div className="px-5 pb-4">
        <div
          className="mb-3 text-center text-[10px] uppercase tracking-[0.12em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          space · ← 10 back · 10 fwd → · ↑↓ speed · esc exit
        </div>
        <div
          className="h-[2px] w-full overflow-hidden rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--ink-tertiary) 20%, transparent)",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--accent)",
              transition: "width 120ms linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
