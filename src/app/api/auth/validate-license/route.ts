import { NextResponse } from "next/server";

/**
 * Dev license that always validates. Swap this out for a real Lemon Squeezy
 * API call once the product is live: POST to
 * https://api.lemonsqueezy.com/v1/licenses/validate with the license_key,
 * then mark it activated via /licenses/activate so it can't be reused.
 */
const TEST_LICENSE = "IINB-TEST-2026";

type Body = { email?: string; licenseKey?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const key = (body.licenseKey ?? "").trim();

  if (!email || !key) {
    return NextResponse.json(
      { ok: false, error: "Email and license key are required." },
      { status: 400 },
    );
  }
  if (!/.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That email doesn't look right." },
      { status: 400 },
    );
  }
  if (key !== TEST_LICENSE) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "License key not recognized. Dev test key: IINB-TEST-2026",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
