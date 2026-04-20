"use client";

import { useReaderSettings } from "./SettingsContext";
import { BlockRenderer } from "./BlockRenderer";
import { bionify } from "./bionic";
import type { Chapter } from "@/content/chapters";

type Props = { chapters: Chapter[] };

export function ReaderView({ chapters }: Props) {
  const { fontSize, bionicReading } = useReaderSettings();

  return (
    <div
      className="reader-prose mx-auto w-full max-w-[680px] px-6 pb-[180px] pt-[140px] md:px-10"
      style={{ fontSize: `${fontSize}px` }}
    >
      {chapters.map((chapter, idx) => (
        <ChapterSection
          key={chapter.id}
          chapter={chapter}
          isFirst={idx === 0}
          bionicReading={bionicReading}
        />
      ))}
    </div>
  );
}

function ChapterSection({
  chapter,
  isFirst,
  bionicReading,
}: {
  chapter: Chapter;
  isFirst: boolean;
  bionicReading: boolean;
}) {
  return (
    <section
      id={chapter.id}
      data-chapter-anchor={chapter.id}
      className={isFirst ? "" : "mt-24"}
      style={{ scrollMarginTop: "120px" }}
    >
      <header className="mb-10 text-center">
        {chapter.part ? (
          <p
            className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              color: "var(--ink-tertiary)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {chapter.part}
          </p>
        ) : null}
        <h2 className="mb-2 text-[1.5em] font-medium leading-tight">
          {chapter.title}
        </h2>
        {chapter.subtitle ? (
          <p
            className="text-[0.85em] italic"
            style={{ color: "var(--ink-secondary)" }}
          >
            {chapter.subtitle}
          </p>
        ) : null}
      </header>

      {chapter.isEmpty ? (
        <EmptyState chapter={chapter} />
      ) : (
        chapter.blocks.map((block, i) => {
          const transformed =
            bionicReading && block.type === "paragraph"
              ? { ...block, html: bionify(block.html) }
              : block;
          return <BlockRenderer key={i} block={transformed} />;
        })
      )}
    </section>
  );
}

function EmptyState({ chapter }: { chapter: Chapter }) {
  return (
    <div
      className="rounded-2xl px-6 py-8 text-center"
      style={{
        border: "1px dashed var(--pill-border)",
        color: "var(--ink-tertiary)",
        fontFamily:
          "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        fontSize: "13px",
        lineHeight: 1.6,
      }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--ink-secondary)" }}>
        This chapter is empty.
      </p>
      <p>
        Paste into{" "}
        <code
          className="rounded px-1.5 py-0.5"
          style={{
            background:
              "color-mix(in srgb, var(--ink-tertiary) 15%, transparent)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "12px",
          }}
        >
          src/content/chapters/*.md
        </code>{" "}
        — id{" "}
        <code style={{ fontSize: "12px" }}>{chapter.id}</code>
      </p>
    </div>
  );
}
