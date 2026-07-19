// License code generator. Format: IINB-XXXX-XXXX-XXXX
//
// Alphabet excludes O/0/I/1/L to avoid copy-paste typos when read aloud.
// 12 random characters from a 31-char alphabet ≈ 60 bits of entropy — far
// beyond brute-force reach even at billions of guesses per second.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIX = 'IINB';

export function generateLicenseCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/**
 * Normalize user-entered codes — strip whitespace, dashes, lowercase, then
 * re-format with dashes. Lets users paste with or without separators.
 */
export function normalizeLicenseCode(input: string): string {
  const stripped = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (stripped.length !== 16) return stripped;
  if (stripped.slice(0, 4) !== PREFIX) return stripped;
  return `${PREFIX}-${stripped.slice(4, 8)}-${stripped.slice(8, 12)}-${stripped.slice(12, 16)}`;
}
