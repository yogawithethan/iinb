"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReaderSettings, type SyncedHighlight } from "./SettingsContext";

const HIGHLIGHT_NAME = "iinb-highlight";

export type HighlightEntry = {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
  anchor?: string;
  startOffset?: number;
  endOffset?: number;
  /** Client-only reference to the live Range. Not serialized. */
  range?: Range;
};

type Ctx = {
  highlights: HighlightEntry[];
  addHighlight: (
    text: string,
    range: Range,
    note?: string,
  ) => HighlightEntry;
  updateNote: (id: string, note: string | undefined) => void;
  removeHighlight: (id: string) => void;
};

const HighlightsCtx = createContext<Ctx | null>(null);

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function removeRangeFromCssHighlights(range: Range) {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  const hl = CSS.highlights.get(HIGHLIGHT_NAME);
  hl?.delete(range);
}

function rangeDescriptor(range: Range): Pick<SyncedHighlight, "anchor" | "startOffset" | "endOffset"> {
  const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer as Element
    : range.startContainer.parentElement;
  const endElement = range.endContainer.nodeType === Node.ELEMENT_NODE
    ? range.endContainer as Element
    : range.endContainer.parentElement;
  const root = startElement?.closest<HTMLElement>("[data-p-anchor]");
  if (!root || endElement?.closest("[data-p-anchor]") !== root) return {};
  try {
    const beforeStart = document.createRange();
    beforeStart.selectNodeContents(root);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const beforeEnd = document.createRange();
    beforeEnd.selectNodeContents(root);
    beforeEnd.setEnd(range.endContainer, range.endOffset);
    return {
      anchor: root.dataset.pAnchor,
      startOffset: beforeStart.toString().length,
      endOffset: beforeEnd.toString().length,
    };
  } catch {
    return {};
  }
}

function textPoint(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length || 0;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    node = walker.nextNode();
  }
  return null;
}

function restoreRange(entry: SyncedHighlight): Range | undefined {
  if (!entry.anchor || !Number.isFinite(entry.startOffset) || !Number.isFinite(entry.endOffset)) return;
  const root = document.querySelector<HTMLElement>(`[data-p-anchor="${CSS.escape(entry.anchor)}"]`);
  if (!root) return;
  const start = textPoint(root, Number(entry.startOffset));
  const end = textPoint(root, Number(entry.endOffset));
  if (!start || !end) return;
  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  } catch {
    return;
  }
}

export function HighlightsProvider({ children }: { children: ReactNode }) {
  const { purchased, syncedHighlights, readerSyncReady } = useReaderSettings();
  const [highlights, setHighlights] = useState<HighlightEntry[]>([]);
  const highlightsRef = useRef(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  // Rebuild the CSS.highlights registry from the current list of ranges.
  // We fully replace the Highlight instance each call — that forces the
  // browser to re-paint, which is what we want after DOM mutations inside
  // the reader prose (e.g. the footnote controller inserting/removing
  // inline text spans that sit between a highlight's boundary points).
  const rebuildCssHighlights = useCallback(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
    const ranges = highlightsRef.current
      .map((h) => h.range)
      .filter((r): r is Range => Boolean(r));
    if (ranges.length === 0) {
      CSS.highlights.delete(HIGHLIGHT_NAME);
      return;
    }
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
  }, []);

  // Watch the reader prose for DOM mutations and rebuild highlights when
  // they happen. Without this, hovering a footnote ref inside a
  // highlighted paragraph (FootnoteController inserts/removes a sibling
  // <span>) leaves CSS.highlights holding a Range whose surrounding DOM
  // has shifted, and the paint silently drops.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (typeof MutationObserver === "undefined") return;
    let root = document.querySelector(".reader-prose");
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        rebuildCssHighlights();
      });
    };
    const obs = new MutationObserver(schedule);
    const attach = () => {
      root = document.querySelector(".reader-prose");
      if (root) obs.observe(root, { childList: true, subtree: true });
    };
    attach();
    // If the reader prose mounts after us, retry on the next frame.
    if (!root) {
      const retry = window.requestAnimationFrame(attach);
      return () => {
        window.cancelAnimationFrame(retry);
        obs.disconnect();
        if (frame) window.cancelAnimationFrame(frame);
      };
    }
    return () => {
      obs.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rebuildCssHighlights]);

  useEffect(() => {
    if (!purchased || !readerSyncReady) return;
    const restored = syncedHighlights
      .filter((entry) => entry && typeof entry.id === "string" && typeof entry.text === "string")
      .map((entry) => ({ ...entry, range: restoreRange(entry) }));
    setHighlights(restored);
    if (typeof CSS !== "undefined" && "highlights" in CSS) {
      const ranges = restored.map((entry) => entry.range).filter((range): range is Range => Boolean(range));
      if (ranges.length) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
      else CSS.highlights.delete(HIGHLIGHT_NAME);
    }
  }, [purchased, readerSyncReady, syncedHighlights]);

  useEffect(() => {
    if (!purchased || !readerSyncReady) return;
    const timer = window.setTimeout(() => {
      const serialized: SyncedHighlight[] = highlights.map((entry) => ({
        id: entry.id,
        text: entry.text,
        note: entry.note,
        createdAt: entry.createdAt,
        anchor: entry.anchor,
        startOffset: entry.startOffset,
        endOffset: entry.endOffset,
      }));
      void fetch("/api/reader-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ highlights: serialized }),
      }).catch(() => null);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [highlights, purchased, readerSyncReady]);

  const addHighlight = useCallback<Ctx["addHighlight"]>(
    (text, range, note) => {
      const entry: HighlightEntry = {
        id: uuid(),
        text,
        note,
        createdAt: Date.now(),
        range,
        ...rangeDescriptor(range),
      };
      setHighlights((prev) => [...prev, entry]);
      return entry;
    },
    [],
  );

  const updateNote = useCallback<Ctx["updateNote"]>((id, note) => {
    setHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, note } : h)),
    );
  }, []);

  const removeHighlight = useCallback<Ctx["removeHighlight"]>((id) => {
    setHighlights((prev) => {
      const target = prev.find((h) => h.id === id);
      if (target?.range) removeRangeFromCssHighlights(target.range);
      return prev.filter((h) => h.id !== id);
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ highlights, addHighlight, updateNote, removeHighlight }),
    [highlights, addHighlight, updateNote, removeHighlight],
  );

  return (
    <HighlightsCtx.Provider value={value}>{children}</HighlightsCtx.Provider>
  );
}

export function useHighlights(): Ctx {
  const ctx = useContext(HighlightsCtx);
  if (!ctx)
    throw new Error(
      "useHighlights must be used inside <HighlightsProvider>",
    );
  return ctx;
}
