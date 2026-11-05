"""Download a small, balanced subset of the 40-word dataset file by file.

    uv run python scripts/download_subset.py [--subjects 1 2 3] [--per-word 6]

For slow connections: instead of one 1.5 GB zip, fetch N videos per word for
a few signers, several files at a time. Files land in the same layout as the
full dataset (ml/data/raw/bisindo-40-kata-5-subjek/dataset/<Gloss>/subjek n/…)
so extract_words.py treats them identically. Re-running skips finished files.
"""

from __future__ import annotations

import argparse
import collections
import re
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from tqdm import tqdm

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
SLUG = "aridone/dataset-bisindo-40-kata-5-subjek"
TARGET = RAW / "bisindo-40-kata-5-subjek"


def list_files(api) -> list[str]:
    names, token = [], None
    while True:
        page = api.dataset_list_files(SLUG, page_token=token, page_size=200)
        names += [f.name for f in page.files]
        token = page.next_page_token
        if not token:
            return names


def fetch(api, name: str) -> None:
    dest = TARGET / name
    if dest.exists() and dest.stat().st_size > 0:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(8):
        try:
            api.dataset_download_file(SLUG, name, path=str(dest.parent), quiet=True)
            # Kaggle may wrap single files in a zip named after the file.
            wrapped = dest.parent / (Path(name).name + ".zip")
            if wrapped.exists():
                with zipfile.ZipFile(wrapped) as z:
                    z.extractall(dest.parent)
                wrapped.unlink()
            if dest.exists():
                return
        except Exception:
            time.sleep(min(120, 10 * 2**attempt))
    raise RuntimeError(f"failed: {name}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subjects", type=int, nargs="+", default=[1, 2, 3])
    ap.add_argument("--per-word", type=int, default=6)
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()

    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    names = list_files(api)

    by_bucket: dict[tuple[str, int], list[str]] = collections.defaultdict(list)
    for n in names:
        m = re.match(r"dataset/([^/]+)/subjek (\d+)/.+\.mp4$", n)
        if m and int(m.group(2)) in args.subjects:
            by_bucket[(m.group(1), int(m.group(2)))].append(n)

    def take_key(n: str) -> int:
        k = re.search(r"-(\d+)\.mp4$", n)
        return int(k.group(1)) if k else 0

    wanted = [n for files in by_bucket.values() for n in sorted(files, key=take_key)[: args.per_word]]
    words = len({w for w, _ in by_bucket})
    print(f"{len(wanted)} videos: {words} words × {len(args.subjects)} signers × {args.per_word}", flush=True)

    failed = 0
    with ThreadPoolExecutor(args.workers) as pool:
        jobs = [pool.submit(fetch, api, n) for n in wanted]
        for job in tqdm(as_completed(jobs), total=len(jobs), unit="video"):
            if job.exception():
                failed += 1
    print(f"done ({failed} failed — re-run to retry)" if failed else "done", flush=True)


if __name__ == "__main__":
    main()
