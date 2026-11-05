"use client";

import { useEffect, useRef } from "react";
import { CameraPrint } from "@/components/stage/camera-print";
import { LiveSubtitle } from "@/components/subtitle/live-subtitle";
import { useLetterReader } from "@/lib/inference/use-letter-reader";
import { useFrameSource } from "@/lib/vision/use-frame-source";
import { useHandTracking } from "@/lib/vision/use-hand-tracking";

export type StageLabels = {
  figure: string;
  demoNote: string;
  liveNote: string;
  startCamera: string;
  stopCamera: string;
  starting: string;
  denied: string;
  unavailable: string;
  error: string;
  subtitleDemo: string;
  subtitleWaiting: string;
  subtitleTracking: string;
  subtitleSpell: string;
  privacy: string;
};

export function cameraProblem(status: string, labels: Pick<StageLabels, "denied" | "unavailable" | "error">) {
  return status === "denied" ? labels.denied : status === "unavailable" ? labels.unavailable : status === "error" ? labels.error : null;
}

export function HeroStage({ labels }: { labels: StageLabels }) {
  const { videoRef, frameRef, fpsRef, aspectRef, status, start, stop } = useHandTracking();
  const live = status === "on";
  const { sourceRef, handCount } = useFrameSource(frameRef, live);
  const reader = useLetterReader({ frameRef, aspectRef, active: live });
  const readoutRef = useRef<HTMLSpanElement>(null);

  // Marginalia readout, written straight to the DOM a few times a second.
  useEffect(() => {
    const id = setInterval(() => {
      const tip = sourceRef.current?.()?.hands[0]?.landmarks[8];
      if (!readoutRef.current) return;
      readoutRef.current.textContent = tip
        ? `x ${tip.x.toFixed(2)}  y ${tip.y.toFixed(2)}  z ${tip.z.toFixed(2)}${live ? `  ·  ${Math.round(fpsRef.current)} fps` : ""}`
        : "x —  y —  z —";
    }, 120);
    return () => clearInterval(id);
  }, [live, fpsRef, sourceRef]);

  const problem = cameraProblem(status, labels);
  const subtitle = !live
    ? labels.subtitleDemo
    : handCount === 0
      ? labels.subtitleWaiting
      : reader.status === "ready"
        ? labels.subtitleSpell
        : labels.subtitleTracking;
  const subtitleSize = "text-[clamp(1.3rem,0.9rem+1vw,1.75rem)]";

  return (
    <figure className="flex h-full min-h-0 flex-col gap-4">
      <CameraPrint videoRef={videoRef} source={sourceRef} aspect={aspectRef} live={live} className="min-h-0 flex-1">
        <div className="label pointer-events-none absolute inset-x-6 top-6 flex justify-between gap-4">
          <span>{labels.figure}</span>
          <span className="text-right">{live ? labels.liveNote : labels.demoNote}</span>
        </div>
        <span ref={readoutRef} aria-hidden className="label pointer-events-none absolute bottom-6 left-6 whitespace-pre tabular-nums" />
      </CameraPrint>

      <figcaption className="grid gap-3">
        {live && reader.status === "ready" ? (
          <LiveSubtitle
            text={reader.text}
            candidate={reader.candidate}
            progress={reader.progress}
            placeholder={subtitle}
            className={subtitleSize}
          />
        ) : (
          <p aria-live="polite" className={`font-display min-h-[1.2em] ${subtitleSize} leading-tight italic text-balance`}>
            {subtitle}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={live ? stop : start}
            disabled={status === "starting"}
            className="rounded-full border border-ink px-5 py-2.5 text-[0.95rem] transition-colors duration-500 hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {status === "starting" ? labels.starting : live ? labels.stopCamera : labels.startCamera}
          </button>
          <span className="label">{labels.privacy}</span>
        </div>
        {problem && (
          <p role="alert" className="text-clay">
            {problem}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
