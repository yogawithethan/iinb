# IINB web reader

Next.js reader served at `https://iinb.yogawithethan.com`.

## Local development

```bash
npm install
npm run dev
npm run build
```

The app keeps server-side proxy routes under `src/app/api/` so browser code never handles provider secrets. Identity comes from the shared Yoga With Ethan member cookie; Stripe checkout, entitlements, licenses, AI, and reader-state persistence are owned by the YWE Worker. Manuscript content comes from `../../packages/content`.

Production must expose `/publication-manifest.json` and `/shared-components/loader.js` alongside the reader. The latter loads the versioned Yoga With Ethan shared header while the reader retains its distinctive Lora/Inter reading typography.
