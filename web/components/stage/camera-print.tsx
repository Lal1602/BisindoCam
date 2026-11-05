"use client";

import dynamic from "next/dynamic";
import { useRef, type PointerEvent, type ReactNode, type RefObject } from "react";
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
 */
export function CameraPrint({
  videoRef,
  source,
  aspect,
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
  live: boolean;
  mirrored?: boolean;
  orbit?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const theme = useTheme();
  const still = usePrefersReducedMotion();
  const printRef = useRef<HTMLDivElement>(null);

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
            className={`absolute inset-0 h-full w-full -scale-x-100 object-cover grayscale-[0.7] sepia-[0.25] transition-opacity duration-1000 ${live ? "opacity-45 dark:opacity-30" : "opacity-0"}`}
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
