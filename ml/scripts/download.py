"""Download the public BISINDO datasets into ml/data/raw/<name>/.

Credentials come from ~/.kaggle/access_token (or KAGGLE_API_TOKEN); they are
never stored in this repository. Re-running skips datasets already present.

    uv run python scripts/download.py            # everything
    uv run python scripts/download.py wl-bisindo # one dataset
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"

# name -> (kaggle slug, licence as published by the authors)
# Ordered smallest-first so something usable lands early on slow connections.
KAGGLE_DATASETS = {
    "alfabet-bisindo": ("achmadnoer/alfabet-bisindo", "not stated by uploader"),
    "bisindo-yunita": ("yunitayupratiwi/bisindo-dataset", "not stated by uploader"),
    "bisindo-landmarks-surya": ("suryaadji/bisindo-alphabet-mediapipe-hand-landmarks", "see dataset page"),
    "bisindo-40-kata-5-subjek": ("aridone/dataset-bisindo-40-kata-5-subjek", "not stated by uploader"),
    "wl-bisindo": ("glennleonali/wl-bisindo", "CC BY-NC 4.0"),
}


def download(name: str) -> None:
    from kaggle.api.kaggle_api_extended import KaggleApi

    slug, licence = KAGGLE_DATASETS[name]
    target = RAW / name
    done = target / ".complete"
    if done.exists():
        print(f"[skip] {name}: already in {target}")
        return

    target.mkdir(parents=True, exist_ok=True)
    print(f"[get ] {name} ({slug}, licence: {licence})", flush=True)
    # The connection here drops often; keep retrying with backoff. Kaggle
    # resumes from its .kaggle-partial file, so no progress is lost.
    for attempt in range(40):
        try:
            api = KaggleApi()
            api.authenticate()
            api.dataset_download_files(slug, path=str(target), unzip=True, quiet=True)
            done.touch()
            print(f"[done] {name} -> {target}", flush=True)
            return
        except Exception as err:  # network errors come in many shapes
            wait = min(300, 15 * 2 ** min(attempt, 5))
            print(f"[retry] {name}: {type(err).__name__}; again in {wait}s", flush=True)
            time.sleep(wait)
    print(f"[fail] {name}: giving up after repeated network errors", flush=True)


def main(argv: list[str]) -> None:
    names = argv or list(KAGGLE_DATASETS)
    unknown = [n for n in names if n not in KAGGLE_DATASETS]
    if unknown:
        sys.exit(f"unknown dataset(s): {', '.join(unknown)}; choose from {', '.join(KAGGLE_DATASETS)}")
    for name in names:
        download(name)


if __name__ == "__main__":
    main(sys.argv[1:])
