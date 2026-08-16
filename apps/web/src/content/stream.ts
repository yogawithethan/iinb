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

// Reading tiers:
//   public  — visible with no account at all (SSR landing).      → Preface only
//   member  — visible once signed in, before purchase (all free). → Preface + Ch 0 + Ch 1
//   full    — everything, after purchase.
// Public chapters are a hardcoded subset of the free chapters; the rest of the
// free chapters (Ch 0, Ch 1) unlock on login via /api/content.
const PUBLIC_CHAPTER_IDS = new Set(["preface"]);

// Shrink a full stream down to only the chapters `visible()` allows: trailing
// chapters are dropped from the flow, gated chapters are emptied of body, and
// the glossary is scoped to what's readable.
function gateStream(
  stream: ReaderStream,
  visible: (chapter: Chapter) => boolean,
): ReaderStream {
  const nodes: ReaderNode[] = [];
  for (const node of stream.nodes) {
    if (node.kind === "part") break;
    if (node.kind === "chapter" && !visible(node.chapter)) break;
    nodes.push(node);
  }
  const visibleNumbers = new Set(
    stream.chapters
      .filter(visible)
      .map((chapter) => chapter.id.match(/^ch(\d+)$/)?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number),
  );
  return {
    ...stream,
    nodes,
    chapters: stream.chapters.map((chapter) =>
      visible(chapter) ? chapter : { ...chapter, blocks: [], isEmpty: false },
    ),
    glossary: stream.glossary.filter((entry) =>
      visibleNumbers.has(entry.chapter),
    ),
  };
}

// No account: Preface only.
export async function getPublicReaderStream(): Promise<ReaderStream> {
  const stream = await getReaderStream();
  return gateStream(stream, (chapter) => PUBLIC_CHAPTER_IDS.has(chapter.id));
}

// Signed in, not yet purchased: every free chapter (Preface + Ch 0 + Ch 1).
export async function getMemberReaderStream(): Promise<ReaderStream> {
  const stream = await getReaderStream();
  return gateStream(stream, (chapter) => chapter.isFree);
}
