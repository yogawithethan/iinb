"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GlossaryEntry } from "@/content/glossary";
import type { ChapterMeta } from "@/content/chapters";
import { GlossaryExpandedCard } from "./GlossaryExpandedCard";

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
  const groups = groupByChapter(entries, chapters);

  const toggle = useCallback(
    (term: string) => {
      setExpandedTerm((current) =>
        current?.toLowerCase() === term.toLowerCase() ? null : term,
      );
    },
    [],
  );

  const switchTo = useCallback(
    (term: string) => {
      setExpandedTerm(term);
      // Scroll the target row into view after the layout settles.
      requestAnimationFrame(() => {
        const row = rowRefs.current.get(term.toLowerCase());
        row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [],
  );

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
            {g.items.map((e) => {
              const isExpanded = expandedTerm?.toLowerCase() === e.term.toLowerCase();
              return (
                <li
                  key={e.term}
                  ref={(el) => {
                    if (el) rowRefs.current.set(e.term.toLowerCase(), el);
                    else rowRefs.current.delete(e.term.toLowerCase());
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(e.term)}
                    aria-expanded={isExpanded}
                    className="toc-row flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                    style={{
                      ...(isExpanded && {
                        background: "var(--accent-soft)",
                      }),
                    }}
                  >
                    <span
                      className="text-[17px] italic"
                      style={{
                        color: isExpanded
                          ? "var(--accent-ink)"
                          : "var(--ink)",
                        fontFamily:
                          "var(--font-lora), ui-serif, Georgia, serif",
                      }}
                    >
                      {e.display}
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
                      {e.lang}
                    </span>
                  </button>

                  {/* Grid-row trick: animates on actual card height. */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                      opacity: isExpanded ? 1 : 0,
                      transition: isExpanded
                        ? "grid-template-rows 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)"
                        : "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out",
                    }}
                  >
                    <div style={{ minHeight: 0, overflow: "hidden" }}>
                      {isExpanded && (
                        <GlossaryExpandedCard
                          entry={e}
                          entries={entries}
                          onSwitchTo={switchTo}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
