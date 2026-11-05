"""Copy the model evaluation numbers the website shows (Lab page) from
ml/runs/*_report.json into web/content/model-report.json."""

from __future__ import annotations

import json
from pathlib import Path

ML = Path(__file__).resolve().parents[1]
OUT = ML.parent / "web" / "content" / "model-report.json"


def main() -> None:
    report: dict = {}
    letters = ML / "runs" / "letters_report.json"
    if letters.exists():
        r = json.loads(letters.read_text())
        report["letters"] = {
            "samples": r["samples"],
            "sources": r["sources"],
            "evaluation": r["evaluation"],
            "heldOutBySource": r["heldOutBySource"],
            "heldOutMeanOverSources": r["heldOutMeanOverSources"],
            "heldOutTop3": r["heldOutTop3"],
            "perLetter": r["perLetter"],
            "onnxKB": round(r["onnxBytes"] / 1000),
        }
    words = ML / "runs" / "words_report.json"
    if words.exists():
        report["words"] = json.loads(words.read_text())["summary"]
    OUT.write_text(json.dumps(report, indent=2) + "\n")
    print(f"wrote {OUT} ({', '.join(report) or 'empty'})")


if __name__ == "__main__":
    main()
