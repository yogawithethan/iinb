import { NextResponse } from "next/server";
import { jsonFromYwe, yweRequest } from "@/lib/ywe-server";

type Body = { licenseKey?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = (body.licenseKey ?? "").trim();

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "License key is required." },
      { status: 400 },
    );
  }
  try {
    return jsonFromYwe(await yweRequest(req, "/iinb/redeem", {
      method: "POST",
      body: JSON.stringify({ licenseKey: key }),
    }));
  } catch {
    return NextResponse.json(
      { ok: false, error: "License redemption is temporarily unavailable." },
      { status: 503 },
    );
  }
}
