"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
