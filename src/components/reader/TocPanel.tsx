"use client";

import Link from "next/link";
import type { ChapterMeta } from "@/content/chapters";

type Props = {
  chapters: ChapterMeta[];
  currentId: string;
  onClose: () => void;
};

function groupByPart(chapters: ChapterMeta[]) {
  const groups: { part: string; items: ChapterMeta[] }[] = [];
  for (const c of chapters) {
    const key = c.part ?? "";
    const existing = groups.find((g) => g.part === key);
    if (existing) existing.items.push(c);
    else groups.push({ part: key, items: [c] });
  }
  return groups;
}

export function TocPanel({ chapters, currentId, onClose }: Props) {
  const groups = groupByPart(chapters);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-[680px] px-6 pb-[140px] pt-[120px] md:px-10">
        <h2
          className="mb-8 text-center text-[22px] font-medium"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          }}
        >
          Contents
        </h2>

        <div className="space-y-7">
          {groups.map((g, gi) => (
            <section key={g.part || `free-${gi}`}>
              {g.part ? (
                <h3
                  className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  {g.part}
                </h3>
              ) : null}
              <ul className="space-y-1">
                {g.items.map((c) => {
                  const isCurrent = c.id === currentId;
                  const href = `/read/${c.id}`;
                  return (
                    <li key={c.id}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className="flex items-start justify-between gap-3 rounded-xl px-3 py-3 transition-colors"
                        style={{
                          background: isCurrent
                            ? "var(--accent-soft)"
                            : "transparent",
                          color: isCurrent
                            ? "var(--accent-ink)"
                            : c.isFree
                              ? "var(--ink)"
                              : "var(--ink-secondary)",
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-[14px] font-medium"
                            style={{ fontWeight: isCurrent ? 600 : 500 }}
                          >
                            {c.title}
                          </div>
                          {c.subtitle ? (
                            <div
                              className="mt-0.5 truncate text-[12px] italic"
                              style={{
                                color: isCurrent
                                  ? "var(--accent-ink)"
                                  : "var(--ink-secondary)",
                                opacity: isCurrent ? 0.85 : 1,
                              }}
                            >
                              {c.subtitle}
                            </div>
                          ) : null}
                        </div>
                        {!c.isFree ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-label="Not yet unlocked"
                            style={{
                              color: "var(--ink-tertiary)",
                              flexShrink: 0,
                              marginTop: 4,
                            }}
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
