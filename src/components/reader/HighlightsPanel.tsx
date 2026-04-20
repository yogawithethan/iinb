"use client";

import { useHighlights } from "./HighlightsContext";
import { XIcon } from "./icons";

type Props = { onClose: () => void };

export function HighlightsPanel({ onClose }: Props) {
  const { highlights, removeHighlight, updateNote } = useHighlights();

  const sorted = [...highlights].sort((a, b) => b.createdAt - a.createdAt);

  function scrollTo(range?: Range) {
    if (!range) return;
    const target = range.startContainer.parentElement;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      onClose();
    }
  }

  return (
    <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "inherit" }}>
      <h2
        className="mb-4 text-center text-[13px] font-medium uppercase tracking-[0.12em]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Highlights &amp; Notes
      </h2>

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
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => scrollTo(h.range)}
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
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] group-hover:opacity-100"
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
