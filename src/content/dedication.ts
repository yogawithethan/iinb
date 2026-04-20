import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked, type Tokens } from "marked";
import type { ChapterBlock } from "./chapters";

const DEDICATION_FILE = path.join(
  process.cwd(),
  "src/content/dedication.md",
);

export type Dedication = {
  id: string;
  blocks: ChapterBlock[];
};

export async function getDedication(): Promise<Dedication | null> {
  let raw: string;
  try {
    raw = await fs.readFile(DEDICATION_FILE, "utf8");
  } catch {
    return null;
  }
  const { data, content } = matter(raw);
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;
  return {
    id: String(data.id ?? "dedication"),
    blocks,
  };
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
      case "space":
        break;
      default:
        break;
    }
  }
  return out;
}
