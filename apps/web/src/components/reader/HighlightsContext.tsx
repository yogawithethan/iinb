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

const HIGHLIGHT_NAME = "iinb-highlight";

export type HighlightEntry = {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
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

export function HighlightsProvider({ children }: { children: ReactNode }) {
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

  const addHighlight = useCallback<Ctx["addHighlight"]>(
    (text, range, note) => {
      const entry: HighlightEntry = {
        id: uuid(),
        text,
        note,
        createdAt: Date.now(),
        range,
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
