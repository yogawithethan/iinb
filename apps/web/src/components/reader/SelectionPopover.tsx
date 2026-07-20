"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyIcon, HighlightIcon, NoteIcon, XIcon } from "./icons";
import { useHighlights } from "./HighlightsContext";

const HIGHLIGHT_NAME = "iinb-highlight";
const COPY_ATTRIBUTION = "— Ignorance Is Not Bliss by Ethan Hill";

type Pos = { top: number; left: number };

function highlightsApiSupported(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

/**
 * We used to gate the popover on the selection living inside `.reader-prose`.
 * That check was dropping selections whose range.startContainer was a text
 * node inside a bionic <b> or an intermediate inline element, and it varied
 * oddly between the dedication (where the popover worked) and chapter
 * paragraphs (where it didn't). The selection popover is cheap, so just
 * reject the obvious non-reading targets: form inputs, our own popovers,
 * and anywhere inside the chrome/modal stack.
 */
function selectionIsOutOfBounds(range: Range): boolean {
  const container = range.commonAncestorContainer;
  const el =
    container.nodeType === Node.ELEMENT_NODE
      ? (container as Element)
      : container.parentElement;
  if (!el) return false;
  if (el.closest("input, textarea, [contenteditable='true']")) return true;
  if (
    el.closest(
      ".iinb-selpop, .glass-capsule, [role='dialog'], [role='tablist']",
    )
  ) {
    return true;
  }
  return false;
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
  const { addHighlight, highlights, removeHighlight } = useHighlights();
  /** Any existing highlight that overlaps the current selection. Null if
   * the selection covers only virgin text. */
  const overlappingIdRef = useRef<string | null>(null);
  const [overlappingId, setOverlappingId] = useState<string | null>(null);
  /** Mirror `highlights` into a ref so `syncFromSelection` can stay
   * referentially stable — otherwise every new highlight re-subscribes
   * the pointerup/mouseup listeners, and an in-flight setTimeout can
   * land with a stale closure. */
  const highlightsRef = useRef(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

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
    if (selectionIsOutOfBounds(range)) {
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

    // Detect any existing highlight that intersects this selection.
    let overlap: string | null = null;
    for (const h of highlightsRef.current) {
      if (!h.range) continue;
      try {
        const cmpEnd = range.compareBoundaryPoints(Range.START_TO_END, h.range);
        const cmpStart = range.compareBoundaryPoints(Range.END_TO_START, h.range);
        // Overlap = this.start < other.end && this.end > other.start
        if (cmpEnd > 0 && cmpStart < 0) {
          overlap = h.id;
          break;
        }
      } catch {
        // Ranges from detached documents can throw — ignore.
      }
    }
    overlappingIdRef.current = overlap;
    setOverlappingId(overlap);

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
    overlappingIdRef.current = null;
    setOverlappingId(null);
    setPos(null);
  }

  function unhighlight() {
    const id = overlappingIdRef.current;
    if (id) removeHighlight(id);
    dismiss();
  }

  function highlight() {
    const range = rangeRef.current;
    if (!range) return;
    if (!apiOk) {
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
      {overlappingId ? (
        <button
          type="button"
          onClick={unhighlight}
          aria-label="Remove highlight"
          title="Remove highlight"
          className="iinb-selpop-btn flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{
            color: "var(--ink)",
            background:
              "color-mix(in srgb, var(--ink-tertiary) 16%, transparent)",
          }}
        >
          <XIcon size={14} />
        </button>
      ) : (
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
      )}
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
