"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// The Web Speech API is not in TypeScript's DOM lib yet; describe what we use.
type Alternative = { transcript: string };
type Result = { isFinal: boolean; 0: Alternative };
type ResultEvent = { resultIndex: number; results: ArrayLike<Result> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: ResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ListenStatus = "idle" | "listening" | "denied" | "error";

/**
 * Continuous speech-to-text. `onFinal` receives each finished phrase; the
 * phrase still being spoken is exposed as `interim`. Recognition restarts by
 * itself while listening, because browsers end sessions after a pause.
 */
export function useSpeechRecognition(lang: string, onFinal: (text: string) => void) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => getCtor() !== null,
    () => false,
  );
  const [status, setStatus] = useState<ListenStatus>("idle");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const stop = useCallback(() => {
    wantRef.current = false;
    recognitionRef.current?.stop();
    setInterim("");
    setStatus((s) => (s === "listening" ? "idle" : s));
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recognitionRef.current?.stop();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (r.isFinal) {
          if (text) onFinalRef.current(text);
        } else pending += `${text} `;
      }
      setInterim(pending.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setStatus("denied");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setStatus("error");
      }
    };
    rec.onend = () => {
      if (wantRef.current) rec.start();
    };
    recognitionRef.current = rec;
    wantRef.current = true;
    setStatus("listening");
    rec.start();
  }, [lang]);

  useEffect(() => () => stop(), [stop]);

  return { supported, status, interim, start, stop };
}
