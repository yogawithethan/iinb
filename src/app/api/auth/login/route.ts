import { NextResponse } from "next/server";

type Body = { email?: string; password?: string };

/**
 * Dev login stub. Accepts any email + password combo so you can flow
 * through the returning-reader path. Replace with a real Supabase call
 * (supabase.auth.signInWithPassword) once auth is wired.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = (body.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }
  if (!/.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That email doesn't look right." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
