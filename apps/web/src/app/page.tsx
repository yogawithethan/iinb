import { ReaderShell } from "@/components/reader/ReaderShell";
import { getPublicReaderStream } from "@/content/stream";

export default async function Home() {
  const stream = await getPublicReaderStream();
  return <ReaderShell stream={stream} />;
}
