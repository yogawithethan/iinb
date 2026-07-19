import type { Block } from './blocks';

export type StreamWord = {
  word: string;
  blockIdx: number;
  /** True when the word terminates a sentence ("…end." / "…?!"). */
  endOfSentence?: boolean;
  /** True when this is the last word of its paragraph block. */
  endOfBlock?: boolean;
  /** True when the word ends with a mid-sentence break (comma, em-dash,
   *  semicolon, colon) — gets a small beat below sentence-level. */
  endOfClause?: boolean;
};

function clean(text: string): string {
  return text
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// Catches `.`, `!`, `?`, plus optional trailing closing punctuation
// (`"`, `'`, `”`, `)`, `]`).
const SENTENCE_END_RE = /[.!?]+["'”’)\]]*$/;

// Mid-sentence breaks: comma, semicolon, colon, em-dash, en-dash. Trailing
// closing quote/paren is allowed too.
const CLAUSE_END_RE = /([,;:]["'”’)\]]*|[—–])$/;

// Splits tokens on internal hyphens or em-/en-dashes between letters, so
// "double-checking" → ["double-", "checking"] and "it—and" → ["it—", "and"].
// The break char stays attached to the leading piece for visual continuity.
function splitInternalBreaks(token: string): string[] {
  const parts = token.split(/(?<=[\p{L}])([-—–])(?=[\p{L}])/u);
  if (parts.length === 1) return parts;
  // The split with a capturing group interleaves separators: [a, sep, b, sep, c].
  // Re-glue separators onto the preceding word piece.
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === '-' || p === '—' || p === '–') {
      // Append to the previous piece.
      out[out.length - 1] = out[out.length - 1] + p;
    } else {
      out.push(p);
    }
  }
  return out;
}

export function buildWordStream(blocks: Block[]): StreamWord[] {
  const out: StreamWord[] = [];
  blocks.forEach((b, blockIdx) => {
    const tokens = clean(b.text).split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      for (const piece of splitInternalBreaks(tok)) {
        out.push({ word: piece, blockIdx });
      }
    }
  });
  // Annotate sentence + paragraph boundaries + mid-sentence breaks.
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    const nxt = out[i + 1];
    if (SENTENCE_END_RE.test(cur.word)) cur.endOfSentence = true;
    else if (CLAUSE_END_RE.test(cur.word)) cur.endOfClause = true;
    if (!nxt || nxt.blockIdx !== cur.blockIdx) cur.endOfBlock = true;
  }
  return out;
}

export function orpIndex(word: string): number {
  if (word.length <= 1) return 0;
  return Math.max(0, Math.min(word.length - 1, Math.floor((word.length - 1) * 0.35)));
}

export function tickMs(
  word: string,
  wpm: number,
  flags?: { endOfSentence?: boolean; endOfBlock?: boolean; endOfClause?: boolean },
): number {
  const base = 60_000 / wpm;
  let ms = base;
  if (word.length >= 8) ms = base * 1.4;
  else if (word.length >= 6) ms = base * 1.15;
  // Pick the strongest break — block > sentence > clause — so beats don't stack.
  if (flags?.endOfBlock) ms += base * 2.5;
  else if (flags?.endOfSentence) ms += base * 1.0;
  else if (flags?.endOfClause) ms += base * 0.4;
  return Math.round(ms);
}
