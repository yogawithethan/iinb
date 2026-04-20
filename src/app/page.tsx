import { Chrome } from "@/components/reader/Chrome";
import { ReaderView } from "@/components/reader/ReaderView";
import { getFirstChapter } from "@/content/chapters";

export default async function Home() {
  const chapter = await getFirstChapter();

  return (
    <main className="reader-scroll min-h-[100dvh] w-full">
      <ReaderView chapter={chapter} />
      <Chrome
        chapterTitle={chapter.title}
        chapterSubtitle={chapter.subtitle}
      />
    </main>
  );
}
