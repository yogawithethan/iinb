# IINB web reader

Next.js reader served at `https://iinb.yogawithethan.com`.

## Local development

```bash
npm install
npm run dev
npm run build
npm run preview:cloudflare
```

The app keeps server-side proxy routes under `src/app/api/` so browser code never handles provider secrets. Identity comes from the shared Yoga With Ethan member cookie; Stripe checkout, entitlements, licenses, AI, and reader-state persistence are owned by the YWE Worker. Manuscript content comes only from `../../packages/content`; `npm run build:content` turns that canonical source into a deterministic, bundled web snapshot so the reader does not depend on a runtime filesystem.

Production uses the supported OpenNext adapter on Cloudflare Workers. `npm run preview:cloudflare` exercises the same `workerd` runtime used in production, and `npm run deploy:cloudflare` builds and deploys the Worker named `iinb-web`.

The canonical hostname currently reaches that Worker through the zone route `iinb.yogawithethan.com/*`, using the pre-existing proxied DNS record. The legacy Pages custom-domain binding is detached, while the Pages project remains available as a rollback artifact. `workers_dev` and preview URLs stay enabled so `https://iinb-web.yoga-e65.workers.dev` remains a direct recovery probe. After the legacy CNAME can be removed with a DNS-scoped credential, the zone route may be converted to a Worker Custom Domain without changing the public URL.

Production must expose `/publication-manifest.json` and `/shared-components/loader.js` alongside the reader. The latter loads the versioned Yoga With Ethan shared header while the reader retains its distinctive Lora/Inter reading typography.
