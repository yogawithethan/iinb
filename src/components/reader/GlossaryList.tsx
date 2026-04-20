"use client";

import { useRef } from "react";
import type { GlossaryEntry } from "@/content/glossary";
import type { ChapterMeta } from "@/content/chapters";
import { useGlossary } from "./GlossaryContext";

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
  // Sort groups by chapter number ascending, and items by .order ascending.
  const list = Array.from(groups.values()).sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );
  for (const g of list) {
    g.items.sort((a, b) => a.order - b.order);
  }
  return list;
}

export function GlossaryList({ entries, chapters }: Props) {
  const { showTooltip } = useGlossary();
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const groups = groupByChapter(entries, chapters);

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
              <li key={e.term}>
                <button
                  ref={(el) => {
                    if (el) rowRefs.current.set(e.term, el);
                    else rowRefs.current.delete(e.term);
                  }}
                  type="button"
                  onClick={() => {
                    const anchor = rowRefs.current.get(e.term);
                    if (anchor) showTooltip(e.term, anchor);
                  }}
                  className="toc-row flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                >
                  <span
                    className="text-[17px] italic"
                    style={{
                      color: "var(--ink)",
                      fontFamily:
                        "var(--font-lora), ui-serif, Georgia, serif",
                    }}
                  >
                    {e.display}
                  </span>
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.08em]"
                    style={{
                      color: "var(--ink-tertiary)",
                      fontFamily:
                        "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    {e.lang}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
