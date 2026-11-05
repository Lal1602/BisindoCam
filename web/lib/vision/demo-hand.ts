// A procedural hand for when no camera is in use. It is a gentle idle
// animation built from simple forward kinematics — it does NOT perform real
// BISINDO signs, and the UI labels it as a demo.

import type { HandFrame, HandLandmarks, Point3 } from "./hand";

type Pose = {
  /** Curl per finger (thumb, index, middle, ring, pinky): 0 = straight, 1 = fully bent. */
  curl: [number, number, number, number, number];
  /** Extra sideways spread in radians. */
  spread: number;
};

// Mostly open shapes: they read clearly as a hand from any angle.
const POSES: Pose[] = [
  { curl: [0, 0, 0, 0, 0], spread: 0.14 },
  { curl: [0.1, 0.1, 0.2, 0.35, 0.45], spread: 0.05 },
  { curl: [0.8, 0, 0, 0.9, 0.9], spread: 0.24 },
  { curl: [0, 0, 0.85, 0.9, 0.9], spread: 0.08 },
  { curl: [0.55, 0.55, 0.05, 0.05, 0.05], spread: 0.12 },
  { curl: [0.85, 0, 0.9, 0.9, 0.9], spread: 0 },
];

// Hand-local layout (wrist at origin, fingers point towards -y, unit ≈ palm length).
const MCP: [number, number][] = [
  [0.3, -0.26], // thumb CMC
  [0.33, -0.95],
  [0.08, -1.0],
  [-0.15, -0.93],
  [-0.36, -0.8],
];
const SEGMENTS = [
  [0.36, 0.3, 0.25],
  [0.42, 0.25, 0.2],
  [0.47, 0.28, 0.21],
  [0.43, 0.26, 0.2],
  [0.33, 0.2, 0.18],
];
const JOINT_BEND = [1.35, 1.6, 1.05];

const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function poseAt(time: number): Pose {
  const hold = 2.4;
  const i = Math.floor(time / hold);
  const t = ease(Math.min(1, (time / hold - i) * 1.6));
  const a = POSES[i % POSES.length];
  const b = POSES[(i + 1) % POSES.length];
  return {
    curl: a.curl.map((c, k) => mix(c, b.curl[k], t)) as Pose["curl"],
    spread: mix(a.spread, b.spread, t),
  };
}

function buildLocal(pose: Pose): Point3[] {
  const pts: Point3[] = new Array(21);
  pts[0] = { x: 0, y: 0, z: 0 };

  for (let f = 0; f < 5; f++) {
    const [bx, by] = MCP[f];
    const base = 1 + f * 4;
    pts[base] = { x: bx, y: by, z: 0 };

    // Direction in the palm plane; the thumb points outwards, fingers fan out.
    let angle = f === 0 ? Math.atan2(-0.75, 0.62) : Math.atan2(by, bx) + (f - 2) * pose.spread;
    if (f === 0) angle -= pose.curl[0] * 0.9; // thumb sweeps across the palm
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let bend = 0;
    let p = pts[base];
    for (let s = 0; s < 3; s++) {
      bend += pose.curl[f] * JOINT_BEND[s] * (f === 0 ? 0.55 : 1);
      const len = SEGMENTS[f][s];
      p = {
        x: p.x + len * dx * Math.cos(bend),
        y: p.y + len * dy * Math.cos(bend),
        z: p.z - len * Math.sin(bend), // curling moves towards the camera
      };
      pts[base + 1 + s] = p;
    }
  }
  return pts;
}

/** Demo hand frame at `time` seconds. Pass `still` for reduced motion. */
export function demoFrame(time: number, still = false): HandFrame {
  const t = still ? 0 : time;
  const local = buildLocal(still ? POSES[0] : poseAt(t));

  // A three-quarter view so curled fingers read in profile rather than as knobs.
  const roll = -0.12 + Math.sin(t * 0.45) * 0.1;
  const yaw = 0.62 + Math.sin(t * 0.3) * 0.25;
  const scale = 0.3;
  const cx = 0.52 + Math.sin(t * 0.21) * 0.015;
  const cy = 0.84 + Math.sin(t * 0.37) * 0.01;

  const landmarks: HandLandmarks = local.map(({ x, y, z }) => {
    const rx = x * Math.cos(roll) - y * Math.sin(roll);
    const ry = x * Math.sin(roll) + y * Math.cos(roll);
    const yx = rx * Math.cos(yaw) + z * Math.sin(yaw);
    const yz = -rx * Math.sin(yaw) + z * Math.cos(yaw);
    return { x: cx + yx * scale, y: cy + ry * scale, z: yz * scale };
  });

  return { hands: [{ side: "Right", landmarks, score: 1 }], timestamp: time * 1000 };
}
