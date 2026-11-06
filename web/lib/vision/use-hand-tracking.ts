"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandFrame } from "./hand";
import { HandGhostBuffer } from "./hand-ghost";
import { createHandTracker, type HandTracker } from "./tracker";

export type CameraStatus = "off" | "starting" | "on" | "denied" | "unavailable" | "error";

/**
 * Owns the camera stream and the detection loop. The latest frame lives in a
 * ref (read it from an animation loop) so 30 fps of landmarks never trigger
 * React re-renders; only status changes do.
 */
export function useHandTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HandFrame | null>(null);
  const fpsRef = useRef(0);
  /** Width / height of the camera frame — features need it to undo MediaPipe's normalisation. */
  const aspectRef = useRef(4 / 3);
  const [status, setStatus] = useState<CameraStatus>("off");

  const trackerRef = useRef<HandTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const wantPoseRef = useRef(false);
  const ghostRef = useRef(new HandGhostBuffer());
  /**
   * True when the current frame (possibly including ghost hands) has at least
   * one hand. Polled by CameraPrint for the adaptive filter — no React state
   * so it never causes a re-render on its own.
   */
  const hasHandsRef = useRef(false);

  const stopLoop = () => {
    const video = videoRef.current;
    if (loopRef.current !== null) {
      if (video && "cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(loopRef.current);
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
  };

  const stop = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    frameRef.current = null;
    ghostRef.current.reset();
    hasHandsRef.current = false;
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");

    try {
      const [stream, tracker] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        }),
        trackerRef.current ?? createHandTracker(),
      ]);
      trackerRef.current = tracker;
      if (wantPoseRef.current) await tracker.enablePose();
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      if (video.videoWidth && video.videoHeight) aspectRef.current = video.videoWidth / video.videoHeight;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setStatus(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "unavailable"
            : "error",
      );
      return;
    }

    let last = performance.now();
    let lastVideoTime = -1;
    const useVfc = "requestVideoFrameCallback" in video;

    const tick = () => {
      const tracker = trackerRef.current;
      if (!tracker || !streamRef.current) return;
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const now = performance.now();
        const raw = tracker.detect(video, now);
        frameRef.current = ghostRef.current.apply(raw);
        hasHandsRef.current = (frameRef.current?.hands.length ?? 0) > 0;
        fpsRef.current = fpsRef.current * 0.9 + (1000 / Math.max(1, now - last)) * 0.1;
        last = now;
      }
      loopRef.current = useVfc ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    tick();
    setStatus("on");
  }, []);

  useEffect(
    () => () => {
      stop();
      trackerRef.current?.close();
      trackerRef.current = null;
    },
    [stop],
  );

  /** Turn on upper-body tracking (needed for word signs). Safe to call before or after start. */
  const enablePose = useCallback(async () => {
    wantPoseRef.current = true;
    await trackerRef.current?.enablePose();
  }, []);

  return { videoRef, frameRef, fpsRef, aspectRef, hasHandsRef, status, start, stop, enablePose };
}
