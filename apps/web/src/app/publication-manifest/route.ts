import { listChapters } from "@/content/chapters";
import { getGlossary } from "@/content/glossary";
import { getAllParts } from "@/content/parts";

export const dynamic = "force-static";

export async function GET() {
  const [chapters, parts, glossary] = await Promise.all([
    listChapters(),
    getAllParts(),
    getGlossary(),
  ]);
  const freeChapterIds = chapters
    .filter((chapter) => chapter.isFree)
    .map((chapter) => chapter.id);

  return Response.json(
    {
      schemaVersion: 1,
      product: {
        id: "iinb",
        title: "Ignorance Is Not Bliss",
        author: "Ethan Hill",
        price: { amountCents: 2200, currency: "usd", type: "one_time" },
      },
      publication: {
        chapterCount: chapters.length,
        partCount: parts.length,
        glossaryEntryCount: glossary.length,
        freeChapterIds,
        paidChapterCount: chapters.length - freeChapterIds.length,
        chapters: chapters.map(({ id, order, title, subtitle, part, isFree }) => ({
          id,
          order,
          title,
          subtitle,
          part,
          isFree,
        })),
      },
      surfaces: {
        web: "https://iinb.yogawithethan.com",
        sharedChrome: "stable-loader-proxy",
        native: "parity-after-web-cutover",
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    },
  );
}
