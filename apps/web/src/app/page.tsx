import { ReaderShell } from "@/components/reader/ReaderShell";
import {
  getPublicReaderStream,
  getMemberReaderStream,
  getReaderStream,
} from "@/content/stream";
import { normalizePreview } from "@/lib/preview";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const preview = normalizePreview((await searchParams)?.preview);
  // Production URLs carry no ?preview, so this always starts from the public
  // stream. A dev preview can start from the member or full stream instead.
  const stream =
    preview === "purchased"
      ? await getReaderStream()
      : preview === "member"
        ? await getMemberReaderStream()
        : await getPublicReaderStream();
  return <ReaderShell stream={stream} />;
}
