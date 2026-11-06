"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { usePrefersReducedMotion, useTheme } from "@/lib/use-theme";
import type { HandFrame } from "@/lib/vision/hand";

const HandSculpture = dynamic(() => import("@/components/three/hand-sculpture"), { ssr: false });

const CROP_MARKS = [
  "top-3 left-3 border-t border-l",
  "top-3 right-3 border-t border-r",
  "bottom-3 left-3 border-b border-l",
  "bottom-3 right-3 border-b border-r",
];

/**
 * The camera "print": a softly toned, mirrored video with the hand sculpture
 * on top, framed like a photograph on paper. Tilts gently towards the pointer.
 * Overlays (labels, readouts) are passed as children.
 *
 * Bug fixes applied here:
 *  - object-contain (was object-cover): shows the full camera frame without
 *    cropping. Background uses bg-paper-raised so the letterbox matches the
 *    card background — no ugly black bars.
 *  - Adaptive filter: when hands are detected the grayscale/sepia filter fades
 *    away quickly (300ms) so the frame is clear for the signer. When hands
 *    leave the filter returns slowly (800ms) to restore the aesthetic. This is
 *    driven by hasHandsRef (a plain ref, not state) polled at ~15fps so it
 *    never causes extra React renders.
 */
export function CameraPrint({
  videoRef,
  source,
  aspect,
  hasHandsRef,
  live,
  mirrored,
  orbit,
  children,
  className = "",
}: {
  /** Omit for a still print without a camera. */
  videoRef?: RefObject<HTMLVideoElement | null>;
  source: RefObject<(() => HandFrame | null) | null>;
  aspect?: RefObject<number>;
  /**
   * Ref to a boolean that is true when at least one hand (including ghost
   * hands) is visible. When provided, the video filter adapts: clear while
   * tracking, aesthetic when idle.
   */
  hasHandsRef?: RefObject<boolean>;
  live: boolean;
  mirrored?: boolean;
  orbit?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const theme = useTheme();
  const still = usePrefersReducedMotion();
  const printRef = useRef<HTMLDivElement>(null);

  // ── Adaptive filter state ────────────────────────────────────────────────
  // Poll hasHandsRef at ~15fps and derive a boolean React state only when it
  // actually changes — this keeps re-renders minimal.
  const [handsVisible, setHandsVisible] = useState(false);
  useEffect(() => {
    if (!hasHandsRef) return;
    const id = setInterval(() => {
      const next = hasHandsRef.current && live;
      setHandsVisible((prev) => (prev === next ? prev : next));
    }, 66); // ~15fps poll
    return () => clearInterval(id);
  }, [hasHandsRef, live]);

  // Reset when camera goes off
  useEffect(() => {
    if (!live) setHandsVisible(false);
  }, [live]);
  // ────────────────────────────────────────────────────────────────────────

  function tilt(e: PointerEvent<HTMLDivElement>) {
    if (still || !printRef.current) return;
    const r = printRef.current.getBoundingClientRect();
    printRef.current.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 5}deg`);
    printRef.current.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 4}deg`);
  }
  function untilt() {
    printRef.current?.style.setProperty("--ry", "0deg");
    printRef.current?.style.setProperty("--rx", "0deg");
  }

  // Video filter classes:
  //   idle    → aesthetic (grayscale + sepia), opacity-45, slow fade-out 800ms
  //   tracking → near-clear, opacity-80, fast fade-in 300ms
  const videoFilterClass = handsVisible
    ? "grayscale-[0.08] sepia-[0.08] opacity-80 transition-[opacity,filter] duration-300"
    : "grayscale-[0.7] sepia-[0.25] opacity-45 transition-[opacity,filter] duration-700 dark:opacity-30";

  return (
    <div className={`[perspective:1600px] ${className}`} onPointerMove={tilt} onPointerLeave={untilt}>
      <div
        ref={printRef}
        className="relative h-full min-h-[22rem] overflow-hidden rounded-[2px] border hairline bg-paper-raised shadow-[0_30px_60px_-30px_rgb(40_30_20/0.35)] transition-transform duration-700 ease-(--ease-quiet) [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        {videoRef && (
          <video
            ref={videoRef}
            muted
            playsInline
            aria-hidden
            className={`absolute inset-0 h-full w-full -scale-x-100 object-contain bg-paper-raised ${videoFilterClass} ${live ? "" : "opacity-0"}`}
          />
        )}
        <HandSculpture source={source} aspect={aspect} theme={theme} mirrored={mirrored} orbit={orbit} />
        {CROP_MARKS.map((c) => (
          <span key={c} aria-hidden className={`absolute size-4 border-brass ${c}`} />
        ))}
        {children}
      </div>
    </div>
  );
}
