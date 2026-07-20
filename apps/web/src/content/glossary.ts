import "server-only";

import generatedContent from "./generated-content.json";

export type GlossaryEntry = {
  term: string;
  display: string;
  lang: string;
  pronunciation: string;
  definition: string;
  example?: string;
  used_in_sentence?: string;
  chapter: number;
  order: number;
  also_see: string[];
};

let cached: GlossaryEntry[] | null = null;

export async function getGlossary(): Promise<GlossaryEntry[]> {
  if (cached) return cached;
  cached = generatedContent.glossary as GlossaryEntry[];
  return cached;
}
