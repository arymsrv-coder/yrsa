"use client";

import { motion, useMotionTemplate, type MotionValue } from "framer-motion";
import { APERTURE_STYLE } from "../lib/motion";

/**
 * Builds the four-gradient mask from two live motion values, so the aperture
 * can be driven by a clock (loading screen) or by scroll position (sections)
 * without React re-rendering on every frame.
 *
 * Both values run 50 → 0: 50 covers completely, 0 is fully retracted.
 * `sy` moves the top and bottom bands, `sx` the left and right.
 */
export function useApertureMask(sx: MotionValue<number>, sy: MotionValue<number>) {
  return useMotionTemplate`linear-gradient(to bottom, #000 ${sy}%, transparent ${sy}%), linear-gradient(to top, #000 ${sy}%, transparent ${sy}%), linear-gradient(to left, #000 ${sx}%, transparent ${sx}%), linear-gradient(to right, #000 ${sx}%, transparent ${sx}%)`;
}

/**
 * A panel that is uncovered from the centre outward. Children ride inside the
 * mask, so anything drawn on the panel is consumed by the same opening instead
 * of needing an exit of its own.
 */
export default function Aperture({
  sx,
  sy,
  className = "",
  style,
  children,
}: {
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const maskImage = useApertureMask(sx, sy);

  return (
    <motion.div
      className={className}
      style={{
        ...APERTURE_STYLE,
        maskImage,
        WebkitMaskImage: maskImage,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
