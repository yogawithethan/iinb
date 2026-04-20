import { ReaderShell } from "@/components/reader/ReaderShell";
import { getAllChapters } from "@/content/chapters";

export default async function Home() {
  const chapters = await getAllChapters();
  return <ReaderShell chapters={chapters} />;
}
