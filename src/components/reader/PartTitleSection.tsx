"use client";

import type { Part } from "@/content/parts";
import { BlockRenderer } from "./BlockRenderer";

export function PartTitleSection({ part }: { part: Part }) {
  return (
    <section
      id={part.id}
      data-chapter-anchor={part.id}
      data-anchor-kind="part"
      className="relative my-32 flex min-h-[60vh] flex-col items-center justify-center text-center"
      style={{ scrollMarginTop: "120px" }}
    >
      <p
        className="mb-6 text-[11px] font-medium uppercase tracking-[0.28em]"
        style={{
          color: "var(--ink-tertiary)",
          fontFamily:
            "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {part.numeral}
      </p>
      <h2
        className="mb-12 text-[2em] font-medium leading-tight"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        {part.title}
      </h2>

      {part.blocks.length > 0 ? (
        <div
          className="flex max-w-[520px] flex-col gap-6"
          style={{
            color: "var(--ink-secondary)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          }}
        >
          {part.blocks.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
