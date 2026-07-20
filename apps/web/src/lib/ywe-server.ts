import "server-only";

import { NextResponse } from "next/server";

const DEFAULT_AUTH_ORIGIN = "https://auth.yogawithethan.com";
const DEFAULT_PUBLIC_ORIGIN = "https://iinb.yogawithethan.com";

function authOrigin() {
  return (process.env.YWE_AUTH_ORIGIN || DEFAULT_AUTH_ORIGIN).replace(/\/+$/, "");
}

export function readerReturnUrl(request: Request) {
  const incoming = new URL(request.url);
  if (incoming.hostname === "localhost" || incoming.hostname === "127.0.0.1") {
    return incoming.origin;
  }
  return (process.env.IINB_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, "");
}

export async function yweRequest(
  request: Request,
  path: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${authOrigin()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function jsonFromYwe(response: Response) {
  const data = await response.json().catch(() => ({
    ok: false,
    error: "Yoga With Ethan services returned an invalid response.",
  }));
  const headers = new Headers({ "Cache-Control": "no-store" });
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return NextResponse.json(data, { status: response.status, headers });
}
