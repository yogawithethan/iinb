import { Chrome } from "@/components/reader/Chrome";
import { ReaderView } from "@/components/reader/ReaderView";
import { chapter0 } from "@/content/chapter0";

export default function Home() {
  return (
    <main className="reader-scroll min-h-[100dvh] w-full">
      <ReaderView chapter={chapter0} />
      <Chrome
        chapterTitle={chapter0.title}
        chapterSubtitle={chapter0.subtitle}
      />
    </main>
  );
}
