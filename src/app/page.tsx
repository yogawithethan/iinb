import { ReaderShell } from "@/components/reader/ReaderShell";
import { getReaderStream } from "@/content/stream";

export default async function Home() {
  const stream = await getReaderStream();
  return <ReaderShell stream={stream} />;
}
