"""Frame features — Python twin of web/lib/vision/features.ts.

Keep both files in lockstep; tests/test_features.py checks them against the
fixtures that the web test suite writes.

A hand is a (21, 3) array of MediaPipe normalised landmarks (x, y in [0, 1],
z wrist-relative). Per frame, for slots [Right, Left] (the signer's own hands):
  63 values  landmarks minus wrist, x and z scaled by aspect, / palm size
   1 value   presence flag
then 3 values: (right wrist - left wrist) x, y / mean palm, log(right / left palm).
"""

from __future__ import annotations

import numpy as np

FEATURE_VERSION = 1
HAND_FEATURES = 64
FRAME_FEATURES = HAND_FEATURES * 2 + 3
SLOTS = ("Right", "Left")


def _palm_size(hand: np.ndarray, aspect: float) -> float:
    d = (hand[9] - hand[0]) * np.array([aspect, 1.0, aspect])
    return float(np.linalg.norm(d)) or 1e-6


def frame_features(hands: dict[str, np.ndarray], aspect: float) -> np.ndarray:
    """Feature vector for one frame. `hands` maps "Right"/"Left" to (21, 3) arrays."""
    out = np.zeros(FRAME_FEATURES, dtype=np.float32)
    palms: list[float] = []
    wrists: list[np.ndarray | None] = []

    for slot, side in enumerate(SLOTS):
        hand = hands.get(side)
        if hand is None:
            wrists.append(None)
            continue
        hand = np.asarray(hand, dtype=np.float64)
        size = _palm_size(hand, aspect)
        rel = (hand - hand[0]) * np.array([aspect, 1.0, aspect]) / size
        base = slot * HAND_FEATURES
        out[base : base + 63] = rel.reshape(-1)
        out[base + 63] = 1.0
        palms.append(size)
        wrists.append(np.array([hand[0, 0] * aspect, hand[0, 1]]))

    right, left = wrists
    if right is not None and left is not None:
        mean = (palms[0] + palms[1]) / 2
        base = HAND_FEATURES * 2
        out[base : base + 2] = (right - left) / mean
        out[base + 2] = np.log(palms[0] / palms[1])
    return out
