/**
 * Tag-aware bionic reading transform.
 *
 * Given a safe HTML string (from marked.parseInline), wrap the first ~45%
 * of every word in a <b class="iinb-bionic"> tag, preserving existing tags
 * (em/strong/links) by only operating on text between them.
 *
 * The word regex matches unicode letters, marks, numbers, and apostrophes,
 * so "don't", "tāpas", and "1,000" each bionify as a single word.
 */
export function bionify(html: string): string {
  return html.replace(
    /(<[^>]*>)|([^<]+)/g,
    (_match: string, tag?: string, text?: string) => {
      if (tag !== undefined) return tag;
      if (!text) return "";
      return text.replace(
        /[\p{L}\p{M}\p{N}'\u2019]+/gu,
        (word) => {
          if (word.length <= 1) return word;
          const n = Math.max(1, Math.ceil(word.length * 0.45));
          return `<b class="iinb-bionic">${word.slice(0, n)}</b>${word.slice(n)}`;
        },
      );
    },
  );
}
