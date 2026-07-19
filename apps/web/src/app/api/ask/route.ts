import { NextResponse } from "next/server";

type Message = { role: "user" | "assistant"; content: string };

type Body = {
  messages: Message[];
  chapterTitle?: string;
};

const SYSTEM_PROMPT = `You are a knowledgeable, warm companion to Ethan Hill's book "Ignorance Is Not Bliss." The book is organized in three parts: Part I (Comatosed) borrows from Buddhist diagnosis of suffering, Part II (Into the Chrysalis) from Yogic purification practices, Part III (Wings) from Christian vision of transformation.

Answer questions about the book's teachings, drawing on Buddhist, Yogic, and Christian traditions as the book does. Keep responses conversational and grounded in the actual spiritual traditions the book engages with. When you don't know, say so plainly.

Style: warm, direct, a little literary. No bullet lists unless the question really asks for one. Most responses should be 1-3 short paragraphs.`;

function mockReply(body: Body): string {
  const last = body.messages[body.messages.length - 1]?.content ?? "";
  return (
    `I'm running in demo mode — add \`ANTHROPIC_API_KEY\` to your \`.env.local\` and I'll be able to actually discuss the book with you. ` +
    `Once that's set, I'll answer "${last.slice(0, 80)}${last.length > 80 ? "…" : ""}" grounded in the actual text.`
  );
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: mockReply(body), mocked: true });
  }

  const system =
    body.chapterTitle
      ? `${SYSTEM_PROMPT}\n\nThe reader is currently on: ${body.chapterTitle}.`
      : SYSTEM_PROMPT;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system,
        messages: body.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({
        text: mockReply(body),
        mocked: true,
        error: `Anthropic ${res.status}: ${detail.slice(0, 200)}`,
      });
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) {
      return NextResponse.json({ text: mockReply(body), mocked: true });
    }
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({
      text: mockReply(body),
      mocked: true,
      error: String(e),
    });
  }
}
