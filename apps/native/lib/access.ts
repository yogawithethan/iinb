// Three-tier access model for the book.
//
//   Preface + Chapter 0 (orders 0–1) — always free.
//   Chapter 1 onwards (order ≥ 2)    — requires the complete-reader purchase.
//
// The bottom CTA in the reader nudges guests to sign up (carrot: 2 free
// chapters), then nudges signed-in non-buyers to purchase. Tapping a locked
// chapter in the TOC routes to whichever step is needed next.

export type AccessTier = 'open' | 'requires-signin' | 'requires-purchase';

export type AccessInput = {
  order: number;
  isAuthed: boolean;
  purchased: boolean;
};

export const FREE_GATE_ORDER = 1;

export function chapterTier({ order, isAuthed, purchased }: AccessInput): AccessTier {
  if (purchased) return 'open';
  if (order <= FREE_GATE_ORDER) return 'open';
  return isAuthed ? 'requires-purchase' : 'requires-signin';
}
