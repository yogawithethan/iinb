# IINB native reader

Expo reader for **Ignorance Is Not Bliss**. Content is generated from `../../packages/content`; do not edit `content/` as a canonical source.

## Local development

```bash
npm install
npm run build:chapters
npm run lint
npx tsc --noEmit
npx expo start
```

Copy `.env.example` to `.env.local` when overriding the default YWE auth origin. The app uses a one-time YWE email link and stores the resulting bearer session in `expo-secure-store`.

iOS full-book and gift purchases use StoreKit. Receipt verification, entitlements, license codes, AI, reader personalization, and license redemption all resolve through the canonical YWE Worker. Supabase and Polar are not native runtime dependencies.

Use [APP-STORE-RELEASE.md](./APP-STORE-RELEASE.md) for the credential handoff, StoreKit product setup, sandbox test matrix, and submission gates. `app.backup.json` preserves the pre-integration Expo project configuration only; it is not an active build input.
