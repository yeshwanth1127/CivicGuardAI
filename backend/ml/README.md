# Issue photo classifier

Classifies uploaded issue photos into one of four categories — `Pothole`,
`Garbage`, `Streetlight`, `Other` — using transfer learning on top of a
frozen, pretrained MobileNetV2 (ImageNet) feature extractor. Runs entirely in
Node via TensorFlow.js — no Python involved.

## How it works

1. `fetch-dataset.js` downloads ~25 sample images per category from Wikimedia
   Commons into `dataset/<Category>/` and writes `dataset-manifest.json`
   recording exactly what was downloaded and its source (for provenance/
   licensing). The `dataset/` folder itself is gitignored — re-run this
   script after cloning the repo.
2. `train.js` runs each training image through the frozen MobileNetV2 to get
   a fixed-size embedding, then trains a small dense classification head
   (`Dense -> Dropout -> Dense(4, softmax)`) on those embeddings. Only the
   small trained head is saved to `model/` (`model.json` + `weights.bin` +
   `labels.json`) — MobileNetV2's own weights are re-loaded from the
   `@tensorflow-models/mobilenet` package at runtime, not re-saved.
3. `backend/src/utils/classifier.js` loads both pieces once (lazily, on
   first use) and exposes `classifyImage(imagePath)` for the backend to call.

## Regenerating / retraining

```sh
cd backend
npm run ml:fetch-dataset   # downloads a fresh bootstrap dataset (Wikimedia Commons)
npm run ml:fetch-kaggle    # optional: adds larger real datasets for Pothole/Garbage
npm run ml:train           # retrains the head, overwrites model/
```

To improve accuracy, replace/add real labeled issue photos under
`dataset/<Category>/` (any `.jpg`/`.png` files) before running
`npm run ml:train` — no code changes needed.

### Using Kaggle for more/better data

`fetch-kaggle-dataset.js` pulls larger, real-world datasets from Kaggle for
categories where a good one exists — currently `Pothole`
(`atulyakumar98/pothole-detection-dataset`, ~200 images used) and `Garbage`
(`asdasdasasdas/garbage-classification`, ~150 images used). No usable public
dataset exists for `Streetlight` (checked Kaggle, HuggingFace, and Wikimedia
Commons) — it still relies solely on `fetch-dataset.js`.

Requires a Kaggle API token:
1. https://www.kaggle.com/settings → API section → "Create New Token" →
   downloads `kaggle.json`.
2. Save it to `~/.kaggle/kaggle.json` (or set `KAGGLE_JSON_PATH` to point
   elsewhere). Never commit this file — it's outside the repo by default.

## Known limitations

This ships with a **bootstrap dataset of ~60-100 stock/Commons photos across
4 classes**. That's enough to validate the full pipeline end-to-end (upload →
classify → store → display), but it is *not* a production-grade classifier:

- Training accuracy will likely look decent, but real-world generalization
  (different lighting, camera quality, angles vs. curated stock photos) will
  be noticeably weaker.
- There's no "unknown"/"unclear" class — every photo gets assigned one of
  the 4 categories, even if it doesn't clearly depict any of them. Treat a
  low `confidence` score as a signal to not trust the label, rather than
  expecting the model to say "I don't know".
- Swap in a bigger, more representative labeled dataset (ideally real issue
  photos from this app, once you have some) and re-run `npm run ml:train`
  to improve this over time.
