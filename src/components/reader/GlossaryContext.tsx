"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GlossaryEntry } from "@/content/glossary";
import { GlossaryTooltip } from "./GlossaryTooltip";

type Active = { entry: GlossaryEntry; anchor: HTMLElement };

type Ctx = {
  entries: GlossaryEntry[];
  showTooltip: (term: string, anchor: HTMLElement) => void;
  hideTooltip: () => void;
};

const GlossaryCtx = createContext<Ctx | null>(null);

export function GlossaryProvider({
  entries,
  children,
}: {
  entries: GlossaryEntry[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<Active | null>(null);

  const byTerm = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    for (const e of entries) map.set(e.term.toLowerCase(), e);
    return map;
  }, [entries]);

  const showTooltip = useCallback(
    (term: string, anchor: HTMLElement) => {
      const entry = byTerm.get(term.toLowerCase());
      if (entry) setActive({ entry, anchor });
    },
    [byTerm],
  );

  const hideTooltip = useCallback(() => setActive(null), []);

  // Global click interceptor for inline .gloss-term spans.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const span = target.closest(".gloss-term") as HTMLElement | null;
      if (span && span.dataset.term) {
        e.preventDefault();
        e.stopPropagation();
        showTooltip(span.dataset.term, span);
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [showTooltip]);

  const value = useMemo<Ctx>(
    () => ({ entries, showTooltip, hideTooltip }),
    [entries, showTooltip, hideTooltip],
  );

  return (
    <GlossaryCtx.Provider value={value}>
      {children}
      {active && (
        <GlossaryTooltip
          entry={active.entry}
          anchor={active.anchor}
          entries={entries}
          onSwitch={(next, anchor) =>
            setActive({ entry: next, anchor: anchor ?? active.anchor })
          }
          onClose={hideTooltip}
        />
      )}
    </GlossaryCtx.Provider>
  );
}

export function useGlossary(): Ctx {
  const ctx = useContext(GlossaryCtx);
  if (!ctx)
    throw new Error("useGlossary must be used inside <GlossaryProvider>");
  return ctx;
}
