"use client";

import type { ChapterMeta } from "@/content/chapters";
import type { PartMeta } from "./Chrome";

type Props = {
  chapters: ChapterMeta[];
  parts: PartMeta[];
  currentId: string;
  onNavigate: (id: string) => void;
};

type Group = { part: PartMeta | null; partLabel: string; items: ChapterMeta[] };

function buildGroups(chapters: ChapterMeta[], parts: PartMeta[]): Group[] {
  const groups: Group[] = [];
  for (const c of chapters) {
    const key = c.part ?? "";
    let group = groups.find((g) => g.partLabel === key);
    if (!group) {
      const part = parts.find((p) => p.matchesChapterPart === key) ?? null;
      group = { part, partLabel: key, items: [] };
      groups.push(group);
    }
    group.items.push(c);
  }
  return groups;
}

export function TocPanel({ chapters, parts, currentId, onNavigate }: Props) {
  const groups = buildGroups(chapters, parts);

  return (
    <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "inherit" }}>
      <h2
        className="mb-4 text-center text-[13px] font-medium uppercase tracking-[0.12em]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Contents
      </h2>

      <div className="space-y-5">
        {groups.map((g, gi) => (
          <section key={g.partLabel || `free-${gi}`}>
            {g.part ? (
              <button
                type="button"
                onClick={() => onNavigate(g.part!.id)}
                className="mb-1.5 block w-full rounded-lg px-2 py-1 text-left text-[10px] font-medium uppercase tracking-[0.16em] transition-colors hover:opacity-80"
                style={{ color: "var(--ink-tertiary)" }}
              >
                {g.part.numeral} · {g.part.title}
              </button>
            ) : g.partLabel ? (
              <h3
                className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.16em]"
                style={{ color: "var(--ink-tertiary)" }}
              >
                {g.partLabel}
              </h3>
            ) : null}
            <ul className="space-y-0.5">
              {g.items.map((c) => {
                const isCurrent = c.id === currentId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(c.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
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
                          className="block truncate text-[13px]"
                          style={{ fontWeight: isCurrent ? 600 : 500 }}
                        >
                          {c.title}
                        </span>
                        {c.subtitle ? (
                          <span
                            className="mt-0.5 block truncate text-[11px] italic"
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
  );
}
