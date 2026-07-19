#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("apps/web/src/app/layout.tsx", "utf8");
const manifest = readFileSync(
  "apps/web/src/app/publication-manifest/route.ts",
  "utf8",
);
const nextConfig = readFileSync("apps/web/next.config.ts", "utf8");
const wranglerConfig = readFileSync("apps/web/wrangler.jsonc", "utf8");
const webContentSources = ["chapters", "parts", "dedication", "glossary"]
  .map((name) => readFileSync(`apps/web/src/content/${name}.ts`, "utf8"));
const loader = readFileSync(
  "apps/web/src/app/shared-components/[...asset]/route.ts",
  "utf8",
);
const chrome = readFileSync(
  "apps/web/src/components/reader/Chrome.tsx",
  "utf8",
);
const nativePackage = readFileSync("apps/native/package.json", "utf8");
const nativeApp = JSON.parse(readFileSync("apps/native/app.json", "utf8"));
const nativeAccess = readFileSync("apps/native/lib/access.ts", "utf8");
const nativeAuth = readFileSync("apps/native/lib/AuthContext.tsx", "utf8");
const nativeIap = readFileSync("apps/native/lib/iap.ts", "utf8");
const nativeRefresh = readFileSync("apps/native/lib/refresh-paragraph.ts", "utf8");
const nativeLicense = readFileSync("apps/native/lib/license.ts", "utf8");
const webCheckout = readFileSync("apps/web/src/app/api/checkout/route.ts", "utf8");
const webSession = readFileSync("apps/web/src/app/api/session/route.ts", "utf8");
const webContent = readFileSync("apps/web/src/app/api/content/route.ts", "utf8");
const webPage = readFileSync("apps/web/src/app/page.tsx", "utf8");
const webGlossaryRefresh = readFileSync("apps/web/src/app/api/glossary/refresh/route.ts", "utf8");

assert.match(layout, /src="\/shared-components\/loader\.js"/);
assert.match(layout, /active: "iinb"/);
assert.match(layout, /preset: "immersive-detail"/);
assert.match(manifest, /amountCents: 2200/);
assert.match(manifest, /freeChapterIds/);
assert.match(manifest, /"Access-Control-Allow-Origin": "\*"/);
assert.match(nextConfig, /source: "\/publication-manifest\.json"/);
assert.match(nextConfig, /destination: "\/publication-manifest"/);
assert.match(wranglerConfig, /"main": "\.open-next\/worker\.js"/);
assert.match(wranglerConfig, /"nodejs_compat"/);
assert.match(wranglerConfig, /"workers_dev": true/);
assert.match(wranglerConfig, /"pattern": "iinb\.yogawithethan\.com\/\*"/);
assert.match(wranglerConfig, /"zone_id": "f27f4c1bf68e63d75e63a64e1b5edf3c"/);
assert.match(loader, /assets\/components/);
assert.match(loader, /path === "loader\.js"/);
assert.match(loader, /X-YWE-Shared-Component-Proxy/);
assert.match(loader, /stable-loader/);
assert.match(loader, /immutable-asset/);
assert.match(loader, /source\.replaceAll/);
assert.match(chrome, /pl-\[76px\][\s\S]*md:pl-\[104px\]/);
assert.match(nativeAccess, /FREE_GATE_ORDER = 1/);
assert.match(nativeAuth, /requestNativeSignInLink/);
assert.match(nativeIap, /yweFetch\('\/iinb\/iap\/verify'/);
assert.match(nativeIap, /PRODUCT_FULL_BOOK = 'iinb\.fullbook'/);
assert.match(nativeIap, /PRODUCT_GIFT_CODE = 'iinb\.giftcode'/);
assert.equal(nativeApp.expo.owner, "yogawithethan");
assert.equal(nativeApp.expo.ios.bundleIdentifier, "com.yogawithethan.iinb");
assert.equal(nativeApp.expo.extra.eas.projectId, "30783386-c185-4e88-8509-b33e92f22b45");
assert.equal(nativeApp.expo.updates.url, `https://u.expo.dev/${nativeApp.expo.extra.eas.projectId}`);
assert.match(nativeRefresh, /yweFetch\('\/iinb\/refresh'/);
assert.match(nativeLicense, /yweFetch\('\/iinb\/redeem'/);
assert.match(webCheckout, /"\/iinb\/checkout"/);
assert.match(webSession, /"\/iinb\/access"/);
assert.match(webPage, /getPublicReaderStream/);
assert.match(webContent, /"\/iinb\/access"/);
assert.match(webContent, /if \(!access\.entitled\)/);
assert.match(webContent, /getReaderStream\(\)/);
assert.match(webContent, /Cache-Control": "private, no-store"/);
assert.match(webGlossaryRefresh, /"\/iinb\/glossary\/refresh"/);
assert.doesNotMatch(webGlossaryRefresh, /ANTHROPIC_API_KEY|api\.anthropic\.com|mockResponse/);
assert.doesNotMatch(nativePackage, /@supabase\/supabase-js/);
for (const source of webContentSources) {
  assert.doesNotMatch(source, /node:fs|process\.cwd\(\)|packages\/content/);
  assert.match(source, /generated-content\.json/);
}
for (const source of [nativeAuth, nativeIap, nativeRefresh, nativeLicense]) {
  assert.doesNotMatch(source, /supabase|polar/i);
}

console.log("IINB ecosystem contract passed.");
