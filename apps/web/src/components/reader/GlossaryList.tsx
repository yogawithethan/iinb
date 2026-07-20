"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { GlossaryEntry } from "@/content/glossary";
import type { ChapterMeta } from "@/content/chapters";
import { GlossaryExpandedCard } from "./GlossaryExpandedCard";
import { useOpenableState } from "@/hooks/useOpenableState";

type Props = {
  entries: GlossaryEntry[];
  chapters: ChapterMeta[];
};

type Group = { chapterNumber: number; label: string; items: GlossaryEntry[] };

function groupByChapter(
  entries: GlossaryEntry[],
  chapters: ChapterMeta[],
): Group[] {
  const groups = new Map<number, Group>();
  for (const e of entries) {
    const g = groups.get(e.chapter);
    if (g) {
      g.items.push(e);
    } else {
      const chId = `ch${e.chapter}`;
      const chapter = chapters.find((c) => c.id === chId);
      groups.set(e.chapter, {
        chapterNumber: e.chapter,
        label: chapter?.title ?? `Chapter ${e.chapter}`,
        items: [e],
      });
    }
  }
  const list = Array.from(groups.values()).sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );
  for (const g of list) {
    g.items.sort((a, b) => a.order - b.order);
  }
  return list;
}

export function GlossaryList({ entries, chapters }: Props) {
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const groups = useMemo(
    () => groupByChapter(entries, chapters),
    [entries, chapters],
  );

  const toggle = useCallback((term: string) => {
    setExpandedTerm((current) =>
      current?.toLowerCase() === term.toLowerCase() ? null : term,
    );
  }, []);

  const switchTo = useCallback((term: string) => {
    setExpandedTerm(term);
    requestAnimationFrame(() => {
      const row = rowRefs.current.get(term.toLowerCase());
      row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  if (entries.length === 0) {
    return (
      <div
        className="px-2 py-8 text-center text-[12px] leading-relaxed"
        style={{ color: "var(--ink-tertiary)" }}
      >
        No glossary terms yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.chapterNumber}>
          <h3
            className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.16em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            {g.label}
          </h3>
          <ul className="space-y-0.5">
            {g.items.map((e) => (
              <GlossaryRow
                key={e.term}
                entry={e}
                entries={entries}
                isExpanded={
                  expandedTerm?.toLowerCase() === e.term.toLowerCase()
                }
                onToggle={() => toggle(e.term)}
                onSwitchTo={switchTo}
                registerRef={(el) => {
                  const key = e.term.toLowerCase();
                  if (el) rowRefs.current.set(key, el);
                  else rowRefs.current.delete(key);
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function GlossaryRow({
  entry,
  entries,
  isExpanded,
  onToggle,
  onSwitchTo,
  registerRef,
}: {
  entry: GlossaryEntry;
  entries: GlossaryEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onSwitchTo: (term: string) => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const anim = useOpenableState(isExpanded, 320);

  return (
    <li ref={registerRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="toc-row flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
        style={{
          ...(isExpanded && { background: "var(--accent-soft)" }),
        }}
      >
        <span
          className="text-[17px] italic"
          style={{
            color: isExpanded ? "var(--accent-ink)" : "var(--ink)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          }}
        >
          {entry.display}
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{
            color: isExpanded
              ? "var(--accent-ink)"
              : "var(--ink-tertiary)",
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            opacity: isExpanded ? 0.85 : 1,
          }}
        >
          {entry.lang}
        </span>
      </button>

      {/* Expansion — grid-rows grows from 0fr → 1fr so items below
          flow down naturally at the card's real height. */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: anim.animate ? "1fr" : "0fr",
          transition:
            "grid-template-rows 380ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          {anim.mounted && (
            <div
              style={{
                opacity: anim.animate ? 1 : 0,
                transform: anim.animate
                  ? "translateY(0)"
                  : "translateY(-6px)",
                transition:
                  "opacity 260ms ease-out, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <GlossaryExpandedCard
                entry={entry}
                entries={entries}
                onSwitchTo={onSwitchTo}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
