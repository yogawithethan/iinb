"use client";

import type { Dedication } from "@/content/dedication";
import { BlockRenderer } from "./BlockRenderer";

export function DedicationSection({ dedication }: { dedication: Dedication }) {
  return (
    <section
      id={dedication.id}
      data-chapter-anchor={dedication.id}
      data-anchor-kind="dedication"
      className="flex min-h-[80vh] flex-col items-center justify-center text-center"
      style={{ scrollMarginTop: "120px" }}
    >
      <div
        className="reader-dedication"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          fontStyle: "italic",
        }}
      >
        {dedication.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </section>
  );
}
