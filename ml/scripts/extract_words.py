"""Extract hand + pose landmarks from every word video, in parallel.

    uv run python scripts/extract_words.py [--workers 12] [--stride 2] [--per-group 25]

MediaPipe runs ~0.2 s per frame on this CPU, so by default every 2nd frame is
used (15 fps is plenty: sequences are resampled to 32 steps for the model) and
at most --per-group videos per (gloss, signer). Raise it later to add data;
finished videos are never redone.

Writes one .npz per video under ml/data/processed/words/<dataset>/ (see
isyarat/extract.py for the arrays) and an index at
ml/data/processed/words/index.csv with: file, dataset, gloss, signer, frames.
Already-extracted videos are skipped, so the script can be stopped and resumed.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import os
import re
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from tqdm import tqdm

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))

from isyarat.glosses import canonical_gloss  # noqa: E402

RAW = ML / "data" / "raw"
OUT = ML / "data" / "processed" / "words"
VIDEO_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


def parse_aridone(path: Path) -> tuple[str, str] | None:
    # dataset/<Gloss>/subjek <n>/s<n>-<Gloss>-<k>.mp4
    m = re.search(r"subjek\s*(\d+)", path.parent.name, re.I)
    if not m:
        return None
    return path.parent.parent.name, f"aridone-s{m.group(1)}"


# Label ids -> glosses, from the dataset's README (github.com/AceKinnn/WL-BISINDO).
WL_GLOSSES = [
    "Air", "Belajar", "Cari", "Hari", "Ingat", "Lagi", "Maaf", "Makan", "Motor", "Saya", "Terima kasih",
    "Tuli", "Apa", "Siapa", "Kapan", "Di mana", "Mengapa", "Bagaimana", "Merah", "Kuning", "Hijau",
    "Hitam", "Dengar", "Berangkat", "Datang", "Teman", "Keluarga", "Rumah", "Pagi", "Siang", "Sore", "Malam",
]


def parse_wl_bisindo(path: Path) -> tuple[str, str] | None:
    # signer<s>_label<l>_sample<k>.mp4
    m = re.fullmatch(r"signer(\d+)_label(\d+)_sample\d+", path.stem)
    if not m or int(m.group(2)) >= len(WL_GLOSSES):
        return None
    return WL_GLOSSES[int(m.group(2))], f"wl-s{m.group(1)}"


DATASETS = {
    "bisindo-40-kata-5-subjek": parse_aridone,
    "wl-bisindo": parse_wl_bisindo,
}

_extractor = None


def _init() -> None:
    global _extractor
    os.environ.setdefault("GLOG_minloglevel", "2")
    from isyarat.extract import Extractor

    _extractor = Extractor(with_pose=True)


def _work(job: tuple[str, str, int]) -> tuple[str, int | None]:
    src, dst, stride = job
    try:
        r = _extractor.video(Path(src), stride=stride)
        np.savez_compressed(dst, **{k: np.asarray(v) for k, v in r.items()})
        return dst, int(len(r["hands"]))
    except Exception as err:  # a corrupt video must not stop the run
        print(f"\n[skip] {src}: {err}", file=sys.stderr)
        return dst, None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 4) - 4))
    ap.add_argument("--stride", type=int, default=2)
    ap.add_argument("--per-group", type=int, default=25, help="max videos per (gloss, signer); 0 = all")
    ap.add_argument("--index-only", action="store_true", help="just (re)write index.csv for videos already extracted")
    args = ap.parse_args()

    rows, jobs = [], []
    for name, parse in DATASETS.items():
        root = RAW / name
        # Works on a partial download too (scripts/download_subset.py).
        videos = sorted(p for p in root.rglob("*") if p.suffix.lower() in VIDEO_EXT) if root.exists() else []
        if not videos:
            print(f"[wait] {name}: no videos yet")
            continue
        (OUT / name).mkdir(parents=True, exist_ok=True)
        taken: collections.Counter = collections.Counter()
        for v in videos:
            parsed = parse(v)
            if not parsed:
                continue
            gloss, signer = parsed
            taken[(gloss, signer)] += 1
            if args.per_group and taken[(gloss, signer)] > args.per_group:
                continue
            dst = OUT / name / (hashlib.sha1(str(v.relative_to(root)).encode()).hexdigest()[:16] + ".npz")
            rows.append({"file": str(dst.relative_to(OUT)), "dataset": name, "gloss": canonical_gloss(gloss), "signer": signer, "source": str(v.relative_to(root))})
            if not dst.exists() and not args.index_only:
                jobs.append((str(v), str(dst), args.stride))
        print(f"[scan] {name}: {len(videos)} videos")

    frames: dict[str, int | None] = {}
    if jobs:
        with Pool(args.workers, initializer=_init) as pool:
            for dst, n in tqdm(pool.imap_unordered(_work, jobs, chunksize=4), total=len(jobs), unit="video"):
                frames[dst] = n

    index = OUT / "index.csv"
    with open(index, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "dataset", "gloss", "signer", "frames", "source"])
        w.writeheader()
        for row in rows:
            path = OUT / row["file"]
            if not path.exists():
                continue
            n = frames.get(str(path))
            if n is None:
                with np.load(path) as d:
                    n = len(d["hands"])
            w.writerow({**row, "frames": n})
    print(f"index -> {index}")


if __name__ == "__main__":
    main()
