"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyIcon, HighlightIcon, NoteIcon } from "./icons";
import { useHighlights } from "./HighlightsContext";

const HIGHLIGHT_NAME = "iinb-highlight";
const COPY_ATTRIBUTION = "— Ignorance is not Bliss by Ethan Hill";

type Pos = { top: number; left: number };

function highlightsApiSupported(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

/** A selection counts if either endpoint is inside `.reader-prose`.
 * Falls through to true if the reader element isn't found yet (edge case
 * during hydration). */
function selectionInsideReader(range: Range): boolean {
  const root = document.querySelector(".reader-prose");
  if (!root) return true;
  return (
    root.contains(range.startContainer) || root.contains(range.endContainer)
  );
}

function registerHighlight(range: Range): boolean {
  if (!highlightsApiSupported()) return false;
  const existing = CSS.highlights.get(HIGHLIGHT_NAME);
  if (existing) {
    existing.add(range);
  } else {
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
  }
  return true;
}

export function SelectionPopover() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [apiOk, setApiOk] = useState(true);
  /** Survives the browser clearing the live selection on button click. */
  const rangeRef = useRef<Range | null>(null);
  const { addHighlight } = useHighlights();

  useEffect(() => {
    setApiOk(highlightsApiSupported());
  }, []);

  const POPOVER_WIDTH = 220;

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
    // Listen to every release event the browser might use. Whichever fires
    // first triggers the sync — the others become no-ops because the
    // selection is already resolved.
    function onUp() {
      window.setTimeout(syncFromSelection, 10);
    }
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        rangeRef.current = null;
        setPos(null);
      }
    }
    document.addEventListener("pointerup", onUp);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [syncFromSelection]);

  function dismiss() {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    rangeRef.current = null;
    setPos(null);
  }

  function highlight() {
    const range = rangeRef.current;
    if (!range) return;
    if (!apiOk) {
      // eslint-disable-next-line no-alert
      alert(
        "Your browser doesn't support persistent highlights yet. Upgrade to Safari 17.2+ or Chrome 105+.",
      );
      return;
    }
    registerHighlight(range);
    addHighlight(range.toString(), range);
    dismiss();
  }

  function addNote() {
    const range = rangeRef.current;
    if (!range) return;
    const text = range.toString();
    const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    const note = window.prompt(`Note for "${preview}"`);
    if (!note || !note.trim()) {
      dismiss();
      return;
    }
    registerHighlight(range);
    addHighlight(text, range, note.trim());
    dismiss();
  }

  async function copy() {
    const range = rangeRef.current;
    if (!range) return;
    const text = range.toString();
    const payload = `${text}\n\n${COPY_ATTRIBUTION}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // clipboard may be blocked — silent fallback
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
      onMouseDown={(e) => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount) {
          rangeRef.current = sel.getRangeAt(0).cloneRange();
        }
        e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={highlight}
        aria-label="Highlight"
        title="Highlight"
        className="iinb-selpop-btn flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{
          color: "var(--accent-ink)",
          background: "var(--accent-soft)",
        }}
      >
        <HighlightIcon size={15} />
      </button>
      <button
        type="button"
        onClick={addNote}
        aria-label="Add note"
        title="Add note"
        className="iinb-selpop-btn flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{ color: "var(--ink)" }}
      >
        <NoteIcon size={14} />
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy with attribution"
        title="Copy with attribution"
        className="iinb-selpop-btn flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{ color: "var(--ink)" }}
      >
        <CopyIcon size={14} />
      </button>
    </div>
  );
}
