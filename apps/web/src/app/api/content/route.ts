import { getReaderStream } from "@/content/stream";
import { yweRequest } from "@/lib/ywe-server";

export async function GET(request: Request) {
  try {
    const accessResponse = await yweRequest(request, "/iinb/access");
    const access = await accessResponse.json().catch(() => ({}));

    if (!accessResponse.ok) {
      return Response.json(
        { error: access.error || "access_unavailable" },
        {
          status: accessResponse.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (!access.entitled) {
      return Response.json(
        { error: "premium_required" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(await getReaderStream(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "content_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
