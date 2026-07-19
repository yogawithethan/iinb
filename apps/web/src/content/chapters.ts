import "server-only";

import matter from "gray-matter";
import { marked, type Tokens } from "marked";
import generatedContent from "./generated-content.json";

export type ChapterBlock =
  | { type: "heading"; level: 1 | 2 | 3; html: string }
  | { type: "paragraph"; html: string }
  | { type: "blockquote"; html: string }
  | { type: "separator" };

export type ChapterMeta = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  part: string;
  isFree: boolean;
};

export type Chapter = ChapterMeta & {
  blocks: ChapterBlock[];
  /** true when the markdown file has no prose body yet (only stub/comments). */
  isEmpty: boolean;
};

async function readAll() {
  const rows = generatedContent.chapters.map(({ file, raw }) => {
    const { data, content } = matter(raw);
    const meta = normalizeMeta(data, file);
    return { meta, content };
  });
  return rows.sort((a, b) => a.meta.order - b.meta.order);
}

function normalizeMeta(data: Record<string, unknown>, file: string): ChapterMeta {
  return {
    id: String(data.id ?? file.replace(/\.md$/, "")),
    order: Number(data.order ?? 0),
    title: String(data.title ?? ""),
    subtitle: String(data.subtitle ?? ""),
    part: String(data.part ?? ""),
    isFree: Boolean(data.isFree),
  };
}

export async function listChapters(): Promise<ChapterMeta[]> {
  const rows = await readAll();
  return rows.map((r) => r.meta);
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const rows = await readAll();
  const row = rows.find((r) => r.meta.id === id);
  if (!row) return null;
  const blocks = parseBlocks(row.content);
  return { ...row.meta, blocks, isEmpty: blocks.length === 0 };
}

export async function getAllChapters(): Promise<Chapter[]> {
  const rows = await readAll();
  return rows.map((r) => {
    const blocks = parseBlocks(r.content);
    return { ...r.meta, blocks, isEmpty: blocks.length === 0 };
  });
}

export async function getFirstChapter(): Promise<Chapter> {
  const rows = await readAll();
  const first = rows[0];
  if (!first) {
    throw new Error("No chapters found in src/content/chapters/");
  }
  const blocks = parseBlocks(first.content);
  return { ...first.meta, blocks, isEmpty: blocks.length === 0 };
}

function parseBlocks(md: string): ChapterBlock[] {
  // Strip HTML comments so the "paste your content here" placeholder doesn't
  // leak into the rendered view.
  const cleaned = md.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!cleaned) return [];

  const tokens = marked.lexer(cleaned);
  const out: ChapterBlock[] = [];

  // Per-chapter footnote counter. Resets on every parseBlocks() call, so each
  // chapter starts from 1 independently.
  let footnoteCounter = 0;
  const nextFootnoteNumber = () => ++footnoteCounter;

  for (const t of tokens) {
    switch (t.type) {
      case "paragraph": {
        const p = t as Tokens.Paragraph;
        const lines = p.text
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          out.push({
            type: "paragraph",
            html: renderInlineWithFootnotes(line, nextFootnoteNumber),
          });
        }
        break;
      }
      case "heading": {
        const h = t as Tokens.Heading;
        const level = Math.min(3, Math.max(1, h.depth)) as 1 | 2 | 3;
        out.push({
          type: "heading",
          level,
          html: renderInlineWithFootnotes(h.text, nextFootnoteNumber),
        });
        break;
      }
      case "blockquote": {
        const q = t as Tokens.Blockquote;
        out.push({
          type: "blockquote",
          html: marked.parse(q.text, { async: false }) as string,
        });
        break;
      }
      case "hr":
        out.push({ type: "separator" });
        break;
      case "space":
        break;
      default:
        break;
    }
  }

  return out;
}

/**
 * Preprocess inline markdown text, extracting [[footnote text]] tokens
 * before running through marked, then swapping them back as superscript
 * spans afterwards. The spans carry the footnote text in a data attribute
 * and a sequential number; a client-side controller handles open/close +
 * typing animation.
 */
function renderInlineWithFootnotes(
  text: string,
  nextNum: () => number,
): string {
  const footnotes: Array<{ num: number; text: string }> = [];
  const pre = text.replace(/\[\[([^\]]+(?:\](?!\])[^\]]+)*)\]\]/g, (_, t) => {
    const num = nextNum();
    footnotes.push({ num, text: String(t).trim() });
    return `@@FN${footnotes.length - 1}@@`;
  });
  let html = marked.parseInline(pre) as string;
  html = html.replace(/@@FN(\d+)@@/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10);
    const fn = footnotes[idx];
    const textAttr = escapeAttr(fn.text);
    // Render a dagger (†) so the marker reads as a footnote affordance
    // rather than a stray number. The sequential position lives in the
    // data attribute in case we ever surface a list.
    return `<span class="footnote-ref" data-fn-num="${fn.num}" data-fn-text="${textAttr}" role="button" tabindex="0" aria-label="Footnote ${fn.num}">†</span>`;
  });
  return html;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
