"""Export one representative example per sign for the 3D dictionary.

    uv run python scripts/export_signs.py

Letters: the image whose features sit closest to its class's median (the most
"typical" rendition) -> web/public/signs/letters.json.
Words: likewise per gloss over clip features, keeping that clip's landmark
sequence (at most MAX_FRAMES frames) -> web/public/signs/words.json.
Landmarks are rounded; an absent hand is null.
"""

from __future__ import annotations

import json
import string
import sys
from pathlib import Path

import numpy as np

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))

from isyarat.features import SLOTS, frame_features  # noqa: E402
from isyarat.glosses import ENGLISH  # noqa: E402
from isyarat.word_features import clip_features  # noqa: E402

MAX_FRAMES = 20

OUT = ML.parent / "web" / "public" / "signs"


def hand_json(hand: np.ndarray, decimals: int = 4):
    return None if np.isnan(hand[0, 0]) else np.round(hand, decimals).tolist()


def letters() -> None:
    d = np.load(ML / "data" / "processed" / "letters.npz")
    hands, aspect, label = d["hands"], d["aspect"], d["label"]
    feats = np.stack([
        frame_features({s: h[i] for i, s in enumerate(SLOTS) if not np.isnan(h[i, 0, 0])}, a)
        for h, a in zip(hands, aspect)
    ])
    out = {}
    for letter in string.ascii_uppercase:
        idx = np.flatnonzero(label == letter)
        if not len(idx):
            continue
        median = np.median(feats[idx], axis=0)
        best = idx[np.argmin(np.linalg.norm(feats[idx] - median, axis=1))]
        out[letter] = {"aspect": float(aspect[best]), "hands": [hand_json(h) for h in hands[best]]}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "letters.json").write_text(json.dumps({"version": 1, "slots": list(SLOTS), "signs": out}, separators=(",", ":")))
    print(f"letters.json: {len(out)} letters, {(OUT / 'letters.json').stat().st_size / 1e3:.0f} KB")


def words() -> None:
    import csv

    root = ML / "data" / "processed" / "words"
    vocab_file = ML.parent / "web" / "public" / "models" / "words.json"
    vocab = json.loads(vocab_file.read_text(encoding="utf-8"))["labels"] if vocab_file.exists() else None
    with open(root / "index.csv", newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if int(r["frames"]) > 0 and (vocab is None or r["gloss"] in vocab)]
    by_gloss: dict[str, list] = {}
    for r in rows:
        by_gloss.setdefault(r["gloss"], []).append(r)

    out = {}
    for gloss, items in sorted(by_gloss.items()):
        feats, clips = [], []
        for r in items[:60]:  # plenty to find a typical example
            with np.load(root / r["file"]) as d:
                f = clip_features(d["hands"], d["pose"], float(d["aspect"]))
                if f is None:
                    continue
                feats.append(f.reshape(-1))
                clips.append((d["hands"], float(d["aspect"]), float(d["fps"])))
        if not feats:
            continue
        feats = np.stack(feats)
        best = int(np.argmin(np.linalg.norm(feats - np.median(feats, axis=0), axis=1)))
        hands, aspect, fps = clips[best]
        seen = np.flatnonzero(~np.isnan(hands[:, :, 0, 0]).all(axis=1))
        hands = hands[seen[0] : seen[-1] + 1]
        step = max(1, int(np.ceil(len(hands) / MAX_FRAMES)))
        hands = hands[::step]
        out[gloss] = {
            "aspect": aspect,
            "fps": fps / step,
            "en": ENGLISH.get(gloss, gloss),
            "frames": [[hand_json(h, 3) for h in frame] for frame in hands],
        }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "words.json").write_text(json.dumps({"version": 1, "slots": list(SLOTS), "signs": out}, separators=(",", ":")))
    print(f"words.json: {len(out)} words, {(OUT / 'words.json').stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    which = sys.argv[1:] or ["letters", "words"]
    if "letters" in which:
        letters()
    if "words" in which:
        words()
