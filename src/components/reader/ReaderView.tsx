"use client";

import { useMemo } from "react";
import { useReaderSettings, type ReadingWidth } from "./SettingsContext";
import { BlockRenderer } from "./BlockRenderer";
import { PartTitleSection } from "./PartTitleSection";
import { DedicationSection } from "./DedicationSection";
import { bionify } from "./bionic";
import type { Chapter } from "@/content/chapters";
import type { ReaderNode } from "@/content/stream";

type Props = { nodes: ReaderNode[] };

const WIDTH_PX: Record<ReadingWidth, number> = {
  narrow: 560,
  medium: 680,
  wide: 820,
};

export function ReaderView({ nodes }: Props) {
  const { fontSize, readingWidth, bionicReading, purchased } =
    useReaderSettings();

  // When not purchased, stop rendering at the first paid chapter so the
  // sticky PaywallSticky becomes the visual end-state.
  const visibleNodes = useMemo(() => {
    if (purchased) return nodes;
    const kept: ReaderNode[] = [];
    for (const n of nodes) {
      if (n.kind === "chapter" && !n.chapter.isFree) break;
      if (n.kind === "part") break;
      kept.push(n);
    }
    return kept;
  }, [nodes, purchased]);

  // Leave extra bottom space for the sticky paywall so the last paragraph
  // isn't hidden behind the fixed card.
  const bottomPadding = purchased ? 180 : 200;

  return (
    <div
      className="reader-prose mx-auto w-full px-6 pt-[140px] md:px-10"
      style={{
        fontSize: `${fontSize}px`,
        maxWidth: `${WIDTH_PX[readingWidth]}px`,
        paddingBottom: `${bottomPadding}px`,
      }}
    >
      {visibleNodes.map((node, idx) => {
        if (node.kind === "dedication") {
          return (
            <DedicationSection
              key={`dedication-${node.dedication.id}`}
              dedication={node.dedication}
            />
          );
        }
        if (node.kind === "part") {
          return (
            <PartTitleSection key={`part-${node.part.id}`} part={node.part} />
          );
        }
        return (
          <ChapterSection
            key={`ch-${node.chapter.id}`}
            chapter={node.chapter}
            isFirst={idx === 0}
            bionicReading={bionicReading}
          />
        );
      })}
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
  // Stabilize transformed blocks so BlockRenderer receives referentially
  // stable props across unrelated re-renders (e.g. highlights context
  // updates). Without this, every render creates fresh `{...block, html}`
  // objects — not a correctness bug on its own, but it churns React work
  // and the fresh `dangerouslySetInnerHTML` wrapper risks disturbing
  // DOM nodes that user Ranges point into.
  const blocks = useMemo(() => {
    if (!bionicReading) return chapter.blocks;
    return chapter.blocks.map((block) =>
      block.type === "paragraph"
        ? { ...block, html: bionify(block.html) }
        : block,
    );
  }, [chapter.blocks, bionicReading]);

  return (
    <section
      id={chapter.id}
      data-chapter-anchor={chapter.id}
      data-anchor-kind="chapter"
      className={isFirst ? "" : "mt-24"}
      style={{ scrollMarginTop: "120px" }}
    >
      <header className="mb-10 text-center">
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
        blocks.map((block, i) => {
          const anchor = `${chapter.id}::${i}`;
          return <BlockRenderer key={i} block={block} anchor={anchor} />;
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
