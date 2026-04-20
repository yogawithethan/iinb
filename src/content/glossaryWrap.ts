import "server-only";

import type { ChapterBlock } from "./chapters";
import type { GlossaryEntry } from "./glossary";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walk a chapter's blocks in order. For each glossary term (ordered by
 * .order), find the first paragraph/heading/blockquote that contains it
 * (case-insensitive, allowing a trailing "s") and wrap only that first
 * occurrence in a gloss-term span. Each term is wrapped at most once per
 * chapter.
 */
export function wrapGlossaryInChapter(
  blocks: ChapterBlock[],
  glossary: GlossaryEntry[],
): ChapterBlock[] {
  if (blocks.length === 0 || glossary.length === 0) return blocks;

  // Clone so we can mutate the html field freely.
  const out = blocks.map((b) => ({ ...b }));
  // Track remaining (un-wrapped) terms.
  const remaining = new Map(glossary.map((g) => [g.term.toLowerCase(), g]));

  for (let i = 0; i < out.length && remaining.size > 0; i++) {
    const block = out[i];
    if (block.type === "separator") continue;

    // For each term, try to wrap its first occurrence in this block.
    // We sort by chapter-first-occurrence order so earlier terms win the race
    // if multiple match the same block.
    const terms = Array.from(remaining.values()).sort(
      (a, b) => a.order - b.order,
    );
    let html = block.html;
    for (const term of terms) {
      const pattern = new RegExp(
        `\\b(${escapeRegExp(term.term)})s?\\b`,
        "i",
      );
      const next = replaceOutsideTags(html, pattern, (match) => {
        const attr = term.term.replace(/"/g, "&quot;");
        return `<span class="gloss-term" data-term="${attr}">${match}</span>`;
      });
      if (next !== html) {
        html = next;
        remaining.delete(term.term.toLowerCase());
      }
    }
    block.html = html;
  }

  return out;
}

/**
 * Apply a single replacement that matches *outside* HTML tags (so we don't
 * wrap attribute values or accidentally nest inside another span).
 */
function replaceOutsideTags(
  html: string,
  pattern: RegExp,
  build: (match: string) => string,
): string {
  let replaced = false;
  return html.replace(
    /(<[^>]*>)|([^<]+)/g,
    (_m: string, tag?: string, text?: string) => {
      if (replaced) return tag ?? text ?? "";
      if (tag !== undefined) return tag;
      if (!text) return "";
      const m = pattern.exec(text);
      if (!m) return text;
      replaced = true;
      const [match] = m;
      const idx = m.index;
      return (
        text.slice(0, idx) + build(match) + text.slice(idx + match.length)
      );
    },
  );
}
