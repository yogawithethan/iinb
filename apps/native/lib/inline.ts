// Tokenize a paragraph into inline runs.
//
// Supported markers:
//   [[footnote text]]   — a footnote that expands inline with a typing animation
//   *italic* / _italic_ — emphasis
//   **bold** / __bold__ — strong emphasis
//   ***both*** / ___both___
// Glossary terms (loaded from glossary.json) are auto-detected at render time
// and split out into 'glossary' runs by `expandGlossary`.

import glossary from '@/content/glossary.json';

export type InlineKind = 'text' | 'em' | 'strong' | 'strongEm' | 'footnote' | 'glossary' | 'swap';
export type InlineRun = { kind: InlineKind; text: string };

const EMPHASIS_PATTERNS: { delim: string; kind: InlineKind }[] = [
  { delim: '***', kind: 'strongEm' },
  { delim: '___', kind: 'strongEm' },
  { delim: '**', kind: 'strong' },
  { delim: '__', kind: 'strong' },
  { delim: '*', kind: 'em' },
  { delim: '_', kind: 'em' },
];

// Characters that *might* start a marker — used as break points when scanning plain text.
const BREAKERS = new Set(['*', '_', '[', '{']);

export function parseInline(input: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let i = 0;

  while (i < input.length) {
    // Footnote: [[ ... ]]
    if (input.startsWith('[[', i)) {
      const end = input.indexOf(']]', i + 2);
      if (end !== -1) {
        runs.push({ kind: 'footnote', text: input.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    // Swappable example span: {{ ... }}. The contents are the original text
    // that may be regenerated. Single-token braces like {{refresh}} or
    // {{audio:foo}} are directives stripped at the block level — defensively
    // skip them here too (no spaces inside).
    if (input.startsWith('{{', i)) {
      const end = input.indexOf('}}', i + 2);
      if (end !== -1) {
        const inner = input.slice(i + 2, end).trim();
        if (inner && /\s/.test(inner)) {
          runs.push({ kind: 'swap', text: inner });
          i = end + 2;
          continue;
        }
      }
    }

    // Emphasis (longest delim first thanks to PATTERNS order).
    let matched = false;
    for (const p of EMPHASIS_PATTERNS) {
      if (!input.startsWith(p.delim, i)) continue;
      const end = input.indexOf(p.delim, i + p.delim.length);
      if (end === -1) continue;
      const inner = input.slice(i + p.delim.length, end);
      if (!inner) continue;
      runs.push({ kind: p.kind, text: inner });
      i = end + p.delim.length;
      matched = true;
      break;
    }
    if (matched) continue;

    // Plain text up to the next potential delimiter.
    let j = i + 1;
    while (j < input.length && !BREAKERS.has(input[j])) j++;
    runs.push({ kind: 'text', text: input.slice(i, j) });
    i = j;
  }

  return runs;
}

// Build a regex that matches any glossary term as a whole word.
type GlossaryEntry = {
  term: string;
  display?: string;
  definition?: string;
  pronunciation?: string;
  lang?: string;
};
const GLOSSARY = (glossary as GlossaryEntry[]) ?? [];
const GLOSSARY_TERMS = GLOSSARY.map((g) => g.term)
  // Sort by length desc so longer terms match first (avoids "an" matching inside "anatta").
  .sort((a, b) => b.length - a.length)
  .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const GLOSSARY_REGEX =
  GLOSSARY_TERMS.length > 0
    ? new RegExp(`\\b(${GLOSSARY_TERMS.join('|')})\\b`, 'gi')
    : null;

export function findGlossaryEntry(termText: string): GlossaryEntry | null {
  const lower = termText.toLowerCase();
  return GLOSSARY.find((g) => g.term.toLowerCase() === lower) ?? null;
}

// Walk through runs; for each 'text' run, split out glossary matches.
export function expandGlossary(runs: InlineRun[]): InlineRun[] {
  if (!GLOSSARY_REGEX) return runs;
  const out: InlineRun[] = [];
  for (const run of runs) {
    if (run.kind !== 'text') {
      out.push(run);
      continue;
    }
    const text = run.text;
    let lastIdx = 0;
    GLOSSARY_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = GLOSSARY_REGEX.exec(text)) !== null) {
      if (match.index > lastIdx) {
        out.push({ kind: 'text', text: text.slice(lastIdx, match.index) });
      }
      out.push({ kind: 'glossary', text: match[0] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      out.push({ kind: 'text', text: text.slice(lastIdx) });
    }
  }
  return out;
}
