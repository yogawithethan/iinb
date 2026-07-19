#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("apps/web/src/app/layout.tsx", "utf8");
const manifest = readFileSync(
  "apps/web/src/app/publication-manifest.json/route.ts",
  "utf8",
);
const loader = readFileSync(
  "apps/web/src/app/shared-components/loader.js/route.ts",
  "utf8",
);
const chrome = readFileSync(
  "apps/web/src/components/reader/Chrome.tsx",
  "utf8",
);
const nativePackage = readFileSync("apps/native/package.json", "utf8");
const nativeAccess = readFileSync("apps/native/lib/access.ts", "utf8");
const nativeAuth = readFileSync("apps/native/lib/AuthContext.tsx", "utf8");
const nativeIap = readFileSync("apps/native/lib/iap.ts", "utf8");
const nativeRefresh = readFileSync("apps/native/lib/refresh-paragraph.ts", "utf8");
const nativeLicense = readFileSync("apps/native/lib/license.ts", "utf8");
const webCheckout = readFileSync("apps/web/src/app/api/checkout/route.ts", "utf8");
const webSession = readFileSync("apps/web/src/app/api/session/route.ts", "utf8");

assert.match(layout, /src="\/shared-components\/loader\.js"/);
assert.match(layout, /active: "iinb"/);
assert.match(layout, /preset: "immersive-detail"/);
assert.match(manifest, /amountCents: 1499/);
assert.match(manifest, /freeChapterIds/);
assert.match(manifest, /"Access-Control-Allow-Origin": "\*"/);
assert.match(loader, /assets\/components\/loader\.js/);
assert.match(loader, /X-IINB-Shared-Component-Source/);
assert.match(chrome, /pl-\[76px\][\s\S]*md:pl-\[104px\]/);
assert.match(nativeAccess, /FREE_GATE_ORDER = 1/);
assert.match(nativeAuth, /requestNativeSignInLink/);
assert.match(nativeIap, /yweFetch\('\/iinb\/iap\/verify'/);
assert.match(nativeRefresh, /yweFetch\('\/iinb\/refresh'/);
assert.match(nativeLicense, /yweFetch\('\/iinb\/redeem'/);
assert.match(webCheckout, /"\/iinb\/checkout"/);
assert.match(webSession, /"\/iinb\/access"/);
assert.doesNotMatch(nativePackage, /@supabase\/supabase-js/);
for (const source of [nativeAuth, nativeIap, nativeRefresh, nativeLicense]) {
  assert.doesNotMatch(source, /supabase|polar/i);
}

console.log("IINB ecosystem contract passed.");
