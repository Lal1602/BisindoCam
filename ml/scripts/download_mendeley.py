"""Download the BISINDO letter datasets from Mendeley Data (CC BY 4.0).

    uv run python scripts/download_mendeley.py alphabet-images   # compressed colour photos, ~46 MB
    uv run python scripts/download_mendeley.py alphabet-videos   # A.mp4 ... Z.mp4, ~1 GB

Files land in ml/data/raw/<name>/<LETTER>/<filename>. Re-running skips files
that are already complete.
"""

from __future__ import annotations

import collections
import json
import string
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from tqdm import tqdm

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
API = "https://data.mendeley.com/public-api/datasets/{id}"  # latest version
HEADERS = {"User-Agent": "isyarat-ml/0.1 (dataset download for non-commercial research)"}


def open_url(url: str, timeout: int):
    return urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=timeout)


def fetch_json(url: str) -> dict:
    for attempt in range(6):
        try:
            with open_url(url, 120) as r:
                return json.load(r)
        except Exception:
            if attempt == 5:
                raise
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("unreachable")


def letter_of(filename: str) -> str | None:
    head = filename.strip().upper()
    for prefix in ("SALINAN ",):
        head = head.removeprefix(prefix)
    return head[0] if head and head[0] in string.ascii_uppercase and (len(head) == 1 or not head[1].isalpha()) else None


def alphabet_images(meta: dict) -> list[tuple[dict, str]]:
    """The compressed colour tier: folders whose files average 10–500 KB.
    A folder's letter is the most common leading letter of its filenames
    (some files are named IMG_xxxx)."""
    by_folder = collections.defaultdict(list)
    for f in meta["files"]:
        by_folder[f["folder_id"]].append(f)
    picked = []
    for files in by_folder.values():
        avg_kb = sum(f["size"] for f in files) / len(files) / 1e3
        if not 10 <= avg_kb < 500:
            continue
        votes = collections.Counter(filter(None, (letter_of(f["filename"]) for f in files)))
        if not votes:
            continue
        letter = votes.most_common(1)[0][0]
        picked += [(f, letter) for f in files if f["filename"].lower().endswith((".jpg", ".jpeg", ".png"))
                   and not f["filename"].startswith("._")]
    return picked


def alphabet_videos(meta: dict) -> list[tuple[dict, str]]:
    return [
        (f, f["filename"][0].upper())
        for f in meta["files"]
        if f["filename"].lower().endswith(".mp4") and len(Path(f["filename"]).stem) == 1
    ]


DATASETS = {
    "alphabet-images": ("ywnjpbcz8m", 1, alphabet_images),
    "alphabet-videos": ("235c78xbmk", 2, alphabet_videos),
}


def download_file(url: str, dest: Path, size: int) -> None:
    if dest.exists() and dest.stat().st_size == size:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(6):
        try:
            with open_url(url, 300) as r, open(tmp, "wb") as out:
                while chunk := r.read(1 << 16):
                    out.write(chunk)
            tmp.replace(dest)
            return
        except Exception:
            if attempt == 5:
                raise
            time.sleep(3 * (attempt + 1))


def main(name: str) -> None:
    dataset_id, version, select = DATASETS[name]
    meta = fetch_json(API.format(id=dataset_id))
    assert meta["version"] == version, f"expected v{version}, Mendeley now serves v{meta['version']}"
    print(f"{meta['name']} — licence {meta['data_licence']['short_name']}")
    files = select(meta)
    total = sum(f["size"] for f, _ in files)
    print(f"{len(files)} files, {total / 1e6:.0f} MB")

    target = RAW / name
    with ThreadPoolExecutor(max_workers=8) as pool:
        jobs = {
            pool.submit(
                download_file,
                f["content_details"]["download_url"],
                target / letter / f["filename"].strip(),
                f["size"],
            ): f["filename"]
            for f, letter in files
        }
        failed = []
        for job in tqdm(as_completed(jobs), total=len(jobs), unit="file"):
            if job.exception():
                failed.append(jobs[job])
    print(f"done -> {target}" + (f" ({len(failed)} failed: re-run to retry)" if failed else ""))


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in DATASETS:
        sys.exit(f"usage: download_mendeley.py {{{'|'.join(DATASETS)}}}")
    main(sys.argv[1])
