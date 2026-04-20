import { NextResponse } from "next/server";

type Kind = "definition" | "example";

type Body = {
  term: string;
  display?: string;
  language: string;
  pronunciation: string;
  kind: Kind;
};

function buildPrompt(body: Body): string {
  const name = body.display ?? body.term;
  if (body.kind === "definition") {
    return `Rewrite this definition of ${name} (${body.language} — ${body.pronunciation}) in one to three clear, warm sentences. It should be accurate, accessible to a general spiritual seeker, and avoid academic jargon. Return only the definition text, no preamble.`;
  }
  return `Write one example sentence using the word ${name} naturally in context. The sentence should feel like it could appear in a literary spiritual nonfiction book — not a textbook. The term should not be defined within the sentence; it should simply be used. Return only the sentence, no preamble.`;
}

function mockResponse(body: Body): string {
  if (body.kind === "definition") {
    return `${body.display ?? body.term} — a teaching from the ${body.language} tradition (pronounced ${body.pronunciation}), pointing toward something every seeker eventually comes to know in their own way.`;
  }
  return `In the small hours of the retreat, he came to feel ${body.display ?? body.term} not as an idea but as a quality of attention.`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.term || !body.kind) {
    return NextResponse.json(
      { error: "Missing term or kind" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: mockResponse(body), mocked: true });
  }

  const prompt = buildPrompt(body);
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
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Anthropic ${res.status}`, detail: text, text: mockResponse(body), mocked: true },
        { status: 200 },
      );
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
      return NextResponse.json({ text: mockResponse(body), mocked: true });
    }
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({
      text: mockResponse(body),
      mocked: true,
      error: String(e),
    });
  }
}
