import "server-only";

import type { ChapterBlock } from "./chapters";
import type { GlossaryEntry } from "./glossary";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Surface forms a term can appear as in the body: the ASCII slug (e.g.
// "ishvara-pranidhana") AND the diacritic display (e.g. "Īśvara-Praṇidhāna").
// Matching only the ASCII slug meant diacritic prose never linked. Longest
// first so the more specific form wins at a given position.
function surfaceForms(term: GlossaryEntry): string[] {
  const forms = [term.term, term.display]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .map((s) => s.trim().normalize("NFC"));
  return Array.from(new Set(forms)).sort((a, b) => b.length - a.length);
}

/**
 * Walk a chapter's blocks in order. For each glossary term (ordered by
 * .order), find the first *prose* paragraph that contains it and wrap only
 * that first occurrence in a gloss-term span. Each term is wrapped at most
 * once per chapter.
 *
 * Matching is case-insensitive and Unicode-aware (so "Īśvara-praṇidhāna"
 * links via its diacritic display form), allows a trailing "s", and uses
 * letter/mark boundaries instead of ASCII \b (which never forms a boundary
 * next to a non-ASCII letter). Headings and blockquotes (titles, epigraphs)
 * are skipped so a term never underlines inside a chapter title.
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
    // Only link inside body prose — never titles, headings, or epigraphs.
    if (
      block.type === "separator" ||
      block.type === "audio" ||
      block.type === "heading" ||
      block.type === "blockquote"
    )
      continue;

    // For each term, try to wrap its first occurrence in this block.
    // We sort by chapter-first-occurrence order so earlier terms win the race
    // if multiple match the same block.
    const terms = Array.from(remaining.values()).sort(
      (a, b) => a.order - b.order,
    );
    let html = block.html.normalize("NFC");
    for (const term of terms) {
      const alts = surfaceForms(term).map(escapeRegExp).join("|");
      if (!alts) continue;
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{M}])(${alts})s?(?![\\p{L}\\p{M}])`,
        "iu",
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
