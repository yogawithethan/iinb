"use client";

import type { ChapterMeta } from "@/content/chapters";

type Props = {
  chapters: ChapterMeta[];
  currentId: string;
  onNavigate: (chapterId: string) => void;
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

export function TocPanel({ chapters, currentId, onNavigate }: Props) {
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
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(c.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors"
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
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[14px]"
                            style={{ fontWeight: isCurrent ? 600 : 500 }}
                          >
                            {c.title}
                          </span>
                          {c.subtitle ? (
                            <span
                              className="mt-0.5 block truncate text-[12px] italic"
                              style={{
                                color: isCurrent
                                  ? "var(--accent-ink)"
                                  : "var(--ink-secondary)",
                                opacity: isCurrent ? 0.85 : 1,
                              }}
                            >
                              {c.subtitle}
                            </span>
                          ) : null}
                        </span>
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
                            aria-label="Locked (paid chapter)"
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
                      </button>
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
