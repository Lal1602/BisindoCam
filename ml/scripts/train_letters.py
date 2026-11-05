"""Train the static letter classifier and export it for the browser.

    uv run python scripts/train_letters.py

Evaluation is leave-one-dataset-out: each fold trains on all but one source
dataset and tests on the held-out one — different people, cameras and rooms
than anything seen in training. The final model is then refit on everything
and exported to web/public/models/letters.onnx with letters.json.
"""

from __future__ import annotations

import json
import string
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, top_k_accuracy_score
from sklearn.model_selection import GroupKFold
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))

from isyarat.augment import augment  # noqa: E402
from isyarat.features import FEATURE_VERSION, FRAME_FEATURES, SLOTS, frame_features  # noqa: E402

DATA = [ML / "data" / "processed" / f for f in ("letters.npz", "letters_surya.npz")]
MODELS = ML.parent / "web" / "public" / "models"
REPORT = ML / "runs" / "letters_report.json"
LABELS = list(string.ascii_uppercase)
# Augmented copies per sample: many for the small photo sets, few for the
# large landmark set, so no single source dominates training.
TARGET_PER_SOURCE = 12_000
SEED = 7


def featurize(hands: np.ndarray, aspect: float) -> np.ndarray:
    present = {side: hands[slot] for slot, side in enumerate(SLOTS) if not np.isnan(hands[slot, 0, 0])}
    return frame_features(present, aspect)


def build(hands, aspect, y, source, rng):
    counts = {s: int((source == s).sum()) for s in set(source)}
    xs, ys = [], []
    for h, a, label, src in zip(hands, aspect, y, source):
        xs.append(featurize(h, a))
        ys.append(label)
        for _ in range(max(1, round(TARGET_PER_SOURCE / counts[src]) - 1)):
            xs.append(featurize(augment(h, a, rng), a))
            ys.append(label)
    return np.stack(xs), np.array(ys)


def model() -> object:
    return make_pipeline(
        StandardScaler(),
        MLPClassifier(
            hidden_layer_sizes=(256, 128),
            alpha=1e-3,
            batch_size=256,
            learning_rate_init=1e-3,
            max_iter=200,
            early_stopping=True,
            n_iter_no_change=12,
            random_state=SEED,
        ),
    )


def main() -> None:
    parts = [np.load(p) for p in DATA if p.exists()]
    hands = np.concatenate([d["hands"] for d in parts])
    aspect = np.concatenate([d["aspect"] for d in parts])
    label = np.concatenate([d["label"] for d in parts])
    group = np.concatenate([d["source"] for d in parts])
    y = np.array([LABELS.index(l) for l in label])
    rng = np.random.default_rng(SEED)
    print(f"{len(y)} samples from {sorted(set(group))}, feature v{FEATURE_VERSION} ({FRAME_FEATURES} dims)")

    # -- Leave-one-dataset-out evaluation ------------------------------------
    folds = len(set(group))
    per_source = {}
    preds = np.zeros(len(y), int)
    probs = np.zeros((len(y), len(LABELS)))
    for k, (tr, te) in enumerate(GroupKFold(n_splits=folds).split(hands, y, group)):
        x_tr, y_tr = build(hands[tr], aspect[tr], y[tr], group[tr], rng)
        clf = model().fit(x_tr, y_tr)
        x_te = np.stack([featurize(h, a) for h, a in zip(hands[te], aspect[te])])
        p = np.zeros((len(te), len(LABELS)))
        p[:, clf.classes_] = clf.predict_proba(x_te)
        probs[te], preds[te] = p, p.argmax(1)
        held = str(group[te][0])
        per_source[held] = float(accuracy_score(y[te], preds[te]))
        print(f"  fold {k + 1}/{folds}: held-out {held} ({len(te)}) -> acc {per_source[held]:.3f}", flush=True)

    acc = accuracy_score(y, preds)
    top3 = top_k_accuracy_score(y, probs, k=3, labels=range(len(LABELS)))
    per_letter = {L: float((preds[y == i] == i).mean()) if (y == i).any() else None for i, L in enumerate(LABELS)}
    macro = float(np.mean(list(per_source.values())))
    print(f"held-out accuracy {acc:.3f} (mean over datasets {macro:.3f}), top-3 {top3:.3f}")

    # -- Final fit on everything, export --------------------------------------
    x_all, y_all = build(hands, aspect, y, group, rng)
    final = model().fit(x_all, y_all)
    assert list(final.classes_) == list(range(len(LABELS))), "every letter must appear in training data"

    from skl2onnx import to_onnx

    onx = to_onnx(final, x_all[:1].astype(np.float32), options={id(final.steps[-1][1]): {"zipmap": False}}, target_opset=17)
    MODELS.mkdir(parents=True, exist_ok=True)
    (MODELS / "letters.onnx").write_bytes(onx.SerializeToString())
    (MODELS / "letters.json").write_text(
        json.dumps({"featureVersion": FEATURE_VERSION, "inputSize": FRAME_FEATURES, "labels": LABELS}, indent=2)
    )

    # Sanity check: ONNX Runtime must agree with scikit-learn.
    import onnxruntime as ort

    sess = ort.InferenceSession(onx.SerializeToString())
    x_check = x_all[:256].astype(np.float32)
    onnx_probs = sess.run(None, {sess.get_inputs()[0].name: x_check})[1]
    np.testing.assert_allclose(onnx_probs, final.predict_proba(x_check), atol=1e-4)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps(
            {
                "samples": int(len(y)),
                "sources": {s: int((group == s).sum()) for s in sorted(set(group.tolist()))},
                "evaluation": "leave-one-dataset-out",
                "heldOutBySource": per_source,
                "heldOutMeanOverSources": macro,
                "heldOutAccuracy": acc,
                "heldOutTop3": top3,
                "perLetter": per_letter,
                "confusion": confusion_matrix(y, preds, labels=range(len(LABELS))).tolist(),
                "labels": LABELS,
                "onnxBytes": len(onx.SerializeToString()),
            },
            indent=2,
        )
    )
    print(f"exported letters.onnx ({len(onx.SerializeToString()) / 1e3:.0f} KB) and report -> {REPORT}")


if __name__ == "__main__":
    main()
