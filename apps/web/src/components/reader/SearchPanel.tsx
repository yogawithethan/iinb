"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chapter } from "@/content/chapters";
import { SearchIcon, XIcon } from "./icons";

type Hit = {
  chapterId: string;
  chapterTitle: string;
  chapterSubtitle: string;
  blockIdx: number;
  snippet: string;
  matchStart: number;
  matchEnd: number;
};

function htmlToText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

function runSearch(
  query: string,
  chapters: Chapter[],
  max = 80,
): Hit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const lower = q.toLowerCase();
  const results: Hit[] = [];
  for (const ch of chapters) {
    for (let i = 0; i < ch.blocks.length; i++) {
      const b = ch.blocks[i];
      if (b.type === "separator") continue;
      const text = htmlToText(b.html);
      const lt = text.toLowerCase();
      const idx = lt.indexOf(lower);
      if (idx === -1) continue;
      const windowStart = Math.max(0, idx - 46);
      const windowEnd = Math.min(text.length, idx + q.length + 46);
      const prefix = windowStart > 0 ? "…" : "";
      const suffix = windowEnd < text.length ? "…" : "";
      const snippet = prefix + text.slice(windowStart, windowEnd) + suffix;
      results.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
        chapterSubtitle: ch.subtitle,
        blockIdx: i,
        snippet,
        matchStart: idx - windowStart + prefix.length,
        matchEnd: idx - windowStart + prefix.length + q.length,
      });
      if (results.length >= max) return results;
    }
  }
  return results;
}

type Props = {
  chapters: Chapter[];
  onNavigate: (anchor: string) => void;
  onClose: () => void;
};

export function SearchPanel({ chapters, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hits = useMemo(() => runSearch(query, chapters), [query, chapters]);

  useEffect(() => {
    // Focus the input on mount so users can type immediately.
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Input row */}
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <span
          aria-hidden
          style={{ color: "var(--ink-tertiary)" }}
          className="flex h-6 w-6 items-center justify-center"
        >
          <SearchIcon size={16} />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the book…"
          className="flex-1 bg-transparent text-[14px] outline-none"
          style={{
            color: "var(--ink)",
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ color: "var(--ink-tertiary)" }}
          >
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.trim().length < 2 ? (
          <div
            className="px-4 py-6 text-center text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Type at least 2 characters.
          </div>
        ) : hits.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            No matches for &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <ul className="py-1">
            {hits.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(`${h.chapterId}::${h.blockIdx}`);
                    onClose();
                  }}
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-[var(--accent-soft)]"
                >
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    {h.chapterTitle}
                    {h.chapterSubtitle ? ` · ${h.chapterSubtitle}` : ""}
                  </span>
                  <span
                    className="text-[13px] leading-snug"
                    style={{ color: "var(--ink)" }}
                  >
                    {h.snippet.slice(0, h.matchStart)}
                    <mark
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-ink)",
                        padding: "0 2px",
                        borderRadius: 2,
                      }}
                    >
                      {h.snippet.slice(h.matchStart, h.matchEnd)}
                    </mark>
                    {h.snippet.slice(h.matchEnd)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
