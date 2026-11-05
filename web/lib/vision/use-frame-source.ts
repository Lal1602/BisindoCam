"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/lib/use-theme";
import { demoFrame } from "./demo-hand";
import type { HandFrame } from "./hand";

/**
 * A pull-based frame source for the sculpture: the camera when live, the demo
 * hand otherwise. Also reports how many hands are visible (as React state,
 * only when it changes) for captions.
 */
export function useFrameSource(frameRef: RefObject<HandFrame | null>, live: boolean) {
  const still = usePrefersReducedMotion();
  const sourceRef = useRef<(() => HandFrame | null) | null>(null);
  const [handCount, setHandCount] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    sourceRef.current = live ? () => frameRef.current : () => demoFrame((performance.now() - t0) / 1000, still);
  }, [live, still, frameRef]);

  useEffect(() => {
    let count = -1;
    const id = setInterval(() => {
      const next = sourceRef.current?.()?.hands.length ?? 0;
      if (next !== count) setHandCount((count = next));
    }, 150);
    return () => clearInterval(id);
  }, []);

  return { sourceRef, handCount };
}
