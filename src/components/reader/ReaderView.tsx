"use client";

import { useReaderSettings } from "./SettingsContext";
import type { ChapterMeta } from "@/content/chapter0";

type Props = {
  chapter: ChapterMeta & { paragraphs: string[] };
};

export function ReaderView({ chapter }: Props) {
  const { fontSize } = useReaderSettings();

  return (
    <article
      className="reader-prose mx-auto w-full max-w-[680px] px-6 pb-[180px] pt-[140px] md:px-10"
      style={{ fontSize: `${fontSize}px` }}
    >
      <header className="mb-10 text-center">
        <h1 className="mb-2 text-[1.5em] font-medium leading-tight">
          {chapter.title}
        </h1>
        <p
          className="text-[0.85em] italic"
          style={{ color: "var(--ink-secondary)" }}
        >
          {chapter.subtitle}
        </p>
      </header>

      {chapter.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </article>
  );
}
