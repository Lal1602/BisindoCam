"""Word (dynamic sign) features — Python twin of web/lib/vision/word-features.ts.

Per frame: the 131 hand features (isyarat.features) plus 7 body-anchored values,
so signs that differ mainly by *where* they are made (at the chin, the chest…)
stay apart:
  4  each hand's wrist relative to the shoulder centre, / shoulder width
     (slots [Right, Left]; 0 when the hand is absent)
  2  nose relative to the shoulder centre, / shoulder width
  1  pose present flag
A clip is trimmed to the frames where a hand is visible and resampled to
SEQ_LEN frames by nearest index.
"""

from __future__ import annotations

import numpy as np

from .features import FRAME_FEATURES, SLOTS, frame_features

WORD_FEATURE_VERSION = 1
BODY_FEATURES = 7
WORD_FRAME_FEATURES = FRAME_FEATURES + BODY_FEATURES  # 138
SEQ_LEN = 32

NOSE, L_SHOULDER, R_SHOULDER = 0, 11, 12  # MediaPipe pose indices (person's own left/right)


def body_features(hands: dict[str, np.ndarray], pose: np.ndarray | None, aspect: float) -> np.ndarray:
    out = np.zeros(BODY_FEATURES, np.float32)
    if pose is None or np.isnan(pose[[L_SHOULDER, R_SHOULDER], 0]).any():
        return out
    iso = np.array([aspect, 1.0])
    ls, rs = pose[L_SHOULDER, :2] * iso, pose[R_SHOULDER, :2] * iso
    centre = (ls + rs) / 2
    width = float(np.linalg.norm(ls - rs)) or 1e-6
    for slot, side in enumerate(SLOTS):
        hand = hands.get(side)
        if hand is not None:
            out[slot * 2 : slot * 2 + 2] = (hand[0, :2] * iso - centre) / width
    out[4:6] = (pose[NOSE, :2] * iso - centre) / width
    out[6] = 1.0
    return out


def word_frame_features(hands: dict[str, np.ndarray], pose: np.ndarray | None, aspect: float) -> np.ndarray:
    return np.concatenate([frame_features(hands, aspect), body_features(hands, pose, aspect)])


def resample_indices(n: int, length: int = SEQ_LEN) -> np.ndarray:
    return np.round(np.linspace(0, n - 1, length)).astype(int) if n else np.zeros(length, int)


def clip_features(hands_seq: np.ndarray, pose_seq: np.ndarray, aspect: float, length: int = SEQ_LEN) -> np.ndarray | None:
    """(T, 2, 21, 3) hands + (T, 33, 4) pose -> (length, 138), or None if no hand is ever seen."""
    seen = ~np.isnan(hands_seq[:, :, 0, 0]).all(axis=1)
    if not seen.any():
        return None
    first, last = np.flatnonzero(seen)[[0, -1]]
    frames = []
    for t in range(first, last + 1):
        present = {side: hands_seq[t, slot] for slot, side in enumerate(SLOTS) if not np.isnan(hands_seq[t, slot, 0, 0])}
        pose = pose_seq[t] if not np.isnan(pose_seq[t, 0, 0]) else None
        frames.append(word_frame_features(present, pose, aspect))
    frames = np.stack(frames)
    return frames[resample_indices(len(frames), length)]
