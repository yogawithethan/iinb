import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked, type Tokens } from "marked";
import type { ChapterBlock } from "./chapters";

// Shared with iinb-native via /drsti/iinb-shared/content/.
const PARTS_DIR = path.resolve(process.cwd(), "../iinb-shared/content/parts");

export type Part = {
  id: string;
  order: number;
  numeral: string;
  title: string;
  matchesChapterPart: string;
  blocks: ChapterBlock[];
};

export async function getAllParts(): Promise<Part[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(PARTS_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const parts: Part[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(PARTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    parts.push({
      id: String(data.id ?? file.replace(/\.md$/, "")),
      order: Number(data.order ?? 0),
      numeral: String(data.numeral ?? ""),
      title: String(data.title ?? ""),
      matchesChapterPart: String(data.matchesChapterPart ?? ""),
      blocks: parseBlocks(content),
    });
  }
  return parts.sort((a, b) => a.order - b.order);
}

function parseBlocks(md: string): ChapterBlock[] {
  const cleaned = md.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!cleaned) return [];
  const tokens = marked.lexer(cleaned);
  const out: ChapterBlock[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "paragraph": {
        const p = t as Tokens.Paragraph;
        for (const line of p.text.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
          out.push({ type: "paragraph", html: marked.parseInline(line) as string });
        }
        break;
      }
      case "heading": {
        const h = t as Tokens.Heading;
        const level = Math.min(3, Math.max(1, h.depth)) as 1 | 2 | 3;
        out.push({ type: "heading", level, html: marked.parseInline(h.text) as string });
        break;
      }
      case "blockquote": {
        // For epigraphs: split each line of the blockquote into its own <p>
        // so the quote and the "— Attribution" render as distinct lines we
        // can style independently.
        const q = t as Tokens.Blockquote;
        const lines = q.text
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const html = lines
          .map((line) => `<p>${marked.parseInline(line) as string}</p>`)
          .join("");
        out.push({ type: "blockquote", html });
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
