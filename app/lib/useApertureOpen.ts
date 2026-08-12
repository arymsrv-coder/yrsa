"use client";

import { useEffect, useRef } from "react";
import { useMotionValue } from "framer-motion";
import {
  APERTURE_S,
  APERTURE_SHUT,
  APERTURE_STEPS,
  prefersReducedMotion,
  sampleSteps,
} from "./motion";

/**
 * Plays the three-step aperture on a clock and hands back the two mask values.
 *
 * Driven straight onto motion values rather than React state, so the mask
 * string is rebuilt per frame without re-rendering the tree. Reduced motion
 * jumps to fully open on the first frame.
 */
export function useApertureOpen({
  run,
  seconds = APERTURE_S,
  onEnd,
}: {
  run: boolean;
  seconds?: number;
  onEnd?: () => void;
}) {
  const sx = useMotionValue(APERTURE_SHUT);
  const sy = useMotionValue(APERTURE_SHUT);

  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!run) return;

    if (prefersReducedMotion()) {
      sx.set(0);
      sy.set(0);
      endRef.current?.();
      return;
    }

    const ms = seconds * 1000;
    const start = performance.now();
    let raf = 0;
    // Scalar stand-in for EASE, applied across the whole run so the clock-driven
    // opening and the scroll-scrubbed one land on the same shape.
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const p = ease(t);
      sx.set(sampleSteps(p, APERTURE_STEPS.x));
      sy.set(sampleSteps(p, APERTURE_STEPS.y));
      if (t < 1) raf = requestAnimationFrame(tick);
      else endRef.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, seconds, sx, sy]);

  return { sx, sy };
}
