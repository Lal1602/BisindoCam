import json
from pathlib import Path

import numpy as np

from isyarat.word_features import WORD_FEATURE_VERSION, clip_features

FIXTURES = Path(__file__).parent / "fixtures" / "word_features.json"


def to_arrays(frames):
    hands = np.full((len(frames), 2, 21, 3), np.nan, np.float32)
    pose = np.full((len(frames), 33, 4), np.nan, np.float32)
    for t, f in enumerate(frames):
        for h in f["hands"]:
            hands[t, 0 if h["side"] == "Right" else 1] = [[p["x"], p["y"], p["z"]] for p in h["landmarks"]]
        if f["pose"]:
            pose[t, :, :3] = [[p["x"], p["y"], p["z"]] for p in f["pose"]]
            pose[t, :, 3] = 1
    return hands, pose


def test_matches_browser_implementation():
    data = json.loads(FIXTURES.read_text())
    assert data["version"] == WORD_FEATURE_VERSION
    for case in data["cases"]:
        hands, pose = to_arrays(case["frames"])
        got = clip_features(hands, pose, case["aspect"])
        np.testing.assert_allclose(got.reshape(-1), np.array(case["features"], dtype=np.float32), atol=1e-4)
