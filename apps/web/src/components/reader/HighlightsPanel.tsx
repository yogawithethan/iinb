"use client";

import { useHighlights } from "./HighlightsContext";
import { XIcon } from "./icons";

type Props = {
  onClose: () => void;
  embedded?: boolean;
  /** Chapter list (book order) for labels and ordering. */
  chapters?: { id: string; title: string }[];
};

// "ch3::42" → ["ch3", 42]
function parseAnchor(anchor?: string): [string, number] {
  const [id = "", idx = "0"] = (anchor ?? "").split("::");
  return [id, Number(idx) || 0];
}

export function HighlightsPanel({ onClose, embedded = false, chapters = [] }: Props) {
  const { highlights, removeHighlight, updateNote } = useHighlights();
  const chapterIndex = new Map(chapters.map((c, i) => [c.id, i]));
  const chapterTitle = new Map(chapters.map((c) => [c.id, c.title]));

  // Book order (chapter, paragraph, position); anything unanchored last.
  const sorted = [...highlights].sort((a, b) => {
    const [ca, pa] = parseAnchor(a.anchor);
    const [cb, pb] = parseAnchor(b.anchor);
    const ia = chapterIndex.get(ca) ?? Number.MAX_SAFE_INTEGER;
    const ib = chapterIndex.get(cb) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib || pa - pb || (a.startOffset ?? 0) - (b.startOffset ?? 0) || a.createdAt - b.createdAt;
  });

  function scrollTo(range?: Range, anchor?: string) {
    // Prefer the live range; fall back to the paragraph anchor when the
    // range isn't attached yet (e.g. the full book is still loading).
    const target =
      (range?.startContainer.isConnected ? range.startContainer.parentElement : null) ??
      (anchor
        ? document.querySelector<HTMLElement>(`[data-p-anchor="${CSS.escape(anchor)}"]`)
        : null);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      onClose();
    }
  }

  function askAbout(text: string) {
    onClose();
    window.dispatchEvent(new CustomEvent("iinb:ask-about", { detail: { text } }));
  }

  return (
    <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "inherit" }}>
      {embedded ? null : (
        <h2
          className="mb-4 text-center text-[13px] font-medium uppercase tracking-[0.12em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Highlights &amp; Notes
        </h2>
      )}

      {sorted.length === 0 ? (
        <div
          className="px-2 py-8 text-center text-[12px] leading-relaxed"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Select any text in the book to highlight it or leave a note.
          Your highlights will appear here.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((h) => (
            <li key={h.id}>
              <div
                className="group relative rounded-xl px-3 py-2.5"
                style={{
                  border: "1px solid var(--pill-border)",
                  background:
                    "color-mix(in srgb, var(--ink) 2%, transparent)",
                }}
              >
                {chapterTitle.get(parseAnchor(h.anchor)[0]) ? (
                  <p
                    className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    {chapterTitle.get(parseAnchor(h.anchor)[0])}
                  </p>
                ) : null}
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => scrollTo(h.range, h.anchor)}
                    className="min-w-0 flex-1 text-left text-[13px] leading-snug transition-opacity hover:opacity-80"
                    style={{
                      color: "var(--ink)",
                      fontFamily:
                        "var(--font-lora), ui-serif, Georgia, serif",
                    }}
                  >
                    <span
                      style={{
                        background: "var(--accent-soft)",
                        padding: "0 2px",
                        borderRadius: "2px",
                      }}
                    >
                      {h.text.length > 160
                        ? `${h.text.slice(0, 160)}…`
                        : h.text}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHighlight(h.id)}
                    aria-label="Delete"
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    <XIcon size={12} />
                  </button>
                </div>
                {h.note ? (
                  <div
                    className="mt-2 rounded-md px-2 py-1.5 text-[12px] leading-snug"
                    style={{
                      background:
                        "color-mix(in srgb, var(--accent) 8%, transparent)",
                      color: "var(--ink-secondary)",
                      fontFamily:
                        "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    {h.note}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt(
                      h.note ? "Edit note:" : "Add a note:",
                      h.note ?? "",
                    );
                    if (next === null) return;
                    updateNote(h.id, next.trim() || undefined);
                  }}
                  className="mt-1.5 text-[11px] underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  {h.note ? "Edit note" : "Add note"}
                </button>
                <button
                  type="button"
                  onClick={() => askAbout(h.text)}
                  className="ml-3 mt-1.5 text-[11px] underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent-ink)" }}
                >
                  Ask about this
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
