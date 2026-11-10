// Regenerates src/lib/recitation-samples.ts from the full tajweed corpus.
// Run from the repo root:  node scripts/gen-recitation-samples.mjs
//
// Keep RANGES in step with PRESETS in src/app/recite/page.tsx.

import fs from "fs";

const RANGES = [
  [1, 1, 7],
  [112, 1, 4],
  [114, 1, 6],
  [2, 1, 5],
];

const corpus = JSON.parse(
  fs.readFileSync("public/text/qpc-hafs-tajweed.json", "utf8"),
);

const keys = [];
for (const [s, a, b] of RANGES) {
  for (let v = a; v <= b; v++) keys.push(`${s}:${v}`);
}

const missing = keys.filter((k) => !corpus[k]);
if (missing.length) {
  console.error("missing verses in corpus:", missing.join(", "));
  process.exit(1);
}

const body = keys
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(corpus[k].text)},`)
  .join("\n");

const out = `// Verses for the /recite presets, lifted verbatim from
// public/text/qpc-hafs-tajweed.json so the tokenizer sees real <rule> markup.
//
// The harness needs a handful of ayat, and the full corpus is 3.8 MB. Fetching
// that to recite eight words made the page hang on a phone and on any tunnel.
// Generated, do not hand-edit: re-run scripts/gen-recitation-samples.mjs.

import type { Verse } from "./recitation";

const SAMPLE_TEXT: Record<string, string> = {
${body}
};

/** Verses for a range, or null when the range is not bundled. */
export function getSampleRange(
  surah: number,
  from: number,
  to: number,
): Verse[] | null {
  const out: Verse[] = [];
  for (let v = from; v <= to; v++) {
    const text = SAMPLE_TEXT[\`\${surah}:\${v}\`];
    if (text === undefined) return null;
    out.push({ surah, verse: v, text });
  }
  return out.length ? out : null;
}
`;

fs.writeFileSync("src/lib/recitation-samples.ts", out);
console.log(`wrote src/lib/recitation-samples.ts (${keys.length} verses, ${out.length} bytes)`);
