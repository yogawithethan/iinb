import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked, type Tokens } from "marked";

const CHAPTERS_DIR = path.join(process.cwd(), "src/content/chapters");

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
  const files = (await fs.readdir(CHAPTERS_DIR)).filter((f) =>
    f.endsWith(".md"),
  );
  const rows = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(CHAPTERS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const meta = normalizeMeta(data, file);
      return { meta, content };
    }),
  );
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

  for (const t of tokens) {
    switch (t.type) {
      case "paragraph": {
        const p = t as Tokens.Paragraph;
        // Docx-pasted prose often separates paragraphs with single newlines
        // rather than blank lines; split each line into its own paragraph
        // so the page renders as discrete <p> elements (also lines us up
        // for future per-paragraph audio tap targets).
        const lines = p.text
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          out.push({
            type: "paragraph",
            html: marked.parseInline(line) as string,
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
          html: marked.parseInline(h.text) as string,
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
        // ignore blank-line tokens
        break;
      default:
        // Lists, code, tables etc. are not expected in the manuscript.
        // If they show up later, extend this switch.
        break;
    }
  }

  return out;
}
