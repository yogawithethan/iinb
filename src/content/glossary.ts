import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

export type GlossaryEntry = {
  term: string;
  display: string;
  lang: string;
  pronunciation: string;
  definition: string;
  chapter: number;
  order: number;
  also_see: string[];
};

const GLOSSARY_FILE = path.join(process.cwd(), "glossary.json");

let cached: GlossaryEntry[] | null = null;

export async function getGlossary(): Promise<GlossaryEntry[]> {
  if (cached) return cached;
  try {
    const raw = await fs.readFile(GLOSSARY_FILE, "utf8");
    const parsed = JSON.parse(raw) as GlossaryEntry[];
    if (Array.isArray(parsed)) {
      cached = parsed;
      return cached;
    }
  } catch {
    // No glossary or unreadable — no glossary terms will be wrapped.
  }
  cached = [];
  return cached;
}
