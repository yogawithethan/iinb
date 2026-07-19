// Split a word into [bold prefix, plain rest] for bionic reading.
// Roughly the first 40% of letters are emphasized.
export function splitBionic(word: string): [string, string] {
  if (!word) return ['', ''];
  const len = word.length;
  if (len <= 1) return [word, ''];
  if (len <= 3) return [word.slice(0, 1), word.slice(1)];
  if (len <= 6) return [word.slice(0, 2), word.slice(2)];
  const cut = Math.ceil(len * 0.4);
  return [word.slice(0, cut), word.slice(cut)];
}

// Returns word boundaries so we can render runs with mixed weight while
// preserving the spaces between them.
export function tokenizeWords(text: string): string[] {
  // Match runs of word chars OR non-word chars (incl. whitespace + punctuation).
  return text.match(/(\p{L}+(?:'\p{L}+)?)|([^\p{L}]+)/gu) ?? [text];
}
