"""Which capture convention does the landmark-only letter dataset use?

Its CSVs carry no handedness or image orientation. Train a quick model on our
own photo datasets, then score a calibration slice (20%) of the landmark set
under each convention (mirror x or not × which slot is the signer's right).
The winner is used by import_surya.py; the other 80% stays untouched for the
held-out evaluation.
"""

from __future__ import annotations

import string
import sys
from pathlib import Path

import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))

from isyarat.augment import augment  # noqa: E402
from isyarat.features import SLOTS, frame_features  # noqa: E402

L = list(string.ascii_uppercase)


def feat(h, a):
    return frame_features({s: h[i] for i, s in enumerate(SLOTS) if not np.isnan(h[i, 0, 0])}, a)


photos = np.load(ML / "data/processed/letters.npz")
surya = np.load(ML / "data/processed/letters_surya.npz")
rng = np.random.default_rng(0)
X, y = [], []
for h, a, l in zip(photos["hands"], photos["aspect"], photos["label"]):
    for _ in range(12):
        X.append(feat(augment(h, a, rng), a))
        y.append(L.index(l))
clf = make_pipeline(StandardScaler(), MLPClassifier((256, 128), max_iter=120, early_stopping=True, random_state=0)).fit(np.stack(X), y)

idx = np.random.default_rng(1).permutation(len(surya["label"]))[: len(surya["label"]) // 5]
for flip in (False, True):
    for swap in (False, True):
        hits = 0
        for i in idx:
            h = surya["hands"][i].copy()
            if flip:
                h[..., 0] = 1 - h[..., 0]
            two = not np.isnan(h[1, 0, 0])
            if two and (h[0, 0, 0] > h[1, 0, 0]):  # restore "left-most = signer's right" after a flip
                h = h[::-1].copy()
            if swap and two:
                h = h[::-1].copy()
            hits += clf.predict(feat(h, 4 / 3)[None])[0] == L.index(surya["label"][i])
        print(f"mirror_x={flip!s:5} swap_slots={swap!s:5} -> {hits / len(idx):.3f}")
