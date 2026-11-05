import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { demoFrame } from "./demo-hand";
import type { Point3 } from "./hand";
import { SEQ_LEN, WORD_FRAME_FEATURES, clipFeatures, resampleIndices, type BodyFrame } from "./word-features";

// A plausible upper-body pose: nose above the shoulder midpoint.
function pose(dx = 0): Point3[] {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5 + dx, y: 0.5, z: 0 }));
  p[0] = { x: 0.5 + dx, y: 0.3, z: 0 };
  p[11] = { x: 0.62 + dx, y: 0.55, z: 0 }; // person's left shoulder appears on image right
  p[12] = { x: 0.38 + dx, y: 0.55, z: 0 };
  return p;
}

const clip = (n: number, withPose = true): BodyFrame[] =>
  Array.from({ length: n }, (_, i) => {
    const f = demoFrame(i / 15);
    return { ...f, hands: i < 2 ? [] : f.hands, pose: withPose ? pose(i * 0.002) : null };
  });

describe("word features", () => {
  it("resamples like numpy round(linspace)", () => {
    expect(resampleIndices(5, 9)).toEqual([0, 0, 1, 2, 2, 2, 3, 4, 4]);
    expect(resampleIndices(1)).toEqual(Array(SEQ_LEN).fill(0));
  });

  it("trims frames without hands and has a fixed size", () => {
    const f = clipFeatures(clip(20), 9 / 16)!;
    expect(f).toHaveLength(SEQ_LEN * WORD_FRAME_FEATURES);
    expect(f[WORD_FRAME_FEATURES - 1]).toBe(1); // pose flag
    expect(clipFeatures(clip(5).map((c) => ({ ...c, hands: [] })), 1)).toBeNull();
  });

  it("writes python parity fixtures", () => {
    const cases = [
      { frames: clip(20), aspect: 9 / 16 },
      { frames: clip(45), aspect: 4 / 3 },
      { frames: clip(9, false), aspect: 16 / 9 },
    ].map(({ frames, aspect }) => ({ frames, aspect, features: Array.from(clipFeatures(frames, aspect)!) }));
    const path = resolve(__dirname, "../../../ml/tests/fixtures/word_features.json");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ version: 1, cases }));
    expect(cases).toHaveLength(3);
  });
});
