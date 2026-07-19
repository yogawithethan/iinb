import { getChapter } from "@/content/chapters";
import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

type Message = { role: "user" | "assistant"; content: string };
type Body = { messages?: Message[]; chapterId?: string };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Body | null;
  if (!body || !Array.isArray(body.messages) || !body.messages.length) {
    return Response.json({ ok: false, error: "A question is required." }, { status: 400 });
  }

  const chapterId = String(body.chapterId || "").slice(0, 80);
  const chapter = chapterId ? await getChapter(chapterId) : null;
  const chapterExcerpt = chapter?.blocks.map((block) =>
    "html" in block ? block.html : "---",
  ).join("\n\n") || "";

  try {
    return jsonFromYwe(await yweRequest(request, "/iinb/ask", {
      method: "POST",
      body: JSON.stringify({
        messages: body.messages,
        chapterId: chapter?.id || chapterId,
        chapterTitle: chapter?.title || "",
        chapterExcerpt,
      }),
    }));
  } catch {
    return Response.json(
      { ok: false, error: "Ask the book is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
