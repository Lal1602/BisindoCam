// Thin wrapper around MediaPipe's HandLandmarker. Everything is served from
// our own origin (see scripts/copy-runtimes.mjs), so it also works offline.

import type { HandFrame, Handedness } from "./hand";

export type HandTracker = {
  detect(video: HTMLVideoElement, timestamp: number): HandFrame;
  /** Also track the upper body (word signs need hand position relative to it). */
  enablePose(): Promise<void>;
  close(): void;
};

export async function createHandTracker(): Promise<HandTracker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");

  const create = (delegate: "GPU" | "CPU") =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate },
      runningMode: "VIDEO",
      numHands: 2, // BISINDO uses both hands for many signs
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  let landmarker: Awaited<ReturnType<typeof create>>;
  try {
    landmarker = await create("GPU");
  } catch {
    landmarker = await create("CPU");
  }

  type PoseLandmarkerT = Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").PoseLandmarker.createFromOptions>>;
  let pose: PoseLandmarkerT | null = null;
  let posePending: Promise<void> | null = null;

  return {
    detect(video, timestamp) {
      const result = landmarker.detectForVideo(video, timestamp);
      const body = pose?.detectForVideo(video, timestamp).landmarks[0];
      return {
        timestamp,
        pose: pose ? (body ? body.map(({ x, y, z }) => ({ x, y, z })) : null) : undefined,
        hands: result.landmarks.map((landmarks, i) => {
          const category = result.handedness[i]?.[0];
          // MediaPipe labels hands as if the image were mirrored (selfie view).
          // We feed the raw camera frame, so flip the label to get the signer's
          // own left/right.
          const side: Handedness = category?.categoryName === "Left" ? "Right" : "Left";
          return {
            side,
            score: category?.score ?? 0,
            landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
          };
        }),
      };
    },
    enablePose() {
      posePending ??= (async () => {
        const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const createPose = (delegate: "GPU" | "CPU") =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: "/models/pose_landmarker_lite.task", delegate },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        try {
          pose = await createPose("GPU");
        } catch {
          pose = await createPose("CPU");
        }
      })();
      return posePending;
    },
    close: () => {
      landmarker.close();
      pose?.close();
    },
  };
}
