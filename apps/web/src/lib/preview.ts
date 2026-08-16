// Dev-only reading-state preview via a `?preview=` query param, so all three
// tiers can be reviewed on one server (running three Next dev servers on one
// codebase collides on the shared .next cache). Inert with no param present —
// production URLs never carry it, so behaviour is unchanged there.
export type PreviewState = "public" | "member" | "purchased";

// HARD GUARD: the preview override bypasses auth/entitlement, so it must never
// be active in production — otherwise `?preview=purchased` would hand anyone
// the full book for free. Only ever returns a state in a dev build.
const PREVIEW_ENABLED = process.env.NODE_ENV !== "production";

export function normalizePreview(v: unknown): PreviewState | null {
  if (!PREVIEW_ENABLED) return null;
  return v === "public" || v === "member" || v === "purchased" ? v : null;
}

// Client-side reader — reads the current URL's ?preview= param (dev only).
export function clientPreviewState(): PreviewState | null {
  if (!PREVIEW_ENABLED || typeof window === "undefined") return null;
  return normalizePreview(
    new URLSearchParams(window.location.search).get("preview"),
  );
}
