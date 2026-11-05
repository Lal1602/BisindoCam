"""Landmark-space augmentation. Works on raw (2, 21, 3) hand arrays in
MediaPipe normalised coordinates *before* featurisation, so every augmented
sample still goes through the exact browser feature code path."""

from __future__ import annotations

import numpy as np


def _rotate(hands: np.ndarray, aspect: float, roll: float, yaw: float, pitch: float) -> np.ndarray:
    out = hands.copy()
    for slot in range(2):
        h = out[slot]
        if np.isnan(h[0, 0]):
            continue
        # Work in isotropic units around the wrist, then map back.
        p = (h - h[0]) * np.array([aspect, 1.0, aspect])
        cr, sr = np.cos(roll), np.sin(roll)
        cy, sy = np.cos(yaw), np.sin(yaw)
        cp, sp = np.cos(pitch), np.sin(pitch)
        rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]])
        ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
        rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
        p = p @ (rz @ ry @ rx).T
        out[slot] = p / np.array([aspect, 1.0, aspect]) + h[0]
    return out


def mirror(hands: np.ndarray) -> np.ndarray:
    """A left-handed signer: flip x and swap the hand slots."""
    out = hands[::-1].copy()
    out[..., 0] = 1.0 - out[..., 0]
    return out


def augment(hands: np.ndarray, aspect: float, rng: np.random.Generator, allow_mirror: bool = True) -> np.ndarray:
    h = hands
    if allow_mirror and rng.random() < 0.5:
        h = mirror(h)
    h = _rotate(
        h,
        aspect,
        roll=rng.normal(0, np.radians(10)),
        yaw=rng.normal(0, np.radians(15)),
        pitch=rng.normal(0, np.radians(10)),
    )
    # Per-hand non-uniform squash (camera lens / hand shape variety) and landmark jitter.
    scale = rng.normal(1.0, 0.05, size=3)
    for slot in range(2):
        if not np.isnan(h[slot, 0, 0]):
            h[slot] = (h[slot] - h[slot, 0]) * scale + h[slot, 0]
    h = h + rng.normal(0, 0.002, size=h.shape)
    return h.astype(np.float32)
