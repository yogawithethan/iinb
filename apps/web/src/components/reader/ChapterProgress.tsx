"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "./icons";

// Bottom-bar pill: how much of the current chapter is left, plus a ↻ that
// asks for new examples for every author-marked example in the chapter.
// A "page" is one screen less the overlap PageTurn keeps (viewport − 96px).
export function ChapterProgress({
  currentId,
  purchased,
  onLocked,
}: {
  currentId: string;
  purchased: boolean;
  onLocked: () => void;
}) {
  const [pagesLeft, setPagesLeft] = useState<number | null>(null);
  const [hasExamples, setHasExamples] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const section = document.querySelector<HTMLElement>(
        `.reader-prose [data-chapter-anchor="${CSS.escape(currentId)}"][data-anchor-kind="chapter"]`,
      );
      if (!section) {
        setPagesLeft(null);
        setHasExamples(false);
        return;
      }
      const page = Math.max(240, window.innerHeight - 96);
      const remaining = section.getBoundingClientRect().bottom - window.innerHeight;
      setPagesLeft(Math.max(0, Math.ceil(remaining / page)));
      setHasExamples(Boolean(section.querySelector("[data-refresh-span]")));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [currentId]);

  useEffect(() => {
    const onDone = (e: Event) => {
      if ((e as CustomEvent<{ chapterId?: string }>).detail?.chapterId === currentId) {
        setSpinning(false);
      }
    };
    window.addEventListener("iinb:refresh-examples-done", onDone);
    return () => window.removeEventListener("iinb:refresh-examples-done", onDone);
  }, [currentId]);

  if (pagesLeft === null) return null;

  const label =
    pagesLeft === 0
      ? "Last page of chapter"
      : `${pagesLeft} ${pagesLeft === 1 ? "page" : "pages"} left in chapter`;

  return (
    <div
      className="glass-bubble pointer-events-auto flex h-9 items-center gap-1 rounded-full pl-3.5 pr-1 text-[12px]"
      style={{
        color: "var(--ink-secondary)",
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        paddingRight: hasExamples ? undefined : 14,
      }}
    >
      <span className="whitespace-nowrap tabular-nums">{label}</span>
      {hasExamples ? (
        <button
          type="button"
          aria-label={purchased ? "New examples for this chapter" : "New examples — full book"}
          title="New examples for this chapter"
          aria-busy={spinning || undefined}
          onClick={() => {
            if (!purchased) return onLocked();
            if (spinning) return;
            setSpinning(true);
            window.dispatchEvent(
              new CustomEvent("iinb:refresh-examples", { detail: { chapterId: currentId } }),
            );
          }}
          className="chapter-refresh relative flex h-7 w-7 items-center justify-center rounded-full"
          style={{ color: "var(--accent-ink)" }}
        >
          <svg
            className="chapter-refresh__icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <path d="M20 4v5h-5" />
          </svg>
          {purchased ? null : (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[13px] w-[13px] items-center justify-center rounded-full"
              style={{ background: "var(--accent)", color: "#fff", border: "1.5px solid var(--bg)" }}
            >
              <LockIcon size={7} />
            </span>
          )}
        </button>
      ) : null}
    </div>
  );
}
