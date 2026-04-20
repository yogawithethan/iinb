"use client";

import { useCallback, useEffect, useState } from "react";
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

function isWithinReader(node: Node | null): boolean {
  while (node && node !== document.body) {
    if (node instanceof HTMLElement && node.classList.contains("reader-prose")) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

export function SelectionPopover() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [apiOk, setApiOk] = useState(true);

  useEffect(() => {
    setApiOk(highlightsApiSupported());
  }, []);

  const updateFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!isWithinReader(range.commonAncestorContainer)) {
      setPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPos(null);
      return;
    }
    // Center horizontally above the selection. Offset for popover height.
    setPos({
      top: rect.top + window.scrollY - 52,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    function onPointerUp() {
      // Wait a frame for the selection to finalize.
      window.setTimeout(updateFromSelection, 10);
    }
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setPos(null);
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
  }, [updateFromSelection]);

  function applyHighlight(color: HighlightColor) {
    if (!apiOk) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0).cloneRange();
    const name = `iinb-hl-${color}`;
    const existing = CSS.highlights.get(name);
    if (existing) {
      existing.add(range);
    } else {
      CSS.highlights.set(name, new Highlight(range));
    }
    sel.removeAllRanges();
    setPos(null);
  }

  async function copy() {
    const sel = window.getSelection();
    if (!sel) return;
    const text = sel.toString();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may be blocked — fall through silently
    }
    sel.removeAllRanges();
    setPos(null);
  }

  function addNote() {
    const sel = window.getSelection();
    if (!sel) return;
    const text = sel.toString();
    const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    const note = window.prompt(`Note for "${preview}"`);
    if (note) {
      // TODO: wire into persistent storage once highlights have a store
      // eslint-disable-next-line no-console
      console.info("Note saved:", { text, note });
    }
    sel.removeAllRanges();
    setPos(null);
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
      // Clicking the popover shouldn't blur the selection before our handler runs.
      onMouseDown={(e) => e.preventDefault()}
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
