import { NextResponse } from "next/server";
import { jsonFromYwe, readerReturnUrl, yweRequest } from "@/lib/ywe-server";

type Body = { email?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Email is required." },
      { status: 400 },
    );
  }
  if (!/.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That email doesn't look right." },
      { status: 400 },
    );
  }
  try {
    const response = await yweRequest(req, "/auth/member/request-link", {
      method: "POST",
      body: JSON.stringify({ email, return: readerReturnUrl(req) }),
    });
    return jsonFromYwe(response);
  } catch {
    return NextResponse.json(
      { ok: false, error: "The sign-in email could not be sent. Try again." },
      { status: 503 },
    );
  }
}
