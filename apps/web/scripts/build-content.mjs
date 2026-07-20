#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const contentRoot = join(root, "packages", "content");
const outputFile = resolve(import.meta.dirname, "../src/content/generated-content.json");

function markdownSources(directory) {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({
      file,
      raw: readFileSync(join(directory, file), "utf8"),
    }));
}

const chapters = markdownSources(join(contentRoot, "chapters"));
const parts = markdownSources(join(contentRoot, "parts"));
const dedication = {
  file: "dedication.md",
  raw: readFileSync(join(contentRoot, "dedication.md"), "utf8"),
};
const glossary = JSON.parse(
  readFileSync(join(contentRoot, "glossary.json"), "utf8"),
);
const sourceHash = createHash("sha256")
  .update(JSON.stringify({ chapters, parts, dedication, glossary }))
  .digest("hex");
const output = `${JSON.stringify({
  _generated: {
    schemaVersion: 1,
    source: "packages/content",
    sourceHash,
  },
  chapters,
  parts,
  dedication,
  glossary,
}, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(outputFile, "utf8");
  } catch {
    // Report the same actionable message for a missing or stale snapshot.
  }
  if (current !== output) {
    console.error("IINB web content snapshot is stale. Run npm --prefix apps/web run build:content.");
    process.exit(1);
  }
  console.log(`IINB web content snapshot verified: ${sourceHash.slice(0, 12)}`);
  process.exit(0);
}

writeFileSync(outputFile, output);
console.log(
  `Built IINB web content snapshot: ${chapters.length} chapters, ${parts.length} parts, ${glossary.length} glossary entries (${sourceHash.slice(0, 12)})`,
);
