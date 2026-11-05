// Reference signs for the dictionary (web/public/signs/*.json, written by
// ml/scripts/export_signs.py). Letters are a single pose; words are a short
// landmark sequence played back in a loop.

import type { HandFrame, Handedness, HandLandmarks } from "./hand";

type RawHand = [number, number, number][] | null;
type RawLetter = { aspect: number; hands: RawHand[] };
type RawWord = { aspect: number; fps: number; en: string; frames: RawHand[][] };
type SignFile<T> = { version: number; slots: Handedness[]; signs: Record<string, T> };

export type Sign = {
  id: string;
  /** English gloss (words only). */
  en?: string;
  /** Still frame (letters) or the middle frame (words). */
  frame: HandFrame;
  /** Full sequence for words. */
  frames?: HandFrame[];
  fps?: number;
};

type Hand = { side: Handedness; landmarks: HandLandmarks };

const cache = new Map<string, Promise<Sign[]>>();

function toHands(raw: RawHand[], slots: Handedness[]): Hand[] {
  return raw.flatMap((r, i) => (r ? [{ side: slots[i], landmarks: r.map(([x, y, z]) => ({ x, y, z })) }] : []));
}

/**
 * Re-centre and scale so every sign fills the stage the same way, with one
 * transform for a whole sequence. Still poses fit their bounding box; moving
 * signs are scaled by palm size (their arm travel would otherwise shrink the
 * hands to dots) and centred on the average wrist position.
 */
function fit(sequence: Hand[][], aspect: number): HandFrame[] {
  const hands = sequence.flat();
  let scale: number;
  let cx: number;
  let cy: number;
  if (sequence.length > 1) {
    const palms = hands.map((h) => Math.hypot((h.landmarks[9].x - h.landmarks[0].x) * aspect, h.landmarks[9].y - h.landmarks[0].y));
    const palm = palms.sort((a, b) => a - b)[Math.floor(palms.length / 2)] || 1e-6;
    // Frame the middle half of the clip — the sign itself; the hands rest
    // low at the start and end and may dip below the stage there.
    const active = sequence.slice(Math.floor(sequence.length / 4), Math.ceil((sequence.length * 3) / 4)).flat();
    const pts = (active.length ? active : hands).flatMap((h) => h.landmarks);
    const xs = pts.map((p) => p.x * aspect);
    const ys = pts.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Hands as large as possible while the full movement stays on the stage.
    scale = Math.min(0.11 / palm, 0.85 / Math.max(maxX - minX, (maxY - minY) * (4 / 3), 1e-6));
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
  } else {
    const pts = hands.flatMap((h) => h.landmarks);
    const xs = pts.map((p) => p.x * aspect);
    const ys = pts.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    scale = 0.42 / Math.max(maxX - minX, (maxY - minY) * (4 / 3), 1e-6);
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
  }
  return sequence.map((hands, i) => ({
    timestamp: i,
    hands: hands.map((h) => ({
      side: h.side,
      score: 1,
      // Output in a 4:3 frame (the sculpture's default) centred near the middle.
      landmarks: h.landmarks.map((p) => ({
        x: 0.5 + ((p.x * aspect - cx) * scale) / (4 / 3),
        y: 0.46 + (p.y - cy) * scale,
        z: (p.z * aspect * scale) / (4 / 3),
      })),
    })),
  }));
}

export function loadSigns(kind: "letters" | "words"): Promise<Sign[]> {
  if (!cache.has(kind)) {
    const load = fetch(`/signs/${kind}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((file: SignFile<RawLetter | RawWord> | null): Sign[] => {
        if (!file) return [];
        return Object.entries(file.signs).map(([id, s]) => {
          if ("frames" in s) {
            const frames = fit(
              s.frames.map((f) => toHands(f, file.slots)),
              s.aspect,
            );
            return { id, en: s.en, frames, fps: s.fps, frame: frames[Math.floor(frames.length / 2)] };
          }
          return { id, frame: fit([toHands(s.hands, file.slots)], s.aspect)[0] };
        });
      });
    cache.set(kind, load);
  }
  return cache.get(kind)!;
}

/** The frame of a sign to show at `time` seconds (words loop with a short rest). */
export function signFrameAt(sign: Sign, time: number): HandFrame {
  if (!sign.frames || !sign.fps) return sign.frame;
  const rest = 0.6;
  const length = sign.frames.length / sign.fps + rest;
  const t = time % length;
  const i = Math.min(sign.frames.length - 1, Math.floor(t * sign.fps));
  return sign.frames[i];
}
