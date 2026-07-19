import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'packages', 'content');
const errors = [];

function fail(message) {
  errors.push(message);
}

function parseFrontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    fail(`${file}: missing front matter`);
    return { data: {}, body: raw };
  }
  const data = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    let value = field[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+$/.test(value)) value = Number(value);
    data[field[1]] = value;
  }
  return { data, body: match[2] };
}

function markdownFiles(directory) {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => ({ file, ...parseFrontmatter(join(directory, file)) }));
}

function assertUnique(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item.data[key];
    if (value === undefined || value === '') {
      fail(`${label}/${item.file}: missing ${key}`);
    } else if (seen.has(value)) {
      fail(`${label}: duplicate ${key} ${String(value)}`);
    }
    seen.add(value);
  }
}

const chapters = markdownFiles(join(CONTENT, 'chapters'));
const parts = markdownFiles(join(CONTENT, 'parts'));

assertUnique(chapters, 'id', 'chapters');
assertUnique(chapters, 'order', 'chapters');
assertUnique(parts, 'id', 'parts');
assertUnique(parts, 'order', 'parts');
assertUnique(parts, 'matchesChapterPart', 'parts');

for (const chapter of chapters) {
  if (!chapter.data.title) fail(`chapters/${chapter.file}: missing title`);
  if (typeof chapter.data.isFree !== 'boolean') {
    fail(`chapters/${chapter.file}: isFree must be true or false`);
  }
}

const actualFree = chapters
  .filter((chapter) => chapter.data.isFree)
  .map((chapter) => chapter.data.id)
  .sort();
const expectedFree = ['ch0', 'preface'];
if (JSON.stringify(actualFree) !== JSON.stringify(expectedFree)) {
  fail(`free access must be preface + ch0; found ${actualFree.join(', ') || 'none'}`);
}

const partNames = new Set(parts.map((part) => part.data.matchesChapterPart));
for (const chapter of chapters) {
  const part = chapter.data.part;
  if (typeof part === 'string' && part.startsWith('Part ') && !partNames.has(part)) {
    fail(`chapters/${chapter.file}: unknown part ${part}`);
  }
}

let glossary;
try {
  glossary = JSON.parse(readFileSync(join(CONTENT, 'glossary.json'), 'utf8'));
} catch (error) {
  fail(`glossary.json: invalid JSON (${error.message})`);
  glossary = [];
}
if (!Array.isArray(glossary)) fail('glossary.json: expected an array');
const terms = new Set();
for (const [index, entry] of (Array.isArray(glossary) ? glossary : []).entries()) {
  if (!entry.term || !entry.definition) fail(`glossary.json[${index}]: missing term or definition`);
  const normalized = String(entry.term || '').toLowerCase();
  if (terms.has(normalized)) fail(`glossary.json: duplicate term ${entry.term}`);
  terms.add(normalized);
}

const audioById = new Set(
  readdirSync(join(CONTENT, 'audio')).map((file) => basename(file, extname(file)).toLowerCase()),
);
for (const chapter of chapters) {
  for (const match of chapter.body.matchAll(/\{\{audio:([^}]+)\}\}/g)) {
    const id = match[1].trim().toLowerCase();
    if (!audioById.has(id)) fail(`chapters/${chapter.file}: missing audio asset ${id}`);
  }
  for (const match of chapter.body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    const source = match[1].trim();
    if (/^(https?:|data:)/.test(source)) continue;
    if (!existsSync(join(CONTENT, 'images', basename(source)))) {
      fail(`chapters/${chapter.file}: missing image asset ${source}`);
    }
  }
}

if (errors.length) {
  console.error(`IINB content verification failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `IINB content verified: ${chapters.length} chapters, ${parts.length} parts, ${glossary.length} glossary entries`,
);
