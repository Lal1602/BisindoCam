"""Train the dynamic word classifier and export it for the browser.

    uv run python scripts/train_words.py [--folds 5] [--epochs 30]

Data: ml/data/processed/words/index.csv (scripts/extract_words.py).
Evaluation is signer-independent: fold k holds out one signer from each
dataset, so test clips always come from people the model never saw. The final
model is refit on everyone and exported to web/public/models/words.onnx with
words.json (labels in Indonesian and English).
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))

from isyarat.augment import _rotate  # noqa: E402
from isyarat.glosses import ENGLISH  # noqa: E402
from isyarat.word_features import SEQ_LEN, WORD_FEATURE_VERSION, WORD_FRAME_FEATURES, clip_features  # noqa: E402

WORDS = ML / "data" / "processed" / "words"
CACHE = ML / "data" / "processed" / "word_clips.npz"
MODELS = ML.parent / "web" / "public" / "models"
REPORT = ML / "runs" / "words_report.json"
EVAL = ML / "runs" / "words_eval.json"  # fold results, so --final-only can skip re-evaluation
AUG_COPIES = 6
SEED = 11

# Pose landmarks that swap when the image is mirrored (only the ones we use).
POSE_SWAP = [(11, 12)]


def mirror_clip(hands: np.ndarray, pose: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    h = hands[:, ::-1].copy()
    h[..., 0] = 1.0 - h[..., 0]
    p = pose.copy()
    p[..., 0] = 1.0 - p[..., 0]
    for a, b in POSE_SWAP:
        p[:, [a, b]] = p[:, [b, a]]
    return h, p


def augment_clip(hands, pose, aspect, rng):
    """One set of random parameters for the whole clip, so motion stays coherent."""
    if rng.random() < 0.5:
        hands, pose = mirror_clip(hands, pose)
    roll, yaw, pitch = rng.normal(0, np.radians([8, 12, 8]))
    hands = np.stack([_rotate(h, aspect, roll, yaw, pitch) for h in hands])
    scale = rng.normal(1.0, 0.05, size=3)
    present = ~np.isnan(hands[:, :, 0, 0])
    wrist = hands[:, :, :1]
    hands = np.where(present[..., None, None], (hands - wrist) * scale + wrist, hands)
    shift = rng.normal(0, 0.02, size=2)  # small camera framing changes
    hands[..., :2] += shift
    pose = pose.copy()
    pose[..., :2] += shift
    hands = hands + rng.normal(0, 0.002, size=hands.shape)
    # Temporal: drop up to 15% at either end (signers start and stop at different times).
    n = len(hands)
    a, b = int(rng.uniform(0, 0.15) * n), n - int(rng.uniform(0, 0.15) * n)
    return hands[a:b].astype(np.float32), pose[a:b].astype(np.float32)


def _clip_job(args):
    path, copies, seed = args
    rng = np.random.default_rng(seed)
    with np.load(path) as d:
        hands, pose, aspect = d["hands"], d["pose"], float(d["aspect"])
    base = clip_features(hands, pose, aspect)
    if base is None:
        return None
    out = [base]
    for _ in range(copies):
        f = clip_features(*augment_clip(hands, pose, aspect, rng), aspect)
        out.append(f if f is not None else base)
    return np.stack(out)


def build_cache(rows, workers: int) -> dict:
    if CACHE.exists():
        d = np.load(CACHE, allow_pickle=False)
        if list(d["files"]) == [r["file"] for r in rows]:
            print("using cached clip features")
            return {k: d[k] for k in d.files}
    jobs = [(str(WORDS / r["file"]), AUG_COPIES, SEED + i) for i, r in enumerate(rows)]
    feats, keep = [], []
    with ProcessPoolExecutor(workers) as pool:
        for i, f in enumerate(pool.map(_clip_job, jobs, chunksize=16)):
            if f is not None:
                feats.append(f)
                keep.append(i)
            if i % 500 == 0:
                print(f"  featurised {i}/{len(jobs)}", flush=True)
    data = {
        "files": np.array([rows[i]["file"] for i in keep]),
        "x": np.stack(feats).astype(np.float32),  # (N, 1 + copies, SEQ_LEN, F)
        "gloss": np.array([rows[i]["gloss"] for i in keep]),
        "signer": np.array([rows[i]["signer"] for i in keep]),
    }
    np.savez(CACHE, **data)
    return data


def make_model(n_classes: int, mean: np.ndarray, std: np.ndarray):
    import torch
    from torch import nn

    class WordNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.register_buffer("mean", torch.tensor(mean))
            self.register_buffer("std", torch.tensor(std))
            h = 160
            self.inp = nn.Sequential(nn.Linear(WORD_FRAME_FEATURES * 2, h), nn.GELU(), nn.Dropout(0.2))
            self.conv = nn.Sequential(
                nn.Conv1d(h, h, 5, padding=2), nn.GELU(), nn.Dropout(0.2),
                nn.Conv1d(h, h, 5, padding=2), nn.GELU(),
            )
            self.gru = nn.GRU(h, h // 2, batch_first=True, bidirectional=True)
            self.head = nn.Sequential(nn.Dropout(0.3), nn.Linear(h * 2, n_classes))

        def forward(self, x):  # (B, T, F) -> class probabilities
            x = (x - self.mean) / self.std
            d = torch.cat([torch.zeros_like(x[:, :1]), x[:, 1:] - x[:, :-1]], dim=1)
            z = self.inp(torch.cat([x, d], dim=-1))
            z = z + self.conv(z.transpose(1, 2)).transpose(1, 2)
            z, _ = self.gru(z)
            pooled = torch.cat([z.mean(dim=1), z.amax(dim=1)], dim=-1)
            return torch.softmax(self.head(pooled), dim=-1)

    return WordNet()


def train(x, y, n_classes, epochs, seed):
    """x: (N, 1 + copies, T, F). Each epoch draws one random version per clip."""
    import torch

    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    flat = x.reshape(-1, WORD_FRAME_FEATURES)
    mean = flat.mean(0).astype(np.float32)
    std = (flat.std(0) + 1e-3).astype(np.float32)
    model = make_model(n_classes, mean, std)
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-2)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=epochs * ((len(x) + 127) // 128))
    yt = torch.tensor(y)
    for epoch in range(epochs):
        model.train()
        pick = rng.integers(0, x.shape[1], size=len(x))
        xb_all = torch.tensor(x[np.arange(len(x)), pick])
        order = torch.randperm(len(x))
        total = 0.0
        for i in range(0, len(x), 128):
            idx = order[i : i + 128]
            probs = model(xb_all[idx])
            # Label smoothing by hand on probabilities.
            target = torch.nn.functional.one_hot(yt[idx], n_classes).float() * 0.9 + 0.1 / n_classes
            loss = -(target * torch.log(probs + 1e-8)).sum(-1).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
            sched.step()
            total += float(loss) * len(idx)
        if epoch % 5 == 4 or epoch == epochs - 1:
            print(f"    epoch {epoch + 1}/{epochs} loss {total / len(x):.3f}", flush=True)
    return model


def predict(model, x):
    import torch

    model.eval()
    with torch.no_grad():
        return np.concatenate([model(torch.tensor(x[i : i + 256])).numpy() for i in range(0, len(x), 256)])


def evaluate(x, y, signer, vocab, folds, epochs) -> dict:
    """Train on all but the held-out signers of each fold; score the held-out clips."""
    fold_results = []
    preds = np.full(len(y), -1)
    for k, held in enumerate(folds):
        te = np.isin(signer, list(held))
        tr = ~te
        print(f"  fold {k + 1}/{len(folds)}: held-out signers {sorted(held)} ({te.sum()} clips)", flush=True)
        model = train(x[tr], y[tr], len(vocab), epochs, SEED + k)
        p = predict(model, x[te, 0])
        preds[te] = p.argmax(1)
        acc = float((preds[te] == y[te]).mean())
        top3 = float((np.argsort(-p, 1)[:, :3] == y[te, None]).any(1).mean())
        fold_results.append({"heldOut": sorted(map(str, held)), "clips": int(te.sum()), "accuracy": acc, "top3": top3})
        print(f"    -> acc {acc:.3f}, top-3 {top3:.3f}", flush=True)

    scored = preds >= 0
    per_word = {
        g: float((preds[scored & (y == i)] == i).mean()) if (scored & (y == i)).any() else None for i, g in enumerate(vocab)
    }
    return {
        "clips": int(len(y)),
        "glosses": len(vocab),
        "signers": sorted(set(signer.tolist())),
        "evaluation": "signer-independent folds",
        "folds": fold_results,
        "meanAccuracy": float(np.mean([f["accuracy"] for f in fold_results])),
        "meanTop3": float(np.mean([f["top3"] for f in fold_results])),
        "perWord": per_word,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--min-signers", type=int, default=3, help="keep glosses performed by at least this many signers")
    ap.add_argument("--dry-run", action="store_true", help="evaluate only; do not export or write the report")
    ap.add_argument("--final-only", action="store_true", help="reuse runs/words_eval.json; only train and export the final model")
    args = ap.parse_args()

    import torch

    torch.set_num_threads(max(2, args.workers))
    with open(WORDS / "index.csv", newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if int(r["frames"]) > 0]
    signers_per_gloss = collections.defaultdict(set)
    for r in rows:
        signers_per_gloss[r["gloss"]].add(r["signer"])
    vocab = sorted(g for g, s in signers_per_gloss.items() if len(s) >= args.min_signers)
    rows = [r for r in rows if r["gloss"] in vocab]
    print(f"{len(rows)} clips, {len(vocab)} glosses, {len({r['signer'] for r in rows})} signers", flush=True)

    data = build_cache(rows, args.workers)
    x, gloss, signer = data["x"], data["gloss"], data["signer"]
    y = np.array([vocab.index(g) for g in gloss])

    # -- Signer-independent folds: hold out signer k of every dataset ----------
    by_dataset = collections.defaultdict(list)
    for s in sorted(set(signer)):
        by_dataset[s.rsplit("-s", 1)[0]].append(s)
    folds = []
    for k in range(args.folds):
        held = {ss[k % len(ss)] for ss in by_dataset.values()}
        folds.append(held)

    if args.final_only:
        summary = json.loads(EVAL.read_text(encoding="utf-8"))
        print(f"reusing evaluation: mean {summary['meanAccuracy']:.3f}", flush=True)
    else:
        summary = evaluate(x, y, signer, vocab, folds, args.epochs)
        print(f"mean held-out accuracy {summary['meanAccuracy']:.3f}, top-3 {summary['meanTop3']:.3f}", flush=True)
        if args.dry_run:
            return
        EVAL.parent.mkdir(parents=True, exist_ok=True)
        EVAL.write_text(json.dumps(summary, indent=2, ensure_ascii=False))

    # -- Final model on everyone, export ------------------------------------
    final = train(x, y, len(vocab), args.epochs, SEED + 99)
    final.eval()
    MODELS.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros(1, SEQ_LEN, WORD_FRAME_FEATURES)
    onnx_path = MODELS / "words.onnx"
    torch.onnx.export(final, dummy, onnx_path, input_names=["clip"], output_names=["probabilities"], opset_version=17, dynamo=False)
    (MODELS / "words.json").write_text(
        json.dumps(
            {
                "featureVersion": WORD_FEATURE_VERSION,
                "inputSize": SEQ_LEN * WORD_FRAME_FEATURES,
                "shape": [SEQ_LEN, WORD_FRAME_FEATURES],
                "labels": vocab,
                "english": [ENGLISH.get(g, g) for g in vocab],
            },
            indent=2,
            ensure_ascii=False,
        )
    )

    import onnxruntime as ort

    # The browser runs one clip at a time, and the GRU export has a fixed batch of 1.
    sess = ort.InferenceSession(str(onnx_path))
    check = x[:32, 0]
    onnx_probs = np.concatenate([sess.run(None, {"clip": c[None]})[0] for c in check])
    np.testing.assert_allclose(onnx_probs, predict(final, check), atol=1e-4)
    torch.save(final.state_dict(), ML / "runs" / "words_model.pt")

    summary["onnxKB"] = round(onnx_path.stat().st_size / 1000)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({"summary": summary, "labels": vocab}, indent=2, ensure_ascii=False))
    print(f"exported words.onnx ({summary['onnxKB']} KB) and report -> {REPORT}")


if __name__ == "__main__":
    main()
