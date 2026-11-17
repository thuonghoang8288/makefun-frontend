// makefun-frontend-01 entry (Node 22, standard library only). The frontend is
// app/: plain static files — app/index.html plus ES modules and CSS, no build
// step — showing make.fun's live bounties from its public API at
// https://make.fun/api: a board with sort, filter and search, a page per bounty
// with its live pot and rewards table, paginated leaderboards, and public
// profiles, all on hash routes. This script hands the entry in: it checks the
// tree against the scorer's caps first (see preflight below), then copies app/
// and screenshots/ from beside this file to the output directory and writes
// dossier.json there — the summary the judge reads (screenshots, first-load
// files and bytes, and the source) — using the vendored make.fun library.
// Leave vendor/makefun-frontend.ts as it is: the scorer requires dossier.json
// to be byte for byte what its own copy writes.
//
// Preview the frontend itself with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The scorer's caps, checked here before anything is copied: at most 3
// screenshots, each at most 256 KiB; app/ at most 993 files and directories
// and 16 MiB of files. A tree the scorer would refuse is refused here instead,
// with the exact problem named, so a bad entry never reaches the judge.
const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_APP_ENTRIES = 993;
const MAX_APP_BYTES = 16777216;

function fail(message) {
  throw new Error(`pre-flight: ${message}`);
}

// One recursive pass over a directory: how many files and directories it
// holds, and how many bytes its files total.
function walk(dir) {
  let entries = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    entries += 1;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(full);
      entries += sub.entries;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      bytes += statSync(full).size;
    }
  }
  return { entries, bytes };
}

function preflight() {
  const index = join(here, 'app', 'index.html');
  if (!existsSync(index)) fail('app/index.html is missing — the board has no entry page');
  const shotsDir = join(here, 'screenshots');
  if (existsSync(shotsDir)) {
    const shots = readdirSync(shotsDir).filter((f) => statSync(join(shotsDir, f)).isFile());
    if (shots.length > MAX_SCREENSHOTS) fail(`${shots.length} screenshots found, but the cap is ${MAX_SCREENSHOTS}`);
    for (const shot of shots) {
      const size = statSync(join(shotsDir, shot)).size;
      if (size > MAX_SCREENSHOT_BYTES) fail(`screenshots/${shot} is ${size} bytes, over the ${MAX_SCREENSHOT_BYTES} byte cap`);
    }
  }
  const app = walk(join(here, 'app'));
  if (app.entries > MAX_APP_ENTRIES) fail(`app/ holds ${app.entries} files and directories, over the ${MAX_APP_ENTRIES} cap`);
  if (app.bytes > MAX_APP_BYTES) fail(`app/ totals ${app.bytes} bytes, over the ${MAX_APP_BYTES} byte cap`);
  return app;
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appStats = preflight();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The limits below mirror the scorer's gate: text_max_bytes shapes the bytes
// counted, and the rest refuse an entry the scorer would refuse — too many
// screenshots, one too large, or app/ too big. preflight() already checked
// those same limits here, so a failure at this point would be the scorer's
// own verdict, not a surprise.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);

// Trust the write, then check it: re-read dossier.json, parse it, and confirm
// it has the shape the judge reads — the v1 schema, a screenshots list, and
// the app files listing inside its text. A half-written or truncated dossier
// would fail the scorer without a word, so fail here instead, naming the
// exact problem while the tree is still in front of us.
const dossierPath = join(out, 'dossier.json');
let dossier;
try {
  dossier = JSON.parse(readFileSync(dossierPath, 'utf-8'));
} catch (err) {
  throw new Error(`dossier check: ${dossierPath} did not parse as JSON (${err.message})`);
}
if (!dossier || typeof dossier !== 'object' || Array.isArray(dossier)) {
  throw new Error('dossier check: dossier.json is not a JSON object');
}
if (dossier.schema !== 'makefun/dossier/v1') {
  throw new Error(`dossier check: unexpected schema ${JSON.stringify(dossier.schema)}`);
}
if (!Array.isArray(dossier.images) || dossier.images.length === 0) {
  throw new Error('dossier check: the screenshots list is missing or empty');
}
for (const [i, shot] of dossier.images.entries()) {
  if (!shot || typeof shot.base64 !== 'string' || shot.base64.length === 0) {
    throw new Error(`dossier check: screenshot ${i} has no base64 image data`);
  }
}
if (typeof dossier.text !== 'string' || !dossier.text.includes('## Sources') || !dossier.text.includes('app/index.html')) {
  throw new Error('dossier check: the dossier text is missing the app files listing');
}

// A short summary, so a local run shows what was handed in.
const shotCount = existsSync(join(here, 'screenshots')) ? readdirSync(join(here, 'screenshots')).length : 0;
console.log(`copied app/ (${appStats.entries} entries, ${appStats.bytes} bytes) and ${shotCount} screenshot(s); wrote dossier.json (${statSync(join(out, 'dossier.json')).size} bytes) to ${out}`);
