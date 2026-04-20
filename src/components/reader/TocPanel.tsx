"use client";

import { useState } from "react";
import type { ChapterMeta } from "@/content/chapters";
import type { GlossaryEntry } from "@/content/glossary";
import type { PartMeta } from "./Chrome";
import { useReaderSettings } from "./SettingsContext";
import { LockIcon } from "./icons";
import { GlossaryList } from "./GlossaryList";

type Props = {
  chapters: ChapterMeta[];
  parts: PartMeta[];
  glossary: GlossaryEntry[];
  currentId: string;
  onNavigate: (id: string) => void;
  onOpenPaywall: () => void;
};

type Tab = "contents" | "glossary";

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
  glossary,
  currentId,
  onNavigate,
  onOpenPaywall,
}: Props) {
  const { purchased } = useReaderSettings();
  const [tab, setTab] = useState<Tab>("contents");
  const groups = buildGroups(chapters, parts);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Pill switcher — Contents ↔ Glossary */}
      <div className="px-4 pt-4">
        <div
          role="tablist"
          className="relative flex rounded-full p-[3px]"
          style={{ background: "var(--bg-soft)" }}
        >
          {/* Sliding indicator */}
          <div
            aria-hidden="true"
            className="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-full transition-transform duration-[220ms] ease-out"
            style={{
              left: 3,
              background: "var(--bg)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
              transform:
                tab === "contents" ? "translateX(0)" : "translateX(100%)",
            }}
          />
          <TabPill
            label="Contents"
            active={tab === "contents"}
            onClick={() => setTab("contents")}
          />
          <TabPill
            label="Glossary"
            active={tab === "glossary"}
            onClick={() => setTab("glossary")}
          />
        </div>
      </div>

      {/* Sliding track — two panels side by side */}
      <div className="relative mt-3 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-[260ms]"
          style={{
            transform:
              tab === "contents" ? "translateX(0)" : "translateX(-100%)",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="h-full w-full flex-shrink-0 overflow-y-auto px-4 pb-4">
            <ContentsPanel
              groups={groups}
              currentId={currentId}
              purchased={purchased}
              onNavigate={onNavigate}
              onOpenPaywall={onOpenPaywall}
            />
          </div>
          <div className="h-full w-full flex-shrink-0 overflow-y-auto px-4 pb-4">
            <GlossaryList entries={glossary} chapters={chapters} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="relative flex-1 rounded-full py-1.5 text-[13px] transition-colors"
      style={{
        color: active ? "var(--ink)" : "var(--ink-tertiary)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
    </button>
  );
}

function ContentsPanel({
  groups,
  currentId,
  purchased,
  onNavigate,
  onOpenPaywall,
}: {
  groups: Group[];
  currentId: string;
  purchased: boolean;
  onNavigate: (id: string) => void;
  onOpenPaywall: () => void;
}) {
  return (
    <div className="space-y-5">
      {groups.map((g, gi) => {
        const partLocked = !purchased && g.items.every((c) => !c.isFree);
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
                        isLocked
                          ? `${c.title} (locked — unlock premium)`
                          : c.title
                      }
                      data-current={isCurrent}
                      className="toc-row flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                      style={{
                        ...(isCurrent && {
                          background: "var(--accent-soft)",
                        }),
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
  );
}
