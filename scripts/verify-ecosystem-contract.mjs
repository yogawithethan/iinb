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

assert.match(layout, /src="\/shared-components\/loader\.js"/);
assert.match(layout, /active: "iinb"/);
assert.match(layout, /preset: "immersive-detail"/);
assert.match(manifest, /amountCents: 1499/);
assert.match(manifest, /freeChapterIds/);
assert.match(manifest, /"Access-Control-Allow-Origin": "\*"/);
assert.match(loader, /assets\/components\/loader\.js/);
assert.match(loader, /X-IINB-Shared-Component-Source/);
assert.match(chrome, /pl-\[76px\][\s\S]*md:pl-\[104px\]/);

console.log("IINB ecosystem contract passed.");
