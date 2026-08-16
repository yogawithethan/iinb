"use client";

import type { Part } from "@/content/parts";
import { BlockRenderer } from "./BlockRenderer";

// Metamorphosis emblem per part: caterpillar → cocoon → butterfly.
const PART_EMBLEM: Record<string, string> = {
  "part-1": "/images/fig-caterpillar.png",
  "part-2": "/images/fig-cocoon.png",
  "part-3": "/images/fig-butterfly.png",
};

export function PartTitleSection({ part }: { part: Part }) {
  const emblem = PART_EMBLEM[part.id];
  return (
    <section
      id={part.id}
      data-chapter-anchor={part.id}
      data-anchor-kind="part"
      className="relative my-24 flex flex-col items-center justify-center text-center"
      style={{ scrollMarginTop: "120px" }}
    >
      {emblem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emblem}
          alt=""
          aria-hidden="true"
          style={{
            width: 50,
            height: "auto",
            display: "block",
            margin: "0 auto 14px",
          }}
        />
      ) : null}
      <p
        className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em]"
        style={{
          color: "var(--ink-tertiary)",
          fontFamily:
            "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {part.numeral}
      </p>
      <h2
        className="mb-7 text-[2em] font-medium leading-tight"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        {part.title}
      </h2>

      {part.blocks.length > 0 ? (
        <div
          className="flex max-w-[520px] flex-col gap-5"
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
