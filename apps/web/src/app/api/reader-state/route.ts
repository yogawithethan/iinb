import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

async function proxy(request: Request, method: "GET" | "PUT") {
  const body = method === "PUT" ? await request.text() : undefined;
  try {
    return jsonFromYwe(await yweRequest(request, "/iinb/reader-state", { method, body }));
  } catch {
    return Response.json(
      { ok: false, error: "Reader sync is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET(request: Request) {
  return proxy(request, "GET");
}

export function PUT(request: Request) {
  return proxy(request, "PUT");
}
