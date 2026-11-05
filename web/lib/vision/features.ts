// Frame features — the contract between training (ml/isyarat/features.py) and
// the browser. Any change here MUST be mirrored in Python and FEATURE_VERSION
// bumped; tests compare both implementations on shared fixtures.
//
// Per frame, for each hand slot in order [Right, Left] (the signer's own hands):
//   63 values  landmarks relative to that hand's wrist, x scaled by the frame
//              aspect ratio (so units are isotropic), divided by palm size
//              (wrist → middle-finger knuckle). z is scaled the same way.
//    1 value   presence flag (1 present, 0 absent → the 63 values are 0)
// Then 3 values: right wrist minus left wrist (x, y) divided by the mean palm
// size, and log(right palm / left palm) as a relative-depth cue (all 0 when
// either hand is missing).
// Total: 2 × 64 + 3 = 131.

import type { HandFrame, Handedness, HandLandmarks } from "./hand";

export const FEATURE_VERSION = 1;
export const HAND_FEATURES = 64;
export const FRAME_FEATURES = HAND_FEATURES * 2 + 3;

const SLOTS: Handedness[] = ["Right", "Left"];

function palmSize(hand: HandLandmarks, aspect: number): number {
  const dx = (hand[9].x - hand[0].x) * aspect;
  const dy = hand[9].y - hand[0].y;
  const dz = (hand[9].z - hand[0].z) * aspect;
  return Math.hypot(dx, dy, dz) || 1e-6;
}

/** Feature vector for one frame. `aspect` is the source frame's width / height. */
export function frameFeatures(frame: HandFrame, aspect: number): Float32Array {
  const out = new Float32Array(FRAME_FEATURES);
  const palms: number[] = [];
  const wrists: ({ x: number; y: number } | null)[] = [];

  SLOTS.forEach((side, slot) => {
    const hand = frame.hands.find((h) => h.side === side)?.landmarks;
    if (!hand) {
      wrists.push(null);
      return;
    }
    const size = palmSize(hand, aspect);
    const w = hand[0];
    const base = slot * HAND_FEATURES;
    hand.forEach((p, i) => {
      out[base + i * 3] = ((p.x - w.x) * aspect) / size;
      out[base + i * 3 + 1] = (p.y - w.y) / size;
      out[base + i * 3 + 2] = ((p.z - w.z) * aspect) / size;
    });
    out[base + 63] = 1;
    palms.push(size);
    wrists.push({ x: w.x * aspect, y: w.y });
  });

  const [right, left] = wrists;
  if (right && left) {
    const mean = (palms[0] + palms[1]) / 2;
    const base = HAND_FEATURES * 2;
    out[base] = (right.x - left.x) / mean;
    out[base + 1] = (right.y - left.y) / mean;
    // Hand landmark z is wrist-relative, so there is no absolute depth between hands.
    out[base + 2] = Math.log(palms[0] / palms[1]);
  }
  return out;
}
