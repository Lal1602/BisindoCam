"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { HandFrame } from "@/lib/vision/hand";
import { WORD_FEATURE_VERSION, clipFeatures, type BodyFrame } from "@/lib/vision/word-features";
import { loadClassifier, ModelMissingError, type Classifier } from "./classifier";
import type { ReaderStatus } from "./use-letter-reader";

type Options = {
  frameRef: RefObject<HandFrame | null>;
  aspectRef: RefObject<number>;
  active: boolean;
  /** Show English glosses instead of Indonesian ones. */
  english?: boolean;
};

const END_GAP_MS = 400; // hands gone this long = the sign has ended
const MAX_SIGN_MS = 3000; // classify long runs anyway
const MIN_SIGN_MS = 350;
const PREVIEW_MS = 300;
const COMMIT_AT = 0.45;

/**
 * Reads word signs. A sign is the stretch of frames from when a hand appears
 * until hands drop for END_GAP_MS — the same trimming the training clips get.
 * While signing, a faint preview guess updates a few times a second.
 */
export function useWordReader({ frameRef, aspectRef, active, english = false }: Options) {
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [text, setText] = useState("");
  const [candidate, setCandidate] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const classifierRef = useRef<Promise<Classifier | null> | null>(null);
  const englishRef = useRef(english);
  useEffect(() => {
    englishRef.current = english;
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let raf = 0;
    let segment: BodyFrame[] = [];
    let lastHandAt = 0;
    let lastPreview = 0;
    let lastTimestamp = -1;
    let busy = false;

    classifierRef.current ??= loadClassifier("words", WORD_FEATURE_VERSION).catch((err: unknown) => {
      setStatus(err instanceof ModelMissingError ? "missing" : "error");
      return null;
    });

    classifierRef.current.then((classifier) => {
      if (!classifier || cancelled) return;
      setStatus("ready");
      const label = (i: number) => (englishRef.current && classifier.meta.english ? classifier.meta.english[i] : classifier.meta.labels[i]);

      const classify = async (frames: BodyFrame[]) => {
        const features = clipFeatures(frames, aspectRef.current);
        if (!features) return null;
        const probs = await classifier.predict(features);
        let best = 0;
        for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
        return { word: label(best), p: probs[best] };
      };

      const tick = async () => {
        raf = requestAnimationFrame(tick);
        const frame = frameRef.current;
        if (busy || !frame || frame.timestamp === lastTimestamp) return;
        lastTimestamp = frame.timestamp;
        const now = frame.timestamp;
        const hasHand = frame.hands.length > 0;
        if (hasHand) lastHandAt = now;
        if (hasHand || segment.length) segment.push({ ...frame, pose: frame.pose ?? null });

        const span = segment.length ? now - segment[0].timestamp : 0;
        const ended = segment.length > 0 && (now - lastHandAt > END_GAP_MS || span > MAX_SIGN_MS);
        busy = true;
        try {
          if (ended) {
            const frames = segment;
            segment = [];
            if (span >= MIN_SIGN_MS) {
              const r = await classify(frames);
              if (cancelled) return;
              if (r && r.p >= COMMIT_AT) setText((t) => (t ? `${t} ${r.word}` : r.word));
            }
            setCandidate(null);
            setConfidence(0);
          } else if (segment.length && now - lastPreview > PREVIEW_MS && span >= MIN_SIGN_MS) {
            lastPreview = now;
            const r = await classify(segment);
            if (cancelled || !r) return;
            setCandidate(r.word);
            setConfidence(r.p);
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

  const backspace = useCallback(() => setText((t) => t.split(" ").slice(0, -1).join(" ")), []);
  const clear = useCallback(() => setText(""), []);

  return { status, text, candidate, confidence, backspace, clear };
}
