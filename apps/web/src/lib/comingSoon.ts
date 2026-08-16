// Reader capabilities not yet shipped. These are surfaced in the UI as
// "coming soon" teasers (locked affordance) for everyone — buyers included —
// so no one hits a half-working feature. Flip a flag to `false` to go live;
// the AI + rewrite backends are already wired, so those two are one-line flips.
export const COMING_SOON = {
  audio: true, // narration / karaoke — no playback engine yet
  ai: true, // "ask the book" — backend ready, held for launch
  rewrites: true, // glossary example rewrites — backend ready, held for launch
  pageTurn: true, // paginated "page-turn" reading mode — not built yet (reader is scroll-only)
} as const;
