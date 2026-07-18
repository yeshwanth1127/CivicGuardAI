"""Trains and evaluates all 6 architectures (custom_cnn, alexnet, vgg16,
vgg19, inception, mobilenet) through the identical harness in evaluate.py,
then writes a consolidated comparison report to artifacts/comparison_results.json
plus confusion-matrix and training-curve plots. The winning model (highest
macro F1 on the held-out test set) is copied to artifacts/winning_model/ for
app/inference.py to serve.

Usage:
    python compare.py --all
    python compare.py --smoke-test   # 1 epoch/model on a 2-batch subset, sanity-checks the harness
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

sys.path.insert(0, str(Path(__file__).resolve().parent))

from train import ARCHITECTURES, run  # noqa: E402

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"


def plot_confusion_matrix(cm, class_names, out_path):
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=class_names, yticklabels=class_names)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig(out_path)
    plt.close()


def plot_training_curves(history, out_path):
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    axes[0].plot(history["accuracy"], label="train")
    axes[0].plot(history["val_accuracy"], label="val")
    axes[0].set_title("Accuracy")
    axes[0].legend()
    axes[1].plot(history["loss"], label="train")
    axes[1].plot(history["val_loss"], label="val")
    axes[1].set_title("Loss")
    axes[1].legend()
    plt.tight_layout()
    plt.savefig(out_path)
    plt.close()


def write_results(results, winner):
    payload = dict(results)
    payload["winner"] = winner
    (ARTIFACTS_DIR / "comparison_results.json").write_text(json.dumps(payload, indent=2))


def main(dataset_dir, epochs, fine_tune_epochs, smoke_test):
    ARTIFACTS_DIR.mkdir(exist_ok=True)
    (ARTIFACTS_DIR / "confusion_matrices").mkdir(exist_ok=True)
    (ARTIFACTS_DIR / "training_curves").mkdir(exist_ok=True)

    results = {}
    for arch in ARCHITECTURES:
        print(f"\n=== Training {arch} ===")
        output_dir = ARTIFACTS_DIR / "runs" / arch
        metrics = run(arch, dataset_dir, output_dir, epochs=epochs,
                       fine_tune_epochs=fine_tune_epochs, smoke_test=smoke_test)
        results[arch] = metrics

        plot_confusion_matrix(metrics["confusion_matrix"], metrics["class_names"],
                               ARTIFACTS_DIR / "confusion_matrices" / f"{arch}.png")
        plot_training_curves(metrics["history"],
                              ARTIFACTS_DIR / "training_curves" / f"{arch}.png")

        write_results(results, winner=None)

    winner = max(results, key=lambda a: results[a]["f1_macro"])
    print(f"\nWinning architecture: {winner} (f1_macro={results[winner]['f1_macro']:.4f})")

    winning_dir = ARTIFACTS_DIR / "winning_model"
    if winning_dir.exists():
        shutil.rmtree(winning_dir)
    shutil.copytree(ARTIFACTS_DIR / "runs" / winner, winning_dir)

    write_results(results, winner=winner)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--dataset-dir", default="dataset")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--fine-tune-epochs", type=int, default=10)
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()

    if not args.all and not args.smoke_test:
        parser.error("Pass --all to run the full comparison, or --smoke-test for a quick sanity run.")

    main(args.dataset_dir, args.epochs, args.fine_tune_epochs, args.smoke_test)
