import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

export async function GET(request: Request) {
  try {
    return jsonFromYwe(await yweRequest(request, "/iinb/access"));
  } catch {
    return Response.json(
      { loggedIn: false, entitled: false, error: "access_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
