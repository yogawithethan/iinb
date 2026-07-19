const SHARED_COMPONENT_ORIGIN =
  "https://pub-3b18e580131f44348bc92d16ea67e216.r2.dev/assets/components";
const LOCAL_COMPONENT_ORIGIN = "/shared-components";

function safeAssetPath(parts: string[]) {
  if (
    !parts.length ||
    parts.some(
      (part) => !part || part === "." || part === ".." || part.includes("/"),
    )
  ) {
    return null;
  }

  const path = parts.join("/");
  return path === "loader.js" ||
    /^[a-z0-9-]+\/\d{4}\.\d{2}\.\d{2}\.\d+\/[a-z0-9-]+\.js$/.test(path)
    ? path
    : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string[] }> },
) {
  const asset = safeAssetPath((await params).asset);
  if (!asset) return new Response("Not found", { status: 404 });

  const upstream = await fetch(`${SHARED_COMPONENT_ORIGIN}/${asset}`, {
    cache: "no-store",
  });
  if (!upstream.ok) {
    return new Response("Shared component unavailable", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  let source = await upstream.text();
  const isLoader = asset === "loader.js";
  if (isLoader) {
    source = source.replaceAll(
      `${SHARED_COMPONENT_ORIGIN}/`,
      `${LOCAL_COMPONENT_ORIGIN}/`,
    );
  }

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": isLoader
        ? "no-cache, max-age=0, must-revalidate"
        : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-YWE-Shared-Component-Proxy": isLoader
        ? "stable-loader"
        : "immutable-asset",
    },
  });
}
