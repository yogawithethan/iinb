"use client";

import type { ChapterMeta } from "@/content/chapters";
import type { PartMeta } from "./Chrome";
import { useReaderSettings } from "./SettingsContext";
import { LockIcon } from "./icons";

type Props = {
  chapters: ChapterMeta[];
  parts: PartMeta[];
  currentId: string;
  onNavigate: (id: string) => void;
  onOpenPaywall: () => void;
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

export function TocPanel({
  chapters,
  parts,
  currentId,
  onNavigate,
  onOpenPaywall,
}: Props) {
  const { purchased } = useReaderSettings();
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
        {groups.map((g, gi) => {
          const partLocked =
            !purchased && g.items.every((c) => !c.isFree);
          return (
            <section key={g.partLabel || `free-${gi}`}>
              {g.part ? (
                <button
                  type="button"
                  onClick={() =>
                    partLocked ? onOpenPaywall() : onNavigate(g.part!.id)
                  }
                  className="toc-part mb-1.5 block w-full rounded-lg px-2 py-1 text-left text-[10px] font-medium uppercase tracking-[0.16em] transition-colors"
                  style={{
                    color: "var(--ink-tertiary)",
                    opacity: partLocked ? 0.55 : 1,
                  }}
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
                  const isLocked = !purchased && !c.isFree;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() =>
                          isLocked ? onOpenPaywall() : onNavigate(c.id)
                        }
                        aria-label={
                          isLocked ? `${c.title} (locked — unlock premium)` : c.title
                        }
                        data-current={isCurrent}
                        className="toc-row flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                        style={{
                          background: isCurrent
                            ? "var(--accent-soft)"
                            : "transparent",
                          color: isCurrent
                            ? "var(--accent-ink)"
                            : "var(--ink)",
                        }}
                      >
                        <span
                          className="min-w-0 flex-1"
                          style={{ opacity: isLocked ? 0.6 : 1 }}
                        >
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
                        {isLocked && (
                          <span
                            aria-hidden
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: "var(--accent-soft)",
                              color: "var(--accent-ink)",
                            }}
                          >
                            <LockIcon size={12} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
