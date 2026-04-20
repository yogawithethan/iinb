"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReaderView } from "./ReaderView";
import { Chrome } from "./Chrome";
import type { Chapter, ChapterMeta } from "@/content/chapters";

type Props = { chapters: Chapter[] };

export function ReaderShell({ chapters }: Props) {
  const [activeId, setActiveId] = useState<string>(
    () => chapters[0]?.id ?? "",
  );

  const chapterMetas: ChapterMeta[] = useMemo(
    () =>
      chapters.map(({ blocks: _b, isEmpty: _e, ...meta }) => meta),
    [chapters],
  );

  // Track which chapter anchor is currently nearest the top of the viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;

    function update() {
      const anchors = Array.from(
        document.querySelectorAll<HTMLElement>("[data-chapter-anchor]"),
      );
      if (!anchors.length) return;
      const threshold = window.scrollY + 140;
      let best: HTMLElement | null = anchors[0];
      for (const a of anchors) {
        if (a.offsetTop <= threshold) best = a;
        else break;
      }
      const id = best?.dataset.chapterAnchor;
      if (id) setActiveId((prev) => (prev === id ? prev : id));
    }

    update();
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [chapters.length]);

  const active = chapters.find((c) => c.id === activeId) ?? chapters[0];

  const navigateTo = useCallback((id: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-chapter-anchor="${CSS.escape(id)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <main className="reader-scroll min-h-[100dvh] w-full">
        <ReaderView chapters={chapters} />
      </main>
      <Chrome
        chapterTitle={active?.title ?? ""}
        chapterSubtitle={active?.subtitle ?? ""}
        chapters={chapterMetas}
        currentId={activeId}
        onNavigate={navigateTo}
      />
    </>
  );
}
