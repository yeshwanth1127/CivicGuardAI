// Downloads a small bootstrap image dataset for the issue-photo classifier
// from Wikimedia Commons (public domain / freely-licensed media) and writes
// a manifest recording exactly what was downloaded and where from.
//
// Wikimedia rate-limits bulk/automated image requests fairly aggressively
// (observed: a handful of requests before a 429 with a 5-10 minute
// Retry-After). Rather than retry-storming into a longer punitive cooldown,
// this script downloads as many images as fit in one "burst", then aborts
// cleanly and reports how long to wait. It's safe to just re-run it — it
// resumes from what's already on disk instead of starting over.
//
// Re-run as needed: `npm run ml:fetch-dataset`

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const DATASET_DIR = path.join(__dirname, 'dataset');
const MANIFEST_PATH = path.join(__dirname, 'dataset-manifest.json');
const IMAGES_PER_CATEGORY = 12;
const THUMB_WIDTH = 400;
const USER_AGENT = 'CivicFixDatasetBootstrap/1.0 (educational project; contact via repo)';

// Search queries used to source each category's bootstrap images. Multiple
// queries per category are tried in order until enough images are found.
const CATEGORY_QUERIES = {
  Pothole: ['pothole road damage', 'pothole street'],
  Garbage: ['illegal dumping street', 'garbage pile street', 'litter street'],
  Streetlight: ['broken street light', 'street lamp pole', 'streetlight'],
  Other: ['graffiti wall street', 'damaged sidewalk pavement', 'broken park bench'],
};

class RateLimitedError extends Error {
  constructor(retryAfterSeconds) {
    super(`Rate limited by Wikimedia (retry after ${retryAfterSeconds}s)`);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function searchCommons(query, limit) {
  const url =
    'https://commons.wikimedia.org/w/api.php' +
    `?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|mime&iiurlwidth=${THUMB_WIDTH}&format=json`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429) {
    throw new RateLimitedError(Number(res.headers.get('retry-after')) || 300);
  }
  if (!res.ok) {
    throw new Error(`Commons search failed (${res.status}) for "${query}"`);
  }
  const data = await res.json();
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];

  // Use the throttled thumbnail endpoint (per Wikimedia's own guidance in
  // its 429 response body) rather than full-size originals — smaller/
  // cheaper requests, and we resize locally for training anyway.
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter((info) => info && /^image\/(jpeg|png)$/.test(info.mime))
    .map((info) => ({
      url: info.thumburl || info.url,
      descriptionUrl: info.descriptionurl,
    }));
}

async function collectCandidates(queries, limit, alreadyKnownUrls) {
  const seen = new Set();
  const results = [];

  for (const query of queries) {
    if (results.length >= limit) break;
    const found = await searchCommons(query, limit);
    for (const item of found) {
      if (results.length >= limit) break;
      if (seen.has(item.url) || alreadyKnownUrls.has(item.url)) continue;
      seen.add(item.url);
      results.push({ ...item, query });
    }
  }

  return results;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DOWNLOAD_DELAY_MS = 1500;

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429) {
    throw new RateLimitedError(Number(res.headers.get('retry-after')) || 300);
  }
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  await pipeline(res.body, fs.createWriteStream(destPath));
}

function loadExistingManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function countExistingImages(categoryDir) {
  if (!fs.existsSync(categoryDir)) return 0;
  return fs.readdirSync(categoryDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).length;
}

// Fetches one category up to IMAGES_PER_CATEGORY, resuming from whatever is
// already on disk. Returns { newEntries, done } — done=false means a rate
// limit was hit and the whole run should stop here.
async function fetchCategory(category, queries, manifest) {
  const categoryDir = path.join(DATASET_DIR, category);
  fs.mkdirSync(categoryDir, { recursive: true });

  let count = countExistingImages(categoryDir);
  if (count >= IMAGES_PER_CATEGORY) {
    console.log(`\n📥 "${category}": already have ${count} image(s), skipping.`);
    return { newEntries: [], done: true };
  }

  console.log(`\n📥 Fetching "${category}" images (have ${count}/${IMAGES_PER_CATEGORY})...`);
  const alreadyKnownUrls = new Set(
    manifest.filter((m) => m.category === category).map((m) => m.url)
  );

  let candidates;
  try {
    candidates = await collectCandidates(
      queries,
      IMAGES_PER_CATEGORY - count,
      alreadyKnownUrls
    );
  } catch (err) {
    if (err instanceof RateLimitedError) {
      console.warn(`   ⏳ Rate limited while searching. Retry after ~${err.retryAfterSeconds}s.`);
      return { newEntries: [], done: false, retryAfterSeconds: err.retryAfterSeconds };
    }
    throw err;
  }

  const newEntries = [];

  for (const candidate of candidates) {
    if (count >= IMAGES_PER_CATEGORY) break;

    const ext = path.extname(new URL(candidate.url).pathname) || '.jpg';
    const filename = sanitizeFilename(`${category}-${count + 1}${ext}`);
    const destPath = path.join(categoryDir, filename);

    try {
      await downloadImage(candidate.url, destPath);
      count += 1;
      newEntries.push({
        category,
        filename,
        url: candidate.url,
        sourceNote: `Wikimedia Commons search "${candidate.query}" — ${candidate.descriptionUrl}`,
      });
      console.log(`   ✓ ${filename}`);
      await delay(DOWNLOAD_DELAY_MS);
    } catch (err) {
      if (err instanceof RateLimitedError) {
        console.warn(`   ⏳ Rate limited. Retry after ~${err.retryAfterSeconds}s.`);
        return { newEntries, done: false, retryAfterSeconds: err.retryAfterSeconds };
      }
      console.warn(`   ✗ Skipped (${err.message})`);
    }
  }

  console.log(`   ${count} image(s) total for "${category}"`);
  return { newEntries, done: count >= IMAGES_PER_CATEGORY };
}

async function main() {
  const manifest = loadExistingManifest();
  let stoppedEarly = false;

  for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
    const { newEntries, done, retryAfterSeconds } = await fetchCategory(
      category,
      queries,
      manifest
    );
    manifest.push(...newEntries);
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    if (!done) {
      stoppedEarly = true;
      const waitMin = Math.ceil((retryAfterSeconds || 300) / 60);
      console.warn(
        `\n⚠️  Stopped early to respect Wikimedia's rate limit. ` +
          `Wait ~${waitMin} minute(s), then re-run "npm run ml:fetch-dataset" — ` +
          'it will resume from where it left off.'
      );
      break;
    }
  }

  console.log(`\n✅ Manifest written to ${MANIFEST_PATH} (${manifest.length} image(s) total)`);
  console.log(
    '   Downloaded images live in backend/ml/dataset/ and are gitignored — re-run this script after cloning.'
  );

  if (stoppedEarly) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('❌ Dataset fetch failed:', err.message);
  process.exit(1);
});
