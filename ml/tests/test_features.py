import json
from pathlib import Path

import numpy as np

from isyarat.features import FEATURE_VERSION, frame_features

FIXTURES = Path(__file__).parent / "fixtures" / "features.json"


def test_matches_browser_implementation():
    data = json.loads(FIXTURES.read_text())
    assert data["version"] == FEATURE_VERSION
    for case in data["cases"]:
        hands = {
            h["side"]: np.array([[p["x"], p["y"], p["z"]] for p in h["landmarks"]])
            for h in case["frame"]["hands"]
        }
        got = frame_features(hands, case["aspect"])
        np.testing.assert_allclose(got, np.array(case["features"], dtype=np.float32), atol=1e-4)
