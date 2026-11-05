"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FEATURE_VERSION, frameFeatures } from "@/lib/vision/features";
import type { HandFrame } from "@/lib/vision/hand";
import { loadClassifier, ModelMissingError, type Classifier } from "./classifier";
import { Stabilizer, type StabilizerState } from "./stabilizer";

// "idle" until the model has loaded (or failed to).
export type ReaderStatus = "idle" | "ready" | "missing" | "error";

type Options = {
  frameRef: RefObject<HandFrame | null>;
  aspectRef: RefObject<number>;
  /** Run only while the camera is live. */
  active: boolean;
};

/**
 * Reads fingerspelled letters from the live hand stream and builds up a
 * transcript. Per-frame work stays in refs; React state changes at most a
 * dozen times a second for the subtitle.
 */
export function useLetterReader({ frameRef, aspectRef, active }: Options) {
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [text, setText] = useState("");
  const [live, setLive] = useState<Pick<StabilizerState, "candidate" | "confidence" | "progress">>({
    candidate: null,
    confidence: 0,
    progress: 0,
  });
  const classifierRef = useRef<Promise<Classifier | null> | null>(null);
  /** Latest smoothed probability per label, for callers that score a target (Learn). */
  const scoresRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let raf = 0;
    let busy = false;
    let lastTimestamp = -1;
    let lastPush = 0;

    classifierRef.current ??= loadClassifier("letters", FEATURE_VERSION).catch((err: unknown) => {
      setStatus(err instanceof ModelMissingError ? "missing" : "error");
      return null;
    });

    classifierRef.current.then((classifier) => {
      if (!classifier || cancelled) return;
      setStatus("ready");
      const stabilizer = new Stabilizer(classifier.meta.labels);

      const tick = async () => {
        raf = requestAnimationFrame(tick);
        const frame = frameRef.current;
        if (busy || !frame || frame.timestamp === lastTimestamp) return;
        lastTimestamp = frame.timestamp;
        busy = true;
        try {
          const now = performance.now();
          const probs = frame.hands.length ? await classifier.predict(frameFeatures(frame, aspectRef.current)) : null;
          if (cancelled) return;
          const state = stabilizer.update(probs, now);
          const smoothed = stabilizer.smoothed;
          scoresRef.current = new Map(classifier.meta.labels.map((l, i) => [l, smoothed ? smoothed[i] : 0]));
          if (state.committed) setText((t) => t + state.committed);
          if (state.committed || now - lastPush > 80) {
            lastPush = now;
            setLive({ candidate: state.candidate, confidence: state.confidence, progress: state.progress });
          }
        } finally {
          busy = false;
        }
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [active, frameRef, aspectRef]);

  const space = useCallback(() => setText((t) => (t && !t.endsWith(" ") ? t + " " : t)), []);
  const backspace = useCallback(() => setText((t) => t.slice(0, -1)), []);
  const clear = useCallback(() => setText(""), []);

  return { status, text, ...live, scoresRef, space, backspace, clear };
}
