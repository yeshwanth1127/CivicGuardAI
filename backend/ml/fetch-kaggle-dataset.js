// Downloads larger, real-world labeled datasets from Kaggle to supplement
// the Wikimedia bootstrap set (see fetch-dataset.js). Kaggle has no dataset
// matching our exact 4-class taxonomy, but has good dedicated datasets for
// Pothole and Garbage individually — nothing usable exists for Streetlight,
// so that category still relies on fetch-dataset.js alone.
//
// Shells out to the official Kaggle CLI (`pip install kaggle`) rather than
// calling Kaggle's HTTP API directly — Kaggle's newer bearer-token auth
// (from Settings -> API -> "Create New Token") isn't accepted by the
// classic REST download endpoint, but the official CLI handles it
// correctly (reads ~/.kaggle/kaggle.json, ~/.kaggle/access_token, or the
// KAGGLE_API_TOKEN env var automatically).
//
// Usage: `npm run ml:fetch-kaggle`

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATASET_DIR = path.join(__dirname, 'dataset');
const STAGING_DIR = path.join(__dirname, '.kaggle-staging');
const MANIFEST_PATH = path.join(__dirname, 'dataset-manifest.json');

// Verified via Kaggle's public search API to have real, well-used image
// data (kaggle.com/datasets/<ref>). Adjust maxImages to pull more/less.
const KAGGLE_SOURCES = [
  { ref: 'atulyakumar98/pothole-detection-dataset', category: 'Pothole', maxImages: 150 },
  { ref: 'asdasdasasdas/garbage-classification', category: 'Garbage', maxImages: 150 },
];

function checkKaggleCliAvailable() {
  try {
    execFileSync('python', ['-m', 'kaggle', '--version'], { stdio: 'pipe' });
  } catch {
    throw new Error(
      'Kaggle CLI not available. Install it with "python -m pip install kaggle" and ' +
        'make sure your API token is saved at ~/.kaggle/kaggle.json or ~/.kaggle/access_token.'
    );
  }
}

function downloadAndExtract(ref, extractDir) {
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  execFileSync(
    'python',
    ['-m', 'kaggle', 'datasets', 'download', '-d', ref, '-p', extractDir, '--unzip'],
    { stdio: 'inherit' }
  );
}

function findImageFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findImageFiles(fullPath, results);
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function countExistingImages(categoryDir) {
  if (!fs.existsSync(categoryDir)) return 0;
  return fs.readdirSync(categoryDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).length;
}

function loadExistingManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function fetchSource({ ref, category, maxImages }, manifest) {
  console.log(`\n📦 Fetching Kaggle dataset "${ref}" -> ${category}...`);

  fs.mkdirSync(STAGING_DIR, { recursive: true });
  const extractDir = path.join(STAGING_DIR, category);

  downloadAndExtract(ref, extractDir);
  console.log('   ✓ Downloaded and extracted');

  const categoryDir = path.join(DATASET_DIR, category);
  fs.mkdirSync(categoryDir, { recursive: true });
  const startCount = countExistingImages(categoryDir);

  const allImages = findImageFiles(extractDir);
  console.log(`   Found ${allImages.length} image file(s) in dataset, using up to ${maxImages}`);

  const newEntries = [];
  for (const srcPath of allImages) {
    if (newEntries.length >= maxImages) break;
    const n = startCount + newEntries.length + 1;
    const filename = `${category}-kaggle-${n}${path.extname(srcPath).toLowerCase()}`;
    fs.copyFileSync(srcPath, path.join(categoryDir, filename));
    newEntries.push({
      category,
      filename,
      url: `https://www.kaggle.com/datasets/${ref}`,
      sourceNote: `Kaggle dataset "${ref}"`,
    });
  }

  fs.rmSync(extractDir, { recursive: true, force: true });

  console.log(
    `   ✓ Added ${newEntries.length} image(s) to ${category} (${startCount + newEntries.length} total now)`
  );
  manifest.push(...newEntries);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function main() {
  checkKaggleCliAvailable();
  const manifest = loadExistingManifest();

  for (const source of KAGGLE_SOURCES) {
    fetchSource(source, manifest);
  }

  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  console.log(
    '\n✅ Done. Streetlight and Other still rely solely on fetch-dataset.js ' +
      '(no usable Kaggle dataset exists for Streetlight). Run "npm run ml:train" to retrain.'
  );
}

try {
  main();
} catch (err) {
  console.error('❌ Kaggle dataset fetch failed:', err.message);
  process.exit(1);
}
