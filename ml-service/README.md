# CivicGuard AI — ML Service

Classifies civic-issue photos into one of 7 categories (`Pothole`, `Garbage`,
`Streetlight`, `Sidewalk`, `Flooding`, `Road Sign`, `Other`) and hosts the
methodology/results comparing a custom-designed CNN against five canonical
architectures fine-tuned via transfer learning.

This replaces the previous in-process `tfjs-node`/MobileNet classifier that
lived in `backend/src/utils/classifier.js` — that classifier now makes an
HTTP call to this service instead. The old bootstrap dataset and training
scripts (`backend/ml/`) are left in place as a legacy reference; a handful of
those images are a reasonable starting point to seed `raw_dataset/` below.

## Architecture

```
ml-service/
  app/                    # FastAPI microservice (live inference)
    main.py                 # POST /classify, GET /models/comparison, GET /health
    inference.py             # loads the winning model, runs a prediction
  training/                # offline training/comparison pipeline (run on Colab)
    models/                   # one module per architecture — see below
    evaluate.py                # shared harness: splits, augmentation, metrics
    train.py                    # trains + evaluates a single architecture
    compare.py                   # runs all 6, picks the winner, writes artifacts/
    colab_notebook.ipynb          # runs the above on a Colab GPU
  scripts/
    prepare_dataset.py       # raw_dataset/<Category>/ -> dataset/{train,val,test}/<Category>/
  dataset_manifest.json    # provenance/source tracking per category
  artifacts/                # generated — gitignored, populated by compare.py
    comparison_results.json
    confusion_matrices/*.png
    training_curves/*.png
    winning_model/          # copied here by compare.py, loaded by app/inference.py
  requirements.txt
```

## The 6 architectures being compared

| Architecture | Training | Why |
|---|---|---|
| **Custom CNN** | From scratch | Our own architecture, designed for this dataset |
| **AlexNet** | From scratch | Classic architecture; no pretrained weights exist for it |
| **VGG16** | ImageNet-pretrained, fine-tuned | Standard deep CNN baseline |
| **VGG19** | ImageNet-pretrained, fine-tuned | Deeper VGG variant |
| **InceptionV3** | ImageNet-pretrained, fine-tuned | Multi-scale conv baseline |
| **MobileNetV2** | ImageNet-pretrained, fine-tuned | Matches the original wrapper-only baseline this project started from |

Training VGG16/19/InceptionV3/MobileNetV2 from random initialization on a
dataset this size would badly overfit and need far more compute — fine-tuning
pretrained weights is standard practice and isolates the custom CNN (trained
from scratch) as the real point of comparison. All 6 go through the exact
same harness in `training/evaluate.py` — same image size (224×224), splits,
augmentation, batch size, and metrics — so the comparison is fair.

## 1. Build the dataset

Collect raw images per category under `raw_dataset/<Category>/`:

- **Pothole**: Kaggle `atulyakumar98/pothole-detection-dataset`, RDD2022 (Road Damage Detection 2022)
- **Garbage**: Kaggle `asdasdasasdas/garbage-classification`, TACO (street-litter subset)
- **Streetlight**: no strong public dataset exists — plan on manual/scraped collection (Roboflow Universe, your own photos). This is the highest-risk category for volume; if you can't reach a usable count, note the limitation in your report rather than padding with unrelated images.
- **Sidewalk**: RDD2022 crack imagery, Kaggle concrete-crack datasets
- **Flooding**: Kaggle street-level flooding/waterlogging datasets
- **Road Sign**: Roboflow Universe / Mapillary traffic-sign datasets, curated down to damaged/broken examples
- **Other**: general street scenes with none of the above issues

Target ≥300–500 usable images per category. Then standardize, dedupe, and
split 70/15/15:

```sh
cd ml-service
python -m venv venv && source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python scripts/prepare_dataset.py --input raw_dataset --output dataset
```

Update `dataset_manifest.json` with actual source/count/license details as
you go — this is what the final-year report's methodology section draws on.

## 2. Train and compare (Colab)

Open `training/colab_notebook.ipynb` in Google Colab (GPU runtime), upload
your zipped `dataset/` to Drive, and run it end to end. It:

1. Sanity-checks the harness with `compare.py --smoke-test` (1 epoch, tiny subset)
2. Runs the full comparison: `compare.py --all --epochs 25 --fine-tune-epochs 10`
3. Downloads `artifacts/` (checkpointed after each architecture, so a session
   timeout doesn't lose completed runs)

Locally, the same commands work directly (slower without a GPU):

```sh
python training/compare.py --smoke-test
python training/compare.py --all
```

`artifacts/comparison_results.json` ends up with, per architecture: accuracy,
precision/recall/F1 (macro + weighted + per-class), confusion matrix,
parameter count, model size, training time, inference latency, and full
per-epoch training history — plus a `winner` key (highest macro F1).

## 3. Serve it

```sh
cd ml-service
uvicorn app.main:app --reload --port 8000
```

- `GET /health` — liveness check
- `POST /classify` — multipart `image` file → `{category, confidence, scores}`
- `GET /models/comparison` — the full comparison report, consumed by the
  admin UI's **Model Comparison** page (`admin/src/pages/ModelComparison.jsx`)

Point the Node backend at it via `ML_SERVICE_URL` (see `backend/.env.example`)
and the admin UI via `VITE_ML_SERVICE_URL`.

## Results

_Fill in after running the full comparison — see
`artifacts/comparison_results.json` and the admin Model Comparison page for
the live version._

| Architecture | Accuracy | Precision | Recall | F1 (macro) | Params | Size | Inference |
|---|---|---|---|---|---|---|---|
| Custom CNN | | | | | | | |
| AlexNet | | | | | | | |
| VGG16 | | | | | | | |
| VGG19 | | | | | | | |
| InceptionV3 | | | | | | | |
| MobileNetV2 | | | | | | | |

**Discussion** (accuracy vs. latency vs. model size trade-offs, why the
winning architecture was chosen for production): _fill in once trained_.
