// Shared hand data model. Coordinates follow MediaPipe's normalised image
// space: x and y in [0, 1] from the top-left of the (unmirrored) frame, z is
// depth relative to the wrist in roughly the same scale as x.

export type Point3 = { x: number; y: number; z: number };

/** 21 landmarks in MediaPipe order (0 = wrist, 4 = thumb tip, 8 = index tip, ...). */
export type HandLandmarks = Point3[];

export type Handedness = "Left" | "Right";

export type TrackedHand = { side: Handedness; landmarks: HandLandmarks; score: number };

export type HandFrame = {
  hands: TrackedHand[];
  timestamp: number;
  /** 33 upper-body pose points (MediaPipe order) when pose tracking is on; null if no person found. */
  pose?: Point3[] | null;
};

export const LANDMARK_COUNT = 21;

/** Bones as landmark index pairs — same topology as HandLandmarker.HAND_CONNECTIONS. */
export const HAND_BONES: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export const FINGERTIPS = [4, 8, 12, 16, 20] as const;
