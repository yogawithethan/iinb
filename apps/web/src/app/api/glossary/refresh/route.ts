import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    return jsonFromYwe(await yweRequest(request, "/iinb/glossary/refresh", {
      method: "POST",
      body,
    }));
  } catch {
    return Response.json(
      { ok: false, error: "Glossary refresh is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
