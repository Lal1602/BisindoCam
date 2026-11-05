import { describe, expect, it } from "vitest";
import { demoFrame } from "./demo-hand";
import { FRAME_FEATURES, HAND_FEATURES, frameFeatures } from "./features";
import type { HandFrame } from "./hand";

describe("frameFeatures", () => {
  it("has a fixed length and zeroes absent hands", () => {
    const f = frameFeatures(demoFrame(1), 4 / 3);
    expect(f).toHaveLength(FRAME_FEATURES);
    expect(f[HAND_FEATURES - 1]).toBe(1); // right present
    expect(f[HAND_FEATURES * 2 - 1]).toBe(0); // left absent
    expect(f.slice(HAND_FEATURES, HAND_FEATURES * 2).every((v) => v === 0)).toBe(true);
  });

  it("is invariant to where the hand is and how big it appears", () => {
    const frame = demoFrame(2.3);
    const moved: HandFrame = {
      ...frame,
      hands: frame.hands.map((h) => ({
        ...h,
        landmarks: h.landmarks.map((p) => ({ x: 0.2 + (p.x - 0.5) * 0.6, y: 0.3 + (p.y - 0.5) * 0.6, z: p.z * 0.6 })),
      })),
    };
    const a = frameFeatures(frame, 4 / 3);
    const b = frameFeatures(moved, 4 / 3);
    a.forEach((v, i) => expect(b[i]).toBeCloseTo(v, 5));
  });

  it("puts the wrist at the origin with palm size 1", () => {
    const f = frameFeatures(demoFrame(0), 16 / 9);
    expect([f[0], f[1], f[2]]).toEqual([0, 0, 0]);
    expect(Math.hypot(f[27], f[28], f[29])).toBeCloseTo(1, 5); // landmark 9
  });
});

// Shared fixtures for ml/tests/test_features.py: the Python twin must
// reproduce these vectors exactly (within float32 tolerance).
describe("python parity fixtures", () => {
  it("writes ml/tests/fixtures/features.json", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    const both = (t: number): HandFrame => {
      const right = demoFrame(t).hands[0];
      const left = demoFrame(t + 1.7).hands[0];
      return {
        timestamp: t,
        hands: [
          right,
          { ...left, side: "Left", landmarks: left.landmarks.map((p) => ({ x: 1 - p.x - 0.1, y: p.y - 0.05, z: p.z })) },
        ],
      };
    };
    const cases = [
      { frame: demoFrame(0.5), aspect: 4 / 3 },
      { frame: both(3.1), aspect: 16 / 9 },
      { frame: { timestamp: 0, hands: [{ ...demoFrame(4).hands[0], side: "Left" as const }] }, aspect: 1 },
      { frame: { timestamp: 0, hands: [] }, aspect: 4 / 3 },
    ].map(({ frame, aspect }) => ({ frame, aspect, features: Array.from(frameFeatures(frame, aspect)) }));

    const path = resolve(__dirname, "../../../ml/tests/fixtures/features.json");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ version: 1, cases }));
    expect(cases).toHaveLength(4);
  });
});
