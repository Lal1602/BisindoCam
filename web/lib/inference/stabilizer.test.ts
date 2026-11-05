import { describe, expect, it } from "vitest";
import { Stabilizer } from "./stabilizer";

const labels = ["A", "B", "C"];
const p = (...v: number[]) => Float32Array.from(v);

function run(s: Stabilizer, frames: (Float32Array | null)[], step = 33) {
  return frames.map((f, i) => s.update(f, i * step)).flatMap((r) => (r.committed ? [r.committed] : []));
}

describe("Stabilizer", () => {
  it("commits a letter only after it is held", () => {
    expect(run(new Stabilizer(labels), Array(10).fill(p(0.9, 0.05, 0.05)))).toEqual([]); // 330 ms
    expect(run(new Stabilizer(labels), Array(20).fill(p(0.9, 0.05, 0.05)))).toEqual(["A"]);
  });

  it("ignores brief flickers", () => {
    const frames = [...Array(20).fill(p(0.9, 0.05, 0.05)), p(0.05, 0.9, 0.05), ...Array(20).fill(p(0.9, 0.05, 0.05))];
    expect(run(new Stabilizer(labels), frames)).toEqual(["A"]);
  });

  it("repeats a letter after the hand leaves the frame", () => {
    const frames = [...Array(20).fill(p(0.9, 0.05, 0.05)), ...Array(12).fill(null), ...Array(20).fill(p(0.9, 0.05, 0.05))];
    expect(run(new Stabilizer(labels), frames)).toEqual(["A", "A"]);
  });

  it("spells different letters in sequence", () => {
    const frames = [...Array(20).fill(p(0.9, 0.05, 0.05)), ...Array(25).fill(p(0.05, 0.05, 0.9))];
    expect(run(new Stabilizer(labels), frames)).toEqual(["A", "C"]);
  });

  it("does not commit low-confidence guesses", () => {
    expect(run(new Stabilizer(labels), Array(40).fill(p(0.5, 0.3, 0.2)))).toEqual([]);
  });
});
