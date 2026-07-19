const SHARED_LOADER =
  "https://pub-3b18e580131f44348bc92d16ea67e216.r2.dev/assets/components/loader.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const upstream = await fetch(SHARED_LOADER, {
    headers: { Accept: "application/javascript" },
    next: { revalidate: 60 },
  });

  if (!upstream.ok) {
    return new Response("/* Yoga With Ethan shared loader unavailable. */", {
      status: 503,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(await upstream.text(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-IINB-Shared-Component-Source": SHARED_LOADER,
    },
  });
}
