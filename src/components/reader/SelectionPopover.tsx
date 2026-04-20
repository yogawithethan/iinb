"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyIcon, NoteIcon } from "./icons";

type HighlightColor = "yellow" | "blue" | "green" | "pink";

const COLORS: { id: HighlightColor; bg: string }[] = [
  { id: "yellow", bg: "#ffe476" },
  { id: "blue", bg: "#8fcaff" },
  { id: "green", bg: "#a8e0a0" },
  { id: "pink", bg: "#ffa5c8" },
];

type Pos = { top: number; left: number };

function highlightsApiSupported(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

/** A selection counts if either endpoint is inside `.reader-prose`. */
function selectionInsideReader(range: Range): boolean {
  const root = document.querySelector(".reader-prose");
  if (!root) return false;
  return (
    root.contains(range.startContainer) || root.contains(range.endContainer)
  );
}

export function SelectionPopover() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [apiOk, setApiOk] = useState(true);
  /** The range captured at the moment the popover is shown. Survives the
   * selection being blurred when the user clicks a popover button. */
  const rangeRef = useRef<Range | null>(null);

  useEffect(() => {
    setApiOk(highlightsApiSupported());
  }, []);

  const POPOVER_WIDTH = 260;

  const syncFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      rangeRef.current = null;
      setPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!selectionInsideReader(range)) {
      rangeRef.current = null;
      setPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      rangeRef.current = null;
      setPos(null);
      return;
    }
    rangeRef.current = range.cloneRange();
    const top = Math.max(12, rect.top + window.scrollY - 52);
    const rawLeft = rect.left + window.scrollX + rect.width / 2;
    const half = POPOVER_WIDTH / 2;
    const minLeft = window.scrollX + half + 12;
    const maxLeft = window.scrollX + window.innerWidth - half - 12;
    const left = Math.max(minLeft, Math.min(maxLeft, rawLeft));
    setPos({ top, left });
  }, []);

  useEffect(() => {
    function onPointerUp() {
      // Give the browser one frame to finalize the selection.
      window.setTimeout(syncFromSelection, 10);
    }
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        rangeRef.current = null;
        setPos(null);
      }
    }
    function onScroll() {
      setPos(null);
    }
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, [syncFromSelection]);

  function dismiss() {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    rangeRef.current = null;
    setPos(null);
  }

  function applyHighlight(color: HighlightColor) {
    const range = rangeRef.current;
    if (!range) return;
    if (!apiOk) {
      // eslint-disable-next-line no-alert
      alert(
        "Your browser doesn't support persistent highlights yet (CSS Highlight API). Upgrade Safari 17.2+ or Chrome 105+.",
      );
      return;
    }
    const name = `iinb-hl-${color}`;
    const existing = CSS.highlights.get(name);
    if (existing) {
      existing.add(range);
    } else {
      CSS.highlights.set(name, new Highlight(range));
    }
    dismiss();
  }

  async function copy() {
    const range = rangeRef.current;
    if (!range) return;
    const text = range.toString();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may be blocked — silent fallback
    }
    dismiss();
  }

  function addNote() {
    const range = rangeRef.current;
    if (!range) return;
    const text = range.toString();
    const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    const note = window.prompt(`Note for "${preview}"`);
    if (note) {
      // TODO: wire into persistent storage once highlights have a store
      // eslint-disable-next-line no-console
      console.info("Note saved:", { text, note });
    }
    dismiss();
  }

  if (!pos) return null;

  return (
    <div
      className="iinb-selpop glass-capsule pointer-events-auto fixed z-[60] flex items-center gap-1 rounded-full px-2 py-1.5"
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
      }}
      // Cache the range on mousedown so the subsequent click can use it even
      // though the browser will clear the live selection when focus shifts.
      onMouseDown={(e) => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount) {
          rangeRef.current = sel.getRangeAt(0).cloneRange();
        }
        e.preventDefault();
      }}
    >
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => applyHighlight(c.id)}
          aria-label={`Highlight ${c.id}`}
          title={`Highlight ${c.id}`}
          className="h-7 w-7 rounded-full transition-transform duration-150 hover:scale-[1.12] active:scale-95"
          style={{
            background: c.bg,
            border: "1.5px solid rgba(0, 0, 0, 0.1)",
          }}
        />
      ))}
      <span
        className="mx-1 h-5 w-px flex-shrink-0"
        style={{ background: "var(--pill-border)" }}
      />
      <button
        type="button"
        onClick={addNote}
        aria-label="Add note"
        title="Add note"
        className="iinb-selpop-btn flex h-7 w-7 items-center justify-center rounded-full transition-colors"
        style={{ color: "var(--ink)" }}
      >
        <NoteIcon size={14} />
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy"
        title="Copy"
        className="iinb-selpop-btn flex h-7 w-7 items-center justify-center rounded-full transition-colors"
        style={{ color: "var(--ink)" }}
      >
        <CopyIcon size={14} />
      </button>
    </div>
  );
}
