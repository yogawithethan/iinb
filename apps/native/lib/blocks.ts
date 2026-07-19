export type Block = {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'image';
  text: string;
  /** True when the source paragraph contained a `{{refresh}}` marker. */
  refreshable: boolean;
  /** Audio clip id from a `{{audio:NAME}}` marker (e.g. "kookaburra"). The id
   *  must exist in lib/audio-map.ts (auto-generated from assets/audio/). */
  audio?: string;
  /** Image filename for `kind: 'image'` blocks. Must exist in
   *  lib/image-map.ts (auto-generated from assets/images/). The block's
   *  `text` field doubles as the alt text / caption. */
  image?: string;
};

const REFRESH_MARKER = /\{\{\s*refresh\s*\}\}/gi;
const AUDIO_MARKER = /\{\{\s*audio\s*:\s*([A-Za-z0-9_-]+)\s*\}\}/gi;
// Standalone image paragraph: a line whose only content is `![alt](file.png)`.
// Caption (alt text) is optional. Filenames are looked up in image-map.ts.
const IMAGE_BLOCK = /^!\[([^\]]*)\]\(\s*([^\s)]+)\s*\)\s*$/;

export function parseBlocks(body: string): Block[] {
  // The book's markdown convention is one paragraph per line (single \n between
  // paragraphs, not blank lines). Splitting on every newline makes each line
  // its own block; blank lines simply disappear via the filter.
  return body
    .split(/\n+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw): Block => {
      const refreshable = REFRESH_MARKER.test(raw);
      REFRESH_MARKER.lastIndex = 0;
      const audioMatch = AUDIO_MARKER.exec(raw);
      AUDIO_MARKER.lastIndex = 0;
      const audio = audioMatch?.[1];
      const text = raw
        .replace(REFRESH_MARKER, '')
        .replace(AUDIO_MARKER, '')
        .replace(/\s+$/, '')
        .replace(/\s{2,}/g, ' ')
        // iOS Text occasionally fails to break on a tight em-dash between
        // short word fragments (e.g. "stay—multiply"), causing the line to
        // overflow horizontally. Inserting a zero-width space after each
        // em-dash gives the layout engine an explicit break opportunity
        // without changing how the dash looks.
        .replace(/—/g, '—​')
        .trim();

      const base = { refreshable, ...(audio ? { audio } : {}) };
      const imageMatch = IMAGE_BLOCK.exec(text);
      if (imageMatch) {
        return { kind: 'image', text: imageMatch[1].trim(), image: imageMatch[2], ...base };
      }
      if (text.startsWith('### ')) return { kind: 'h3', text: text.slice(4), ...base };
      if (text.startsWith('## ')) return { kind: 'h2', text: text.slice(3), ...base };
      if (text.startsWith('# ')) return { kind: 'h1', text: text.slice(2), ...base };
      return { kind: 'p', text, ...base };
    });
}
