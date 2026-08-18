"use client";

import type { ChapterMeta } from "@/content/chapters";
import type { Part } from "@/content/parts";

// A book-style Contents page in the reading flow (after the dedication, before
// the Preface). Lists the whole structure grouped by part — display only, no
// navigation. A short "how to read" note follows, explaining footnotes.
export function TableOfContentsSection({
  chapters,
  parts,
}: {
  chapters: ChapterMeta[];
  parts: Part[];
}) {
  const partByLabel = new Map(parts.map((p) => [p.matchesChapterPart, p]));

  type Row =
    | { type: "group"; key: string; label: string }
    | { type: "chapter"; ch: ChapterMeta };
  const rows: Row[] = [];
  let lastPart: string | null = null;
  for (const ch of chapters) {
    const partLabel = ch.part ?? "";
    if (partLabel !== lastPart) {
      lastPart = partLabel;
      if (partLabel) {
        const p = partByLabel.get(partLabel);
        const label = p ? `${p.numeral} · ${p.title}` : partLabel;
        rows.push({ type: "group", key: partLabel, label });
      }
    }
    rows.push({ type: "chapter", ch });
  }

  return (
    <section
      id="contents"
      data-chapter-anchor="contents"
      data-anchor-kind="toc"
      className="my-24 flex min-h-[70svh] flex-col justify-center"
      style={{ scrollMarginTop: "120px" }}
    >
      <h2
        className="mb-12 text-center text-[1.5em] font-medium leading-tight"
        style={{ color: "var(--ink)" }}
      >
        Contents
      </h2>

      <div className="flex flex-col gap-1">
        {rows.map((row, i) =>
          row.type === "group" ? (
            <div
              key={`g-${row.key}-${i}`}
              className="mt-8 mb-2 text-[0.7em] font-semibold uppercase tracking-[0.18em]"
              style={{
                color: "var(--ink-tertiary)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {row.label}
            </div>
          ) : (
            <div
              key={`c-${row.ch.id}`}
              className="py-2 leading-snug"
            >
              <span
                className="text-[1.02em]"
                style={{ color: "var(--ink)" }}
              >
                {row.ch.title}
              </span>
              {row.ch.subtitle ? (
                <>
                  {"  "}
                  <span
                    className="text-[0.78em] italic"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    {row.ch.subtitle}
                  </span>
                </>
              ) : null}
            </div>
          ),
        )}
      </div>

      {/* How to read — footnotes explainer */}
      <div
        className="mt-16 rounded-2xl px-5 py-5"
        style={{
          border: "1px solid var(--card-border)",
          background: "var(--bg-soft)",
        }}
      >
        <div
          className="mb-2 text-[0.7em] font-semibold uppercase tracking-[0.18em]"
          style={{
            color: "var(--ink-tertiary)",
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          A note on footnotes
        </div>
        <p
          className="text-[0.92em] leading-relaxed"
          style={{ color: "var(--ink-secondary)" }}
        >
          Here and there you&rsquo;ll spot a small dagger&nbsp;
          <span
            className="footnote-ref"
            data-fn-text="Exactly like this — a little aside that types itself out right where you are. Tap the × to tuck it back away."
            role="button"
            tabIndex={0}
            aria-label="Try a footnote"
          >
            &dagger;
          </span>{" "}
          beside a word &mdash; go ahead, tap the one above to try it. A small
          aside types itself out right in the line; tap the&nbsp;
          <span style={{ color: "var(--accent-ink)" }}>&times;</span> when
          you&rsquo;re done and it tucks itself back away. They&rsquo;re little
          detours &mdash; take them or leave them.
        </p>
      </div>

      {/* Add to Home Screen explainer for Apple devices */}
      <div
        className="mt-6 rounded-2xl px-5 py-5"
        style={{
          border: "1px solid var(--card-border)",
          background: "var(--bg-soft)",
        }}
      >
        <div
          className="mb-2 text-[0.7em] font-semibold uppercase tracking-[0.18em]"
          style={{
            color: "var(--ink-tertiary)",
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Read it like a book
        </div>
        <p
          className="text-[0.92em] leading-relaxed"
          style={{ color: "var(--ink-secondary)" }}
        >
          On an iPhone or iPad, tap the{" "}
          <span style={{ fontSize: "1.1em" }} aria-label="share icon">
            <svg
              width="14"
              height="16"
              viewBox="0 0 14 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "inline", verticalAlign: "-2px" }}
              aria-hidden="true"
            >
              <path
                d="M7 1v9M7 1L4 4M7 1l3 3M1 8v5a2 2 0 002 2h8a2 2 0 002-2V8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>{" "}
          share button in Safari, then scroll down and choose{" "}
          <strong>Add to Home Screen</strong>. On a Mac, go to{" "}
          <strong>File &rarr; Add to Dock</strong>. The book will open
          full-screen with no browser chrome &mdash; just the text.
        </p>
      </div>
    </section>
  );
}
