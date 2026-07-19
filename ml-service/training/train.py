"""Train and evaluate a single architecture through the shared harness.

Usage:
    python train.py --arch custom_cnn --dataset-dir dataset --output artifacts/runs/custom_cnn
    python train.py --arch vgg16 --dataset-dir dataset --output artifacts/runs/vgg16 --smoke-test
"""
import argparse
import importlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from evaluate import (  # noqa: E402
    IMAGE_SIZE,
    evaluate_model,
    load_datasets,
    measure_inference_latency_ms,
    measure_model_size_mb,
    train_model,
)

ARCHITECTURES = ["custom_cnn", "alexnet", "vgg16", "vgg19", "inception", "mobilenet"]


def run(arch, dataset_dir, output_dir, epochs=25, fine_tune_epochs=10, smoke_test=False):
    module = importlib.import_module(f"models.{arch}")
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_ds, val_ds, test_ds, class_names = load_datasets(dataset_dir, module.PREPROCESSING)
    model, base_model = module.build_model(len(class_names), input_shape=(*IMAGE_SIZE, 3))

    if smoke_test:
        train_ds, val_ds, test_ds = train_ds.take(2), val_ds.take(1), test_ds.take(1)
        epochs, fine_tune_epochs = 1, 0

    model, history, train_time_seconds = train_model(
        model, base_model, train_ds, val_ds, module.FROM_SCRATCH,
        epochs=epochs, fine_tune_epochs=fine_tune_epochs,
    )

    metrics = evaluate_model(model, test_ds, class_names)
    metrics["train_time_seconds"] = train_time_seconds
    metrics["inference_latency_ms"] = measure_inference_latency_ms(model, test_ds)
    metrics["param_count"] = model.count_params()
    metrics["architecture"] = module.NAME
    metrics["from_scratch"] = module.FROM_SCRATCH
    metrics["preprocessing"] = module.PREPROCESSING
    metrics["history"] = {k: [float(v) for v in vals] for k, vals in history.history.items()}

    model_path = output_dir / "model.keras"
    model.save(model_path)
    metrics["model_size_mb"] = measure_model_size_mb(model_path)

    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (output_dir / "labels.json").write_text(json.dumps(class_names, indent=2))

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--arch", required=True, choices=ARCHITECTURES)
    parser.add_argument("--dataset-dir", default="dataset")
    parser.add_argument("--output", required=True)
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--fine-tune-epochs", type=int, default=10)
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()

    result = run(args.arch, args.dataset_dir, args.output,
                 epochs=args.epochs, fine_tune_epochs=args.fine_tune_epochs,
                 smoke_test=args.smoke_test)
    print(json.dumps({k: v for k, v in result.items() if k != "history"}, indent=2))
