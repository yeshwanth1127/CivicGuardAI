"""Shared training/evaluation harness. Every architecture in models/ goes
through this same code path — identical splits, augmentation, batch size,
callbacks, and metrics — so the numbers in compare.py are a fair comparison
rather than an artifact of different training setups."""
import time
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42

AUGMENTATION = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.08),
    tf.keras.layers.RandomZoom(0.1),
    tf.keras.layers.RandomBrightness(0.1),
])

PREPROCESSORS = {
    "rescale": lambda x: x,
    "vgg16": tf.keras.applications.vgg16.preprocess_input,
    "vgg19": tf.keras.applications.vgg19.preprocess_input,
    "inception": tf.keras.applications.inception_v3.preprocess_input,
    "mobilenet": tf.keras.applications.mobilenet_v2.preprocess_input,
}


def load_datasets(dataset_dir, preprocessing, batch_size=BATCH_SIZE, augment_train=True):
    dataset_dir = Path(dataset_dir)
    preprocess_fn = PREPROCESSORS[preprocessing]

    def _load(split, shuffle):
        return tf.keras.utils.image_dataset_from_directory(
            dataset_dir / split,
            image_size=IMAGE_SIZE,
            batch_size=batch_size,
            shuffle=shuffle,
            seed=SEED,
        )

    train_ds = _load("train", shuffle=True)
    class_names = train_ds.class_names
    val_ds = _load("val", shuffle=False)
    test_ds = _load("test", shuffle=False)

    def _prep(ds, augment):
        if augment:
            ds = ds.map(lambda x, y: (AUGMENTATION(x, training=True), y))
        ds = ds.map(lambda x, y: (preprocess_fn(x), y))
        return ds.prefetch(tf.data.AUTOTUNE)

    return _prep(train_ds, augment_train), _prep(val_ds, False), _prep(test_ds, False), class_names


def train_model(model, base_model, train_ds, val_ds, from_scratch,
                 epochs=25, fine_tune_epochs=10, fine_tune_layers=30):
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3),
    ]

    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                  loss="sparse_categorical_crossentropy", metrics=["accuracy"])

    start = time.time()
    history = model.fit(train_ds, validation_data=val_ds, epochs=epochs, callbacks=callbacks)

    if not from_scratch and base_model is not None and fine_tune_epochs > 0:
        base_model.trainable = True
        for layer in base_model.layers[:-fine_tune_layers]:
            layer.trainable = False
        model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),
                       loss="sparse_categorical_crossentropy", metrics=["accuracy"])
        fine_history = model.fit(train_ds, validation_data=val_ds,
                                  epochs=fine_tune_epochs, callbacks=callbacks)
        for key in history.history:
            history.history[key].extend(fine_history.history[key])

    train_time_seconds = time.time() - start
    return model, history, train_time_seconds


def evaluate_model(model, test_ds, class_names):
    y_true, y_pred = [], []
    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_pred.extend(np.argmax(preds, axis=1).tolist())
        y_true.extend(labels.numpy().tolist())

    report = classification_report(y_true, y_pred, target_names=class_names,
                                    labels=list(range(len(class_names))),
                                    output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names)))).tolist()

    return {
        "accuracy": report["accuracy"],
        "precision_macro": report["macro avg"]["precision"],
        "recall_macro": report["macro avg"]["recall"],
        "f1_macro": report["macro avg"]["f1-score"],
        "precision_weighted": report["weighted avg"]["precision"],
        "recall_weighted": report["weighted avg"]["recall"],
        "f1_weighted": report["weighted avg"]["f1-score"],
        "per_class": {name: report[name] for name in class_names},
        "confusion_matrix": cm,
        "class_names": class_names,
    }


def measure_inference_latency_ms(model, test_ds, n_batches=10):
    times = []
    for images, _ in test_ds.take(n_batches):
        start = time.perf_counter()
        model.predict(images, verbose=0)
        elapsed = time.perf_counter() - start
        times.append(elapsed / images.shape[0])
    return float(np.mean(times) * 1000) if times else None


def measure_model_size_mb(model_path):
    model_path = Path(model_path)
    if model_path.is_dir():
        total = sum(f.stat().st_size for f in model_path.rglob("*") if f.is_file())
    else:
        total = model_path.stat().st_size
    return total / (1024 * 1024)
