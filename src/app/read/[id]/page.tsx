import { notFound } from "next/navigation";
import { Chrome } from "@/components/reader/Chrome";
import { ReaderView } from "@/components/reader/ReaderView";
import { getChapter, listChapters } from "@/content/chapters";

export async function generateStaticParams() {
  const chapters = await listChapters();
  return chapters.map((c) => ({ id: c.id }));
}

export default async function ReadChapter({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [chapter, chapters] = await Promise.all([
    getChapter(id),
    listChapters(),
  ]);
  if (!chapter) notFound();

  return (
    <main className="reader-scroll min-h-[100dvh] w-full">
      <ReaderView chapter={chapter} />
      <Chrome
        chapterTitle={chapter.title}
        chapterSubtitle={chapter.subtitle}
        chapters={chapters}
        currentId={chapter.id}
      />
    </main>
  );
}
