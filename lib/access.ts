// Three-tier access model for the book.
//
//   Preface (order 0)             — always free.
//   Chapters 0 + 1 (order 1, 2)   — unlocked once the reader signs in.
//   Chapter 2 onwards (order ≥ 3) — requires purchase.
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

export const SIGNUP_GATE_ORDER = 0; // chapters above this need signup (until purchase gate)
export const PURCHASE_GATE_ORDER = 2; // chapters above this need purchase

export function chapterTier({ order, isAuthed, purchased }: AccessInput): AccessTier {
  if (purchased) return 'open';
  if (order > PURCHASE_GATE_ORDER) return 'requires-purchase';
  if (order > SIGNUP_GATE_ORDER && !isAuthed) return 'requires-signin';
  return 'open';
}
