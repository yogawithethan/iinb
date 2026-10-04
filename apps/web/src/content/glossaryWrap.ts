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
function surfaceForms(term: GlossaryEntry, withAliases = false): string[] {
  const forms = [term.term, term.display, ...(withAliases ? term.aliases ?? [] : [])]
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
 * Apply a single replacement to the first match in *text* (never inside a
 * tag's attributes), skipping text that already sits inside a link-like
 * element: an existing glossary underline, a new-example span, a footnote
 * marker, a button or an anchor. That keeps underlines from nesting.
 */
function replaceOutsideTags(
  html: string,
  pattern: RegExp,
  build: (match: string) => string,
): string {
  let replaced = false;
  // One entry per open span/button/a: true when its contents are off-limits.
  const stack: boolean[] = [];
  return html.replace(
    /(<[^>]*>)|([^<]+)/g,
    (_m: string, tag?: string, text?: string) => {
      if (tag !== undefined) {
        const open = /^<(span|button|a)\b/i.exec(tag);
        const close = /^<\/(span|button|a)\s*>/i.test(tag);
        if (open) {
          const skip =
            open[1].toLowerCase() !== "span" ||
            /class="[^"]*\b(gloss-term|refresh-span|footnote-ref)\b/.test(tag);
          stack.push(skip);
        } else if (close) {
          stack.pop();
        }
        return tag;
      }
      if (!text) return "";
      if (replaced || stack.some(Boolean)) return text;
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

/**
 * Refreshers: in chapters AFTER the one that introduced a term, mark the
 * term's first appearance (or an English alias such as "craving" for taṇhā)
 * with a quieter dashed underline. Tapping it opens the same glossary card,
 * so a reader returning after a week gets the definition back in context.
 */
export function wrapGlossaryRefreshers(
  blocks: ChapterBlock[],
  entries: { entry: GlossaryEntry; introducedIn: string }[],
): ChapterBlock[] {
  if (blocks.length === 0 || entries.length === 0) return blocks;
  const out = blocks.map((b) => ({ ...b }));
  const remaining = new Map(entries.map((e) => [e.entry.term.toLowerCase(), e]));
  for (let i = 0; i < out.length && remaining.size > 0; i++) {
    const block = out[i];
    if (
      block.type === "separator" ||
      block.type === "audio" ||
      block.type === "heading" ||
      block.type === "blockquote"
    )
      continue;
    let html = block.html.normalize("NFC");
    const terms = Array.from(remaining.values()).sort(
      (a, b) => a.entry.order - b.entry.order,
    );
    for (const { entry, introducedIn } of terms) {
      const alts = surfaceForms(entry, true).map(escapeRegExp).join("|");
      if (!alts) continue;
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{M}])(${alts})s?(?![\\p{L}\\p{M}])`,
        "iu",
      );
      const next = replaceOutsideTags(html, pattern, (match) => {
        const attr = entry.term.replace(/"/g, "&quot;");
        const intro = introducedIn.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        return `<span class="gloss-term gloss-term--refresher" data-term="${attr}" data-introduced="${intro}">${match}</span>`;
      });
      if (next !== html) {
        html = next;
        remaining.delete(entry.term.toLowerCase());
      }
    }
    block.html = html;
  }
  return out;
}

/**
 * Does any prose block in this chapter mention the term (term or display
 * form, not aliases)? Used to find where the book really introduces it.
 */
export function chapterMentions(blocks: ChapterBlock[], entry: GlossaryEntry): boolean {
  const alts = surfaceForms(entry).map(escapeRegExp).join("|");
  if (!alts) return false;
  const pattern = new RegExp(`(?<![\\p{L}\\p{M}])(${alts})s?(?![\\p{L}\\p{M}])`, "iu");
  return blocks.some(
    (b) =>
      (b.type === "paragraph" || b.type === "heading") &&
      pattern.test(b.html.replace(/<[^>]*>/g, " ").normalize("NFC")),
  );
}
