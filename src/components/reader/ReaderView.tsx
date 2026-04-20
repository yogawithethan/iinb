"use client";

import { useReaderSettings } from "./SettingsContext";
import { BlockRenderer } from "./BlockRenderer";
import type { Chapter } from "@/content/chapters";

type Props = { chapter: Chapter };

export function ReaderView({ chapter }: Props) {
  const { fontSize } = useReaderSettings();

  return (
    <article
      className="reader-prose mx-auto w-full max-w-[680px] px-6 pb-[180px] pt-[140px] md:px-10"
      style={{ fontSize: `${fontSize}px` }}
    >
      <header className="mb-10 text-center">
        {chapter.part ? (
          <p
            className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em]"
            style={{
              color: "var(--ink-tertiary)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {chapter.part}
          </p>
        ) : null}
        <h1 className="mb-2 text-[1.5em] font-medium leading-tight">
          {chapter.title}
        </h1>
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
        chapter.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))
      )}
    </article>
  );
}

function EmptyState({ chapter }: { chapter: Chapter }) {
  return (
    <div
      className="rounded-2xl px-6 py-10 text-center"
      style={{
        border: "1px dashed var(--pill-border)",
        color: "var(--ink-tertiary)",
        fontFamily:
          "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      <p className="mb-2 font-medium" style={{ color: "var(--ink-secondary)" }}>
        This chapter is empty.
      </p>
      <p>
        Paste your manuscript into{" "}
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
        — leave a blank line between paragraphs. The file for this chapter is
        keyed <code style={{ fontSize: "12px" }}>{chapter.id}</code>.
      </p>
    </div>
  );
}
