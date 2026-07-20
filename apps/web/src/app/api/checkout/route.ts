import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    return jsonFromYwe(await yweRequest(request, "/iinb/checkout", {
      method: "POST",
      body,
    }));
  } catch {
    return Response.json(
      { ok: false, error: "Checkout is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
