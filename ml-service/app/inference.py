"""Loads the winning model selected by training/compare.py and classifies
issue photos. Mirrors the {category, confidence, scores} contract that
backend/src/utils/classifier.js used to produce locally via tfjs-node, so
the Node backend's response handling didn't need to change."""
import io
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
WINNING_MODEL_DIR = ARTIFACTS_DIR / "winning_model"
# Must match training/evaluate.py IMAGE_SIZE — the served model was trained on
# images this size, so inputs must be resized to the same dimensions.
IMAGE_SIZE = (160, 160)

PREPROCESSORS = {
    "rescale": lambda x: x / 255.0,
    "vgg16": tf.keras.applications.vgg16.preprocess_input,
    "vgg19": tf.keras.applications.vgg19.preprocess_input,
    "inception": tf.keras.applications.inception_v3.preprocess_input,
    "mobilenet": tf.keras.applications.mobilenet_v2.preprocess_input,
}

_model = None
_labels = None
_preprocess_fn = None


def _load():
    global _model, _labels, _preprocess_fn
    if _model is None:
        model_path = WINNING_MODEL_DIR / "model.keras"
        if not model_path.exists():
            raise RuntimeError(
                f"No trained model found at {model_path}. "
                "Run training/compare.py (see the Colab notebook) and copy its "
                "artifacts/ output here first."
            )
        _model = tf.keras.models.load_model(model_path)
        _labels = json.loads((WINNING_MODEL_DIR / "labels.json").read_text())
        metadata = json.loads((WINNING_MODEL_DIR / "metrics.json").read_text())
        _preprocess_fn = PREPROCESSORS[metadata["preprocessing"]]
    return _model, _labels, _preprocess_fn


def classify_image(image_bytes):
    model, labels, preprocess_fn = _load()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMAGE_SIZE)
    array = np.expand_dims(np.array(image, dtype=np.float32), axis=0)
    array = preprocess_fn(array)

    scores = model.predict(array, verbose=0)[0]
    best_index = int(np.argmax(scores))

    return {
        "category": labels[best_index],
        "confidence": float(scores[best_index]),
        "scores": {label: float(score) for label, score in zip(labels, scores)},
    }
