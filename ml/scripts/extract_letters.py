"""Extract hand landmarks from the letter image dataset.

    uv run python scripts/extract_letters.py

Reads the image datasets below and writes ml/data/processed/letters.npz with:
  hands  (N, 2, 21, 3)  NaN where a hand slot is empty
  aspect (N,)
  label  (N,)           "A".."Z"
  source (N,)           dataset the image came from (evaluation holds out whole sources)
  group  (N,)           finer capture setting within a source
  path   (N,)
"""

from __future__ import annotations

import collections
import re
import string
import sys
from pathlib import Path

import numpy as np
from tqdm import tqdm

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))

from isyarat.extract import Extractor  # noqa: E402

RAW = ML / "data" / "raw"
OUT = ML / "data" / "processed" / "letters.npz"
IMAGE_EXT = {".jpg", ".jpeg", ".png"}


def achmad(root: Path):
    # Citra BISINDO/<LETTER>/<setting> (n).jpg
    for p in sorted(root.rglob("*")):
        if p.suffix.lower() in IMAGE_EXT and len(p.parent.name) == 1 and p.parent.name.upper() in string.ascii_uppercase:
            yield p, p.parent.name.upper(), re.sub(r"\s*\(\d+\)$", "", p.stem).strip().lower()


def yunita(root: Path):
    # BISINDO - Dataset/{train,test}/<LETTER>.<uuid>.jpg
    for p in sorted(root.rglob("*")):
        m = re.match(r"([A-Za-z])\.", p.name)
        if p.suffix.lower() in IMAGE_EXT and m:
            yield p, m.group(1).upper(), p.parent.name.lower()


SOURCES = {"alfabet-bisindo": achmad, "bisindo-yunita": yunita}


def main() -> None:
    files = [(p, letter, group, name) for name, walk in SOURCES.items() for p, letter, group in walk(RAW / name)]
    if not files:
        sys.exit(f"no images under {RAW}")

    ex = Extractor(with_pose=False)
    hands, aspect, label, source, group, path = [], [], [], [], [], []
    seen = collections.Counter()
    found = collections.Counter()
    for p, letter, setting, name in tqdm(files, unit="img"):
        seen[letter] += 1
        try:
            r = ex.image(p)
        except ValueError:
            continue
        h = r["hands"][0]
        if np.isnan(h[:, 0, 0]).all():
            continue
        found[letter] += 1
        hands.append(h)
        aspect.append(r["aspect"])
        label.append(letter)
        source.append(name)
        group.append(setting)
        path.append(str(p.relative_to(RAW)))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        OUT,
        hands=np.stack(hands).astype(np.float32),
        aspect=np.array(aspect, np.float32),
        label=np.array(label),
        source=np.array(source),
        group=np.array(group),
        path=np.array(path),
    )
    print(f"\n{sum(found.values())}/{sum(seen.values())} images with a detected hand -> {OUT}")
    for letter in string.ascii_uppercase:
        print(f"  {letter}: {found[letter]:>4}/{seen[letter]:<4}", end="\n" if letter in "GNTZ" else "")
    print("sources:", dict(collections.Counter(source)))


if __name__ == "__main__":
    main()
