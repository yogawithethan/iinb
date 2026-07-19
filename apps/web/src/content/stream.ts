import "server-only";

import { getAllChapters, type Chapter } from "./chapters";
import { getAllParts, type Part } from "./parts";
import { getDedication, type Dedication } from "./dedication";
import { getGlossary, type GlossaryEntry } from "./glossary";
import { wrapGlossaryInChapter } from "./glossaryWrap";

export type ReaderNode =
  | { kind: "dedication"; dedication: Dedication }
  | { kind: "part"; part: Part }
  | { kind: "chapter"; chapter: Chapter };

export type ReaderStream = {
  nodes: ReaderNode[];
  chapters: Chapter[];
  parts: Part[];
  dedication: Dedication | null;
  glossary: GlossaryEntry[];
};

export async function getReaderStream(): Promise<ReaderStream> {
  const [rawChapters, parts, dedication, glossary] = await Promise.all([
    getAllChapters(),
    getAllParts(),
    getDedication(),
    getGlossary(),
  ]);

  // For each chapter, scope the glossary to that chapter and wrap first
  // occurrences in the chapter's blocks. glossary.json uses a numeric
  // `chapter` field that maps to "ch1", "ch2", etc.
  const chapters = rawChapters.map((ch) => {
    const numberMatch = ch.id.match(/^ch(\d+)$/);
    const chapterNumber = numberMatch ? parseInt(numberMatch[1], 10) : -1;
    const entriesForChapter = glossary.filter(
      (g) => g.chapter === chapterNumber,
    );
    return {
      ...ch,
      blocks: wrapGlossaryInChapter(ch.blocks, entriesForChapter),
    };
  });

  const nodes: ReaderNode[] = [];

  if (dedication) nodes.push({ kind: "dedication", dedication });

  let lastPart = "";
  for (const chapter of chapters) {
    if (chapter.part && chapter.part !== lastPart) {
      const match = parts.find((p) => p.matchesChapterPart === chapter.part);
      if (match) nodes.push({ kind: "part", part: match });
    }
    lastPart = chapter.part ?? "";
    nodes.push({ kind: "chapter", chapter });
  }

  return { nodes, chapters, parts, dedication, glossary };
}
