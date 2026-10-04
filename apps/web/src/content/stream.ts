import "server-only";

import { getAllChapters, type Chapter, type ChapterMeta } from "./chapters";
import { getAllParts, type Part } from "./parts";
import { getDedication, type Dedication } from "./dedication";
import { getGlossary, type GlossaryEntry } from "./glossary";
import {
  chapterMentions,
  wrapGlossaryInChapter,
  wrapGlossaryRefreshers,
} from "./glossaryWrap";

export type ReaderNode =
  | { kind: "dedication"; dedication: Dedication }
  | { kind: "toc"; chapters: ChapterMeta[]; parts: Part[] }
  | { kind: "part"; part: Part }
  | { kind: "chapter"; chapter: Chapter };

export type ReaderStream = {
  nodes: ReaderNode[];
  chapters: Chapter[];
  parts: Part[];
  dedication: Dedication | null;
  glossary: GlossaryEntry[];
};

// The manuscript is bundled at build time and never changes at runtime, so
// parse it once per isolate instead of on every request — re-running marked
// + the glossary wrap over the whole book per hit burns Worker CPU budget.
// Callers must treat the result as read-only (gateStream builds new objects).
let cachedStream: Promise<ReaderStream> | null = null;

export function getReaderStream(): Promise<ReaderStream> {
  cachedStream ??= buildReaderStream().catch((error) => {
    cachedStream = null;
    throw error;
  });
  return cachedStream;
}

async function buildReaderStream(): Promise<ReaderStream> {
  const [rawChapters, parts, dedication, glossary] = await Promise.all([
    getAllChapters(),
    getAllParts(),
    getDedication(),
    getGlossary(),
  ]);

  // Where each term is introduced: its glossary chapter ("ch1", "ch2", …)
  // when the text actually uses it there, otherwise the next chapter that
  // does (e.g. saṃskāra is listed under Chapter 1 but first used in
  // Chapter 2). Passing mentions before that (the Preface) aren't linked.
  const indexOf = new Map(rawChapters.map((ch, i) => [ch.id, i]));
  const introIndex = new Map<string, number>();
  for (const entry of glossary) {
    const start = indexOf.get(`ch${entry.chapter}`) ?? 0;
    let intro = start;
    for (let i = start; i < rawChapters.length; i++) {
      if (chapterMentions(rawChapters[i].blocks, entry)) {
        intro = i;
        break;
      }
    }
    introIndex.set(entry.term, intro);
  }

  // Wrap the first occurrence of each term in its introducing chapter, and a
  // quieter refresher on its first appearance in every later chapter.
  const chapters = rawChapters.map((ch, i) => {
    const introduced = glossary.filter((g) => introIndex.get(g.term) === i);
    const refreshers = glossary
      .filter((g) => (introIndex.get(g.term) ?? i) < i)
      .map((g) => ({
        entry: g,
        introducedIn: rawChapters[introIndex.get(g.term) ?? 0]?.title ?? "",
      }));
    const blocks = wrapGlossaryRefreshers(
      wrapGlossaryInChapter(ch.blocks, introduced),
      refreshers,
    );
    return { ...ch, blocks };
  });

  const nodes: ReaderNode[] = [];

  if (dedication) nodes.push({ kind: "dedication", dedication });

  // A book-style Table of Contents page, right after the dedication and before
  // the Preface. Lists the full structure (all parts + chapters) regardless of
  // tier, so readers see the whole map from the start.
  nodes.push({
    kind: "toc",
    parts,
    chapters: chapters.map(
      ({ id, order, title, subtitle, part, isFree }) => ({
        id,
        order,
        title,
        subtitle,
        part,
        isFree,
      }),
    ),
  });

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
// Public visitors see the Preface, then the opening of Ch 0 as a teaser that
// runs into the "log in for free" gate.
const TEASER_CHAPTER_ID = "ch0";
const TEASER_BLOCKS = 5;

type Teaser = { id: string; blocks: number };

// Shrink a full stream down to what `visible()` allows: the flow stops at the
// first non-visible chapter (an optional `teaser` includes its opening blocks
// first), gated chapters are emptied of body, and the glossary is scoped to
// what's readable. Part dividers ride along only when a visible chapter follows.
function gateStream(
  stream: ReaderStream,
  visible: (chapter: Chapter) => boolean,
  teaser?: Teaser,
): ReaderStream {
  const nodes: ReaderNode[] = [];
  for (const node of stream.nodes) {
    if (node.kind === "chapter") {
      if (visible(node.chapter)) {
        nodes.push(node);
      } else if (teaser && node.chapter.id === teaser.id) {
        nodes.push({
          kind: "chapter",
          chapter: {
            ...node.chapter,
            blocks: node.chapter.blocks.slice(0, teaser.blocks),
            isEmpty: false,
          },
        });
        break; // the teaser is the last readable node before the gate
      } else {
        break;
      }
    } else {
      nodes.push(node); // dedication, or a part divider before a visible chapter
    }
  }
  // Never end on a dangling part divider (a part heading with no chapter after).
  while (nodes.length && nodes[nodes.length - 1].kind === "part") nodes.pop();

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
    chapters: stream.chapters.map((chapter) => {
      if (visible(chapter)) return chapter;
      if (teaser && chapter.id === teaser.id) {
        return {
          ...chapter,
          blocks: chapter.blocks.slice(0, teaser.blocks),
          isEmpty: false,
        };
      }
      return { ...chapter, blocks: [], isEmpty: false };
    }),
    glossary: stream.glossary.filter((entry) =>
      visibleNumbers.has(entry.chapter),
    ),
  };
}

// No account: Preface, then the opening of Ch 0 as a teaser.
export async function getPublicReaderStream(): Promise<ReaderStream> {
  const stream = await getReaderStream();
  return gateStream(stream, (chapter) => PUBLIC_CHAPTER_IDS.has(chapter.id), {
    id: TEASER_CHAPTER_ID,
    blocks: TEASER_BLOCKS,
  });
}

// Signed in, not yet purchased: every free chapter (Preface + Ch 0 + Ch 1).
export async function getMemberReaderStream(): Promise<ReaderStream> {
  const stream = await getReaderStream();
  return gateStream(stream, (chapter) => chapter.isFree);
}
