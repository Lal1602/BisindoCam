// Word (dynamic sign) features — twin of ml/isyarat/word_features.py.
// Per frame: the 131 hand features plus 7 body-anchored values (wrists and
// nose relative to the shoulder centre, scaled by shoulder width, and a pose
// presence flag). A clip is trimmed to frames with a hand and resampled to
// SEQ_LEN frames by nearest index.

import { FRAME_FEATURES, frameFeatures } from "./features";
import type { HandFrame, Handedness, Point3 } from "./hand";

export const WORD_FEATURE_VERSION = 1;
export const BODY_FEATURES = 7;
export const WORD_FRAME_FEATURES = FRAME_FEATURES + BODY_FEATURES;
export const SEQ_LEN = 32;

const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const SLOTS: Handedness[] = ["Right", "Left"];

/** A hand frame plus the upper-body pose seen at the same moment (null if none). */
export type BodyFrame = HandFrame & { pose: Point3[] | null };

export function bodyFeatures(frame: BodyFrame, aspect: number): Float32Array {
  const out = new Float32Array(BODY_FEATURES);
  const pose = frame.pose;
  if (!pose) return out;
  const ls = { x: pose[L_SHOULDER].x * aspect, y: pose[L_SHOULDER].y };
  const rs = { x: pose[R_SHOULDER].x * aspect, y: pose[R_SHOULDER].y };
  const cx = (ls.x + rs.x) / 2;
  const cy = (ls.y + rs.y) / 2;
  const width = Math.hypot(ls.x - rs.x, ls.y - rs.y) || 1e-6;
  SLOTS.forEach((side, slot) => {
    const wrist = frame.hands.find((h) => h.side === side)?.landmarks[0];
    if (!wrist) return;
    out[slot * 2] = (wrist.x * aspect - cx) / width;
    out[slot * 2 + 1] = (wrist.y - cy) / width;
  });
  out[4] = (pose[NOSE].x * aspect - cx) / width;
  out[5] = (pose[NOSE].y - cy) / width;
  out[6] = 1;
  return out;
}

export function wordFrameFeatures(frame: BodyFrame, aspect: number): Float32Array {
  const out = new Float32Array(WORD_FRAME_FEATURES);
  out.set(frameFeatures(frame, aspect), 0);
  out.set(bodyFeatures(frame, aspect), FRAME_FEATURES);
  return out;
}

/** Nearest-index resampling, identical to numpy's round(linspace(0, n-1, length)). */
export function resampleIndices(n: number, length = SEQ_LEN): number[] {
  if (n <= 1) return Array(length).fill(0);
  return Array.from({ length }, (_, i) => roundHalfEven((i * (n - 1)) / (length - 1)));
}

// numpy rounds halves to even; match it exactly.
function roundHalfEven(v: number): number {
  const f = Math.floor(v);
  const d = v - f;
  if (Math.abs(d - 0.5) > 1e-9) return Math.round(v);
  return f % 2 === 0 ? f : f + 1;
}

/** Features for a clip of frames → flat Float32Array of SEQ_LEN × WORD_FRAME_FEATURES, or null if no hand. */
export function clipFeatures(frames: BodyFrame[], aspect: number, length = SEQ_LEN): Float32Array | null {
  const first = frames.findIndex((f) => f.hands.length > 0);
  if (first < 0) return null;
  let last = frames.length - 1;
  while (frames[last].hands.length === 0) last--;
  const kept = frames.slice(first, last + 1).map((f) => wordFrameFeatures(f, aspect));
  const out = new Float32Array(length * WORD_FRAME_FEATURES);
  resampleIndices(kept.length, length).forEach((src, i) => out.set(kept[src], i * WORD_FRAME_FEATURES));
  return out;
}
