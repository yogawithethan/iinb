import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

// "New example" refresh for an author-marked span. The YWE worker checks
// sign-in, purchase and rate limits, sends the whole paragraph to the model
// as context, and returns only the replacement span.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    paragraph?: unknown;
    span?: unknown;
    profile?: unknown;
  } | null;
  const paragraph = typeof body?.paragraph === "string" ? body.paragraph.trim() : "";
  const span = typeof body?.span === "string" ? body.span.trim() : "";
  if (!paragraph || !span || paragraph.length > 4000 || !paragraph.includes(span)) {
    return Response.json(
      { ok: false, error: "Choose an example from this paragraph." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    return jsonFromYwe(await yweRequest(request, "/iinb/refresh", {
      method: "POST",
      body: JSON.stringify({ mode: "span", paragraph, span, profile: body?.profile ?? {} }),
    }));
  } catch {
    return Response.json(
      { ok: false, error: "New examples are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
