"""Landmark extraction with the exact MediaPipe models the browser uses.

Each video becomes one .npz with:
  hands   float32 (T, 2, 21, 3)  slot 0 = signer's right, 1 = left; NaN when absent
  pose    float32 (T, 33, 4)     x, y, z, visibility; NaN when absent
  aspect  float                  frame width / height
  fps     float
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "web" / "public" / "models"


@dataclass
class Extractor:
    hand_model: Path = MODELS / "hand_landmarker.task"
    pose_model: Path = MODELS / "pose_landmarker_lite.task"
    with_pose: bool = True

    def __post_init__(self) -> None:
        from mediapipe.tasks.python import BaseOptions
        from mediapipe.tasks.python import vision

        self._vision = vision
        self._hand_opts = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(self.hand_model)),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._pose_opts = vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(self.pose_model)),
            running_mode=vision.RunningMode.VIDEO,
        )

    def _landmarkers(self):
        # Creating a landmarker costs seconds on Windows, so each Extractor keeps
        # one of each for its lifetime (one per worker process).
        if not hasattr(self, "_hands"):
            self._hands = self._vision.HandLandmarker.create_from_options(self._hand_opts)
            self._pose = self._vision.PoseLandmarker.create_from_options(self._pose_opts) if self.with_pose else None
            self._clock = 0  # ms; VIDEO mode needs strictly increasing timestamps across clips
        return self._hands, self._pose

    def video(self, path: Path, stride: int = 1) -> dict[str, np.ndarray | float]:
        """Every `stride`-th frame; the returned fps is the effective rate."""
        import mediapipe as mp

        hands, pose = self._landmarkers()
        cap = cv2.VideoCapture(str(path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        hands_seq, pose_seq = [], []
        aspect = 4 / 3
        first = True
        index = -1
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            index += 1
            if index % stride:
                continue
            h, w = bgr.shape[:2]
            aspect = w / h
            if first:
                # A blank frame drops any tracking state left over from the previous clip.
                blank = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.zeros((h, w, 3), np.uint8))
                self._clock += 1000
                hands.detect_for_video(blank, self._clock)
                if pose:
                    pose.detect_for_video(blank, self._clock)
                first = False
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            self._clock += max(1, int(round(1000 * stride / fps)))
            hands_seq.append(_hands_array(hands.detect_for_video(image, self._clock)))
            pose_seq.append(_pose_array(pose.detect_for_video(image, self._clock)) if pose else _empty_pose())
        cap.release()
        return {
            "hands": np.stack(hands_seq) if hands_seq else np.full((0, 2, 21, 3), np.nan, np.float32),
            "pose": np.stack(pose_seq) if pose_seq else np.full((0, 33, 4), np.nan, np.float32),
            "aspect": float(aspect),
            "fps": float(fps / stride),
        }

    def image(self, path: Path) -> dict[str, np.ndarray | float]:
        """Single still image (letter datasets) — uses IMAGE mode."""
        import mediapipe as mp
        from mediapipe.tasks.python import BaseOptions

        opts = self._vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(self.hand_model)),
            running_mode=self._vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.4,
        )
        bgr = cv2.imread(str(path))
        if bgr is None:
            raise ValueError(f"unreadable image: {path}")
        h, w = bgr.shape[:2]
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        if not hasattr(self, "_image_landmarker"):
            self._image_landmarker = self._vision.HandLandmarker.create_from_options(opts)
        return {"hands": _hands_array(self._image_landmarker.detect(image))[None], "aspect": w / h}


def _hands_array(result) -> np.ndarray:
    out = np.full((2, 21, 3), np.nan, np.float32)
    for landmarks, handedness in zip(result.hand_landmarks, result.handedness):
        # Same flip as the browser (web/lib/vision/tracker.ts): MediaPipe assumes
        # a mirrored selfie image, we feed raw frames.
        label = handedness[0].category_name
        slot = 0 if label == "Left" else 1  # "Left" in raw frame = signer's right
        if not np.isnan(out[slot, 0, 0]):
            continue  # keep the more confident (first) detection for a slot
        out[slot] = [[p.x, p.y, p.z] for p in landmarks]
    return out


def _pose_array(result) -> np.ndarray:
    if not result.pose_landmarks:
        return _empty_pose()
    return np.array([[p.x, p.y, p.z, p.visibility or 0.0] for p in result.pose_landmarks[0]], np.float32)


def _empty_pose() -> np.ndarray:
    return np.full((33, 4), np.nan, np.float32)
