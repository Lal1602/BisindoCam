"""Import the pre-extracted landmark letters (Kaggle suryaadji/bisindo-alphabet-
mediapipe-hand-landmarks) into our raw format -> data/processed/letters_surya.npz.

The CSVs hold two hand slots in detection order and no image size, so:
  * aspect is taken as 4:3 — it best matches hand proportions from our own
    extractions (see the estimate in the commit that added this script);
  * the captures are mirrored (selfie view): x is flipped back to a raw camera
    frame, and with two hands the one further left in the *original* image is
    the signer's right; a lone hand goes to the right slot. This convention was
    chosen by scripts/calibrate_surya.py on a 20% calibration slice
    (0.25 -> 0.54 accuracy for a model trained only on our photos).
"""

from __future__ import annotations

import csv
import string
from pathlib import Path

import numpy as np

ML = Path(__file__).resolve().parents[1]
SRC = ML / "data" / "raw" / "bisindo-landmarks-surya" / "Alphabet"
OUT = ML / "data" / "processed" / "letters_surya.npz"
ASPECT = 4 / 3


def main() -> None:
    hands, label, group = [], [], []
    for split in ("train", "val"):
        with open(SRC / f"landmarks_{split}.csv", newline="") as f:
            rows = list(csv.reader(f))[1:]
        for row in rows:
            x = np.array([float(v) for v in row[:-1]], np.float32)
            h = [x[:63].reshape(21, 3), x[63:126].reshape(21, 3)]
            present = [hh for hh in h if np.abs(hh).sum() > 0]
            if not present:
                continue
            out = np.full((2, 21, 3), np.nan, np.float32)
            if len(present) == 2:
                right, left = sorted(present, key=lambda hh: hh[0, 0])
                out[0], out[1] = right, left
            else:
                out[0] = present[0]
            out[..., 0] = 1.0 - out[..., 0]  # un-mirror
            hands.append(out)
            label.append(string.ascii_uppercase[int(row[-1])])
            group.append(split)
    np.savez_compressed(
        OUT,
        hands=np.stack(hands),
        aspect=np.full(len(hands), ASPECT, np.float32),
        label=np.array(label),
        source=np.array(["bisindo-landmarks-surya"] * len(hands)),
        group=np.array(group),
        path=np.array([""] * len(hands)),
    )
    print(f"{len(hands)} samples -> {OUT}")


if __name__ == "__main__":
    main()
