import "server-only";

import { getAllChapters, type Chapter } from "./chapters";
import { getAllParts, type Part } from "./parts";
import { getDedication, type Dedication } from "./dedication";

export type ReaderNode =
  | { kind: "dedication"; dedication: Dedication }
  | { kind: "part"; part: Part }
  | { kind: "chapter"; chapter: Chapter };

export type ReaderStream = {
  nodes: ReaderNode[];
  chapters: Chapter[];
  parts: Part[];
  dedication: Dedication | null;
};

export async function getReaderStream(): Promise<ReaderStream> {
  const [chapters, parts, dedication] = await Promise.all([
    getAllChapters(),
    getAllParts(),
    getDedication(),
  ]);

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

  return { nodes, chapters, parts, dedication };
}
