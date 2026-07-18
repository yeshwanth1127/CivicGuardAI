"""Standardizes a raw, multi-source dataset into dataset/{train,val,test}/<Category>/,
ready for training/evaluate.py. Collect raw images per category first under
raw_dataset/<Category>/ (see ml-service/README.md for sources per category),
then run this once to dedupe, resize, and split them.

Usage:
    python scripts/prepare_dataset.py --input raw_dataset --output dataset
"""
import argparse
import hashlib
import random
from pathlib import Path

from PIL import Image

TARGET_SIZE = (224, 224)
SPLIT = {"train": 0.7, "val": 0.15, "test": 0.15}
SEED = 42


def image_hash(path):
    with Image.open(path) as img:
        thumb = img.convert("RGB").resize((16, 16))
        return hashlib.md5(thumb.tobytes()).hexdigest()


def collect_deduped(category_dir):
    seen_hashes = set()
    kept = []
    for path in sorted(category_dir.glob("*")):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        try:
            h = image_hash(path)
        except Exception:
            continue
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        kept.append(path)
    return kept


def main(input_dir, output_dir):
    input_dir, output_dir = Path(input_dir), Path(output_dir)
    random.seed(SEED)

    for category_dir in sorted(p for p in input_dir.iterdir() if p.is_dir()):
        category = category_dir.name
        images = collect_deduped(category_dir)
        random.shuffle(images)

        n = len(images)
        n_train = int(n * SPLIT["train"])
        n_val = int(n * SPLIT["val"])
        splits = {
            "train": images[:n_train],
            "val": images[n_train:n_train + n_val],
            "test": images[n_train + n_val:],
        }

        for split_name, split_images in splits.items():
            split_dir = output_dir / split_name / category
            split_dir.mkdir(parents=True, exist_ok=True)
            for src in split_images:
                with Image.open(src) as img:
                    img.convert("RGB").resize(TARGET_SIZE).save(
                        split_dir / f"{src.stem}.jpg", quality=90
                    )

        print(
            f"{category}: {n} images -> "
            f"train={len(splits['train'])} val={len(splits['val'])} test={len(splits['test'])}"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="raw_dataset")
    parser.add_argument("--output", default="dataset")
    args = parser.parse_args()
    main(args.input, args.output)
